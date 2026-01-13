/**
 * Système de logging sécurisé pour ZeroGaspy
 * - Désactive les logs en production
 * - Masque les données sensibles
 * - Limite la taille des logs
 */

// Détecte si on est en mode développement
const isDev = __DEV__;

// Patterns de données sensibles à masquer
const SENSITIVE_PATTERNS = [
  /email["\s:=]+["']?[\w.-]+@[\w.-]+/gi,
  /password["\s:=]+["']?[^"'\s,}]+/gi,
  /token["\s:=]+["']?[^"'\s,}]+/gi,
  /api_?key["\s:=]+["']?[^"'\s,}]+/gi,
  /secret["\s:=]+["']?[^"'\s,}]+/gi,
];

// Masque les données sensibles dans un message
function sanitizeMessage(message: string): string {
  let sanitized = message;
  SENSITIVE_PATTERNS.forEach((pattern) => {
    sanitized = sanitized.replace(pattern, '[DONNÉES MASQUÉES]');
  });
  return sanitized;
}

// Limite la taille d'un message
function truncateMessage(message: string, maxLength: number = 500): string {
  if (message.length <= maxLength) return message;
  return message.substring(0, maxLength) + '... [TRONQUÉ]';
}

// Formate les arguments pour le logging
function formatArgs(args: any[]): string[] {
  return args.map((arg) => {
    if (typeof arg === 'string') {
      return truncateMessage(sanitizeMessage(arg));
    }
    if (typeof arg === 'object') {
      try {
        const str = JSON.stringify(arg, null, 2);
        return truncateMessage(sanitizeMessage(str));
      } catch {
        return '[Objet non sérialisable]';
      }
    }
    return String(arg);
  });
}

/**
 * Logger sécurisé - n'affiche les logs qu'en développement
 */
export const logger = {
  /**
   * Log d'information (développement uniquement)
   */
  info: (...args: any[]) => {
    if (isDev) {
      console.log('[INFO]', ...formatArgs(args));
    }
  },

  /**
   * Log de warning (développement uniquement)
   */
  warn: (...args: any[]) => {
    if (isDev) {
      console.warn('[WARN]', ...formatArgs(args));
    }
  },

  /**
   * Log d'erreur (toujours affiché, mais sanitizé en production)
   */
  error: (...args: any[]) => {
    if (isDev) {
      console.error('[ERROR]', ...formatArgs(args));
    } else {
      // En production, on log les erreurs mais sans détails sensibles
      console.error('[ERROR]', ...formatArgs(args).map(() => 'Erreur - voir les logs serveur'));
    }
  },

  /**
   * Log de debug (développement uniquement)
   */
  debug: (...args: any[]) => {
    if (isDev) {
      console.log('[DEBUG]', ...formatArgs(args));
    }
  },
};

export default logger;
