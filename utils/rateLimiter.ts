/**
 * Rate Limiter - Protection contre les appels API excessifs
 * Implémente un système de limitation basé sur des fenêtres temporelles
 */

interface RateLimitConfig {
  maxRequests: number;    // Nombre max de requêtes
  windowMs: number;       // Fenêtre de temps en millisecondes
}

interface RateLimitState {
  requests: number[];     // Timestamps des requêtes
}

const rateLimitStates: Map<string, RateLimitState> = new Map();

// Configurations par défaut pour différents services
export const RATE_LIMITS: Record<string, RateLimitConfig> = {
  // Google Vision API - max 5 requêtes par minute
  'google-vision': {
    maxRequests: 5,
    windowMs: 60 * 1000,
  },
  // OpenFoodFacts - max 10 requêtes par minute
  'openfoodfacts': {
    maxRequests: 10,
    windowMs: 60 * 1000,
  },
  // Feedback API - max 3 requêtes par minute
  'feedback': {
    maxRequests: 3,
    windowMs: 60 * 1000,
  },
  // Supabase sync - max 30 requêtes par minute
  'supabase-sync': {
    maxRequests: 30,
    windowMs: 60 * 1000,
  },
  // Default - max 20 requêtes par minute
  'default': {
    maxRequests: 20,
    windowMs: 60 * 1000,
  },
};

/**
 * Vérifie si une requête peut être effectuée selon le rate limit
 * @param key - Identifiant du service (ex: 'google-vision')
 * @returns true si la requête est autorisée, false sinon
 */
export function canMakeRequest(key: string): boolean {
  const config = RATE_LIMITS[key] || RATE_LIMITS.default;
  const now = Date.now();

  let state = rateLimitStates.get(key);
  if (!state) {
    state = { requests: [] };
    rateLimitStates.set(key, state);
  }

  // Nettoyer les anciennes requêtes hors de la fenêtre
  state.requests = state.requests.filter(
    timestamp => now - timestamp < config.windowMs
  );

  // Vérifier si on peut faire une nouvelle requête
  return state.requests.length < config.maxRequests;
}

/**
 * Enregistre une requête effectuée
 * @param key - Identifiant du service
 */
export function recordRequest(key: string): void {
  let state = rateLimitStates.get(key);
  if (!state) {
    state = { requests: [] };
    rateLimitStates.set(key, state);
  }

  state.requests.push(Date.now());
}

/**
 * Wrapper pour effectuer une requête avec rate limiting
 * @param key - Identifiant du service
 * @param requestFn - Fonction à exécuter
 * @returns Résultat de la fonction ou erreur si rate limited
 */
export async function withRateLimit<T>(
  key: string,
  requestFn: () => Promise<T>
): Promise<T> {
  if (!canMakeRequest(key)) {
    const config = RATE_LIMITS[key] || RATE_LIMITS.default;
    throw new RateLimitError(
      `Trop de requêtes. Veuillez attendre ${Math.ceil(config.windowMs / 1000)} secondes.`,
      key
    );
  }

  recordRequest(key);
  return requestFn();
}

/**
 * Retourne le temps restant avant de pouvoir faire une nouvelle requête
 * @param key - Identifiant du service
 * @returns Temps en millisecondes, 0 si requête possible immédiatement
 */
export function getTimeUntilNextRequest(key: string): number {
  const config = RATE_LIMITS[key] || RATE_LIMITS.default;
  const state = rateLimitStates.get(key);

  if (!state || state.requests.length < config.maxRequests) {
    return 0;
  }

  const now = Date.now();
  const oldestRequest = Math.min(...state.requests);
  const timeUntilExpiry = (oldestRequest + config.windowMs) - now;

  return Math.max(0, timeUntilExpiry);
}

/**
 * Réinitialise le rate limit pour un service
 * @param key - Identifiant du service
 */
export function resetRateLimit(key: string): void {
  rateLimitStates.delete(key);
}

/**
 * Erreur personnalisée pour le rate limiting
 */
export class RateLimitError extends Error {
  public readonly service: string;
  public readonly retryAfter: number;

  constructor(message: string, service: string) {
    super(message);
    this.name = 'RateLimitError';
    this.service = service;
    this.retryAfter = getTimeUntilNextRequest(service);
  }
}
