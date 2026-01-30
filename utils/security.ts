/**
 * Service de securite centralise pour ZeroGaspy
 * Protection des donnees utilisateurs et prevention des attaques
 */

// ============================================
// CONFIGURATION DE SECURITE
// ============================================

export const SECURITY_CONFIG = {
  PASSWORD_MIN_LENGTH: 8,
  PASSWORD_MAX_LENGTH: 128,
  NAME_MAX_LENGTH: 100,
  EMAIL_MAX_LENGTH: 254,
  FOOD_NAME_MAX_LENGTH: 100,
  LIST_NAME_MAX_LENGTH: 50,
  MAX_LISTS_FREE: 3,
  MAX_ITEMS_PER_LIST: 500,
  RATE_LIMIT_LOGIN: { attempts: 5, windowMs: 60000 },
  RATE_LIMIT_SIGNUP: { attempts: 3, windowMs: 300000 },
  RATE_LIMIT_PASSWORD_RESET: { attempts: 3, windowMs: 300000 },
  RATE_LIMIT_API: { attempts: 100, windowMs: 60000 },
  SESSION_TIMEOUT_MS: 30 * 24 * 60 * 60 * 1000, // 30 jours
} as const;

// ============================================
// ECHAPPEMENT HTML
// ============================================

/**
 * Echappe les caracteres HTML dangereux
 */
export function escapeHtml(text: string): string {
  if (!text || typeof text !== 'string') return '';
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
    '/': '&#x2F;',
    '`': '&#x60;',
    '=': '&#x3D;',
  };
  return text.replace(/[&<>"'`=/]/g, (m) => map[m] || m);
}

// ============================================
// SANITIZATION DES DONNEES
// ============================================

/**
 * Nettoie une chaine de caracteres
 */
export function sanitizeString(input: string, maxLength: number = 500): string {
  if (!input || typeof input !== 'string') return '';

  return input
    .trim()
    // Supprime les caracteres de controle (sauf retour a la ligne)
    .replace(/[\x00-\x09\x0B\x0C\x0E-\x1F\x7F]/g, '')
    // Limite la longueur
    .substring(0, maxLength);
}

/**
 * Nettoie un email
 */
export function sanitizeEmail(email: string): string {
  if (!email || typeof email !== 'string') return '';
  return email.trim().toLowerCase().slice(0, SECURITY_CONFIG.EMAIL_MAX_LENGTH);
}

/**
 * Nettoie un nom d'aliment ou de liste
 */
export function sanitizeFoodName(name: string): string {
  if (!name || typeof name !== 'string') return '';
  return sanitizeString(name, SECURITY_CONFIG.FOOD_NAME_MAX_LENGTH);
}

/**
 * Nettoie un objet en profondeur
 */
export function sanitizeObject<T extends Record<string, any>>(obj: T): T {
  if (!obj || typeof obj !== 'object') return obj;

  const sanitized = {} as T;

  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      const value = obj[key];

      if (typeof value === 'string') {
        sanitized[key] = sanitizeString(value) as any;
      } else if (value === null || value === undefined) {
        sanitized[key] = value;
      } else if (typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
        sanitized[key] = sanitizeObject(value);
      } else if (Array.isArray(value)) {
        sanitized[key] = value.map(item =>
          typeof item === 'string' ? sanitizeString(item) :
          typeof item === 'object' && item !== null ? sanitizeObject(item) : item
        ) as any;
      } else {
        sanitized[key] = value;
      }
    }
  }

  return sanitized;
}

// ============================================
// VALIDATION DES ENTREES
// ============================================

/**
 * Valide un email (RFC 5322 simplifie)
 */
export function validateEmail(email: string): { valid: boolean; error?: string } {
  const sanitized = sanitizeEmail(email);

  if (!sanitized) {
    return { valid: false, error: 'L\'email est requis' };
  }

  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*\.[a-zA-Z]{2,}$/;

  if (!emailRegex.test(sanitized)) {
    return { valid: false, error: 'Format d\'email invalide' };
  }

  const [localPart, domain] = sanitized.split('@');

  if (localPart.startsWith('.') || localPart.endsWith('.') || localPart.includes('..')) {
    return { valid: false, error: 'Format d\'email invalide' };
  }

  if (localPart.length > 64 || domain.length > 253) {
    return { valid: false, error: 'Email trop long' };
  }

  return { valid: true };
}

/**
 * Alias pour compatibilite
 */
export function isValidEmail(email: string): boolean {
  return validateEmail(email).valid;
}

/**
 * Valide un mot de passe selon les criteres de securite renforces
 */
export function validatePassword(password: string): {
  isValid: boolean;
  errors: string[];
  strength: 'weak' | 'medium' | 'strong';
  score: number;
} {
  const errors: string[] = [];
  let score = 0;

  if (!password || typeof password !== 'string') {
    return { isValid: false, errors: ['Mot de passe requis'], strength: 'weak', score: 0 };
  }

  // Longueur minimum
  if (password.length < SECURITY_CONFIG.PASSWORD_MIN_LENGTH) {
    errors.push(`Au moins ${SECURITY_CONFIG.PASSWORD_MIN_LENGTH} caracteres requis`);
  } else {
    score += 1;
    if (password.length >= 12) score += 1;
    if (password.length >= 16) score += 1;
  }

  // Longueur maximum
  if (password.length > SECURITY_CONFIG.PASSWORD_MAX_LENGTH) {
    errors.push('Mot de passe trop long');
  }

  // Majuscule
  if (!/[A-Z]/.test(password)) {
    errors.push('Au moins une majuscule requise');
  } else {
    score += 1;
  }

  // Minuscule
  if (!/[a-z]/.test(password)) {
    errors.push('Au moins une minuscule requise');
  } else {
    score += 1;
  }

  // Chiffre
  if (!/[0-9]/.test(password)) {
    errors.push('Au moins un chiffre requis');
  } else {
    score += 1;
  }

  // Caractere special
  if (/[!@#$%^&*(),.?":{}|<>_\-+=\[\]\\;'`~]/.test(password)) {
    score += 2;
  }

  // Detection de patterns faibles
  const weakPatterns = [
    /^123456/,
    /^password/i,
    /^azerty/i,
    /^qwerty/i,
    /^abc123/i,
    /^admin/i,
    /^letmein/i,
    /^welcome/i,
    /^monkey/i,
    /^dragon/i,
    /^master/i,
    /(.)\1{3,}/, // Repetition de caracteres (aaaa)
    /^[a-z]+$/i, // Seulement des lettres
    /^[0-9]+$/, // Seulement des chiffres
    /0123|1234|2345|3456|4567|5678|6789/, // Sequences numeriques
    /abcd|bcde|cdef|defg|efgh|fghi/i, // Sequences alphabetiques
  ];

  for (const pattern of weakPatterns) {
    if (pattern.test(password)) {
      errors.push('Mot de passe trop previsible');
      score = Math.max(0, score - 3);
      break;
    }
  }

  // Verification que le mot de passe n'est pas une donnee personnelle commune
  const commonData = ['zerogaspy', 'gaspy', 'food', 'aliment'];
  for (const data of commonData) {
    if (password.toLowerCase().includes(data)) {
      score = Math.max(0, score - 1);
      break;
    }
  }

  const strength: 'weak' | 'medium' | 'strong' =
    score >= 7 ? 'strong' : score >= 4 ? 'medium' : 'weak';

  return {
    isValid: errors.length === 0,
    errors,
    strength,
    score,
  };
}

/**
 * Valide un nom (empeche les injections)
 */
export function isValidName(name: string): boolean {
  if (!name || typeof name !== 'string') return false;
  const sanitized = sanitizeString(name, SECURITY_CONFIG.NAME_MAX_LENGTH);
  // Autorise lettres (unicode), espaces, tirets, apostrophes
  const nameRegex = /^[\p{L}\s'\-]{1,100}$/u;
  return nameRegex.test(sanitized) && sanitized.length >= 1;
}

/**
 * Valide un nom d'aliment
 */
export function validateFoodName(name: string): { valid: boolean; error?: string } {
  const sanitized = sanitizeFoodName(name);

  if (!sanitized) {
    return { valid: false, error: 'Le nom est requis' };
  }

  if (!/[a-zA-Z0-9\u00C0-\u024F]/.test(sanitized)) {
    return { valid: false, error: 'Le nom doit contenir des lettres ou chiffres' };
  }

  if (detectInjection(sanitized)) {
    return { valid: false, error: 'Caracteres non autorises detectes' };
  }

  return { valid: true };
}

/**
 * Valide un titre de liste
 */
export function validateListTitle(title: string): { valid: boolean; error?: string } {
  const sanitized = sanitizeString(title, SECURITY_CONFIG.LIST_NAME_MAX_LENGTH);

  if (!sanitized) {
    return { valid: false, error: 'Le titre est requis' };
  }

  if (detectInjection(sanitized)) {
    return { valid: false, error: 'Caracteres non autorises' };
  }

  return { valid: true };
}

/**
 * Valide une date au format JJ/MM/AAAA
 */
export function validateDate(dateStr: string): { valid: boolean; error?: string; date?: Date } {
  if (!dateStr) {
    return { valid: true };
  }

  const sanitized = sanitizeString(dateStr, 10);
  const dateRegex = /^(\d{2})\/(\d{2})\/(\d{4})$/;
  const match = sanitized.match(dateRegex);

  if (!match) {
    return { valid: false, error: 'Format de date invalide (JJ/MM/AAAA)' };
  }

  const [, day, month, year] = match.map(Number);
  const date = new Date(year, month - 1, day);

  if (
    date.getDate() !== day ||
    date.getMonth() !== month - 1 ||
    date.getFullYear() !== year
  ) {
    return { valid: false, error: 'Date invalide' };
  }

  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
  if (date < oneYearAgo) {
    return { valid: false, error: 'Date trop ancienne' };
  }

  const tenYearsLater = new Date();
  tenYearsLater.setFullYear(tenYearsLater.getFullYear() + 10);
  if (date > tenYearsLater) {
    return { valid: false, error: 'Date trop eloignee' };
  }

  return { valid: true, date };
}

/**
 * Valide une quantite
 */
export function validateQuantity(quantity: string | number): { valid: boolean; error?: string; value?: number } {
  if (quantity === '' || quantity === undefined || quantity === null) {
    return { valid: true };
  }

  const num = typeof quantity === 'number' ? quantity : parseInt(String(quantity), 10);

  if (isNaN(num)) {
    return { valid: false, error: 'La quantite doit etre un nombre' };
  }

  if (num < 1) {
    return { valid: false, error: 'La quantite doit etre au moins 1' };
  }

  if (num > 9999) {
    return { valid: false, error: 'La quantite est trop grande' };
  }

  return { valid: true, value: num };
}

/**
 * Valide un code-barres
 */
export function validateBarcode(barcode: string): { valid: boolean; error?: string } {
  const sanitized = sanitizeString(barcode, 50);

  if (!sanitized) {
    return { valid: false, error: 'Code-barres vide' };
  }

  if (!/^\d+$/.test(sanitized)) {
    return { valid: false, error: 'Code-barres invalide' };
  }

  const validLengths = [8, 12, 13, 14];
  if (!validLengths.includes(sanitized.length)) {
    return { valid: false, error: 'Longueur de code-barres invalide' };
  }

  return { valid: true };
}

/**
 * Valide un prix
 */
export function isValidPrice(price: number): boolean {
  return typeof price === 'number' &&
         !isNaN(price) &&
         isFinite(price) &&
         price >= 0 &&
         price <= 100000;
}

// ============================================
// RATE LIMITING COTE CLIENT
// ============================================

interface RateLimitEntry {
  count: number;
  firstRequest: number;
  blocked: boolean;
}

const rateLimitStore: Map<string, RateLimitEntry> = new Map();

/**
 * Verifie si une action est autorisee (rate limiting)
 */
export function checkRateLimit(
  action: string,
  maxAttempts: number = 5,
  windowMs: number = 60000
): { allowed: boolean; remainingAttempts: number; resetIn: number; blocked: boolean } {
  const now = Date.now();
  const entry = rateLimitStore.get(action);

  if (!entry || now - entry.firstRequest > windowMs) {
    rateLimitStore.set(action, { count: 1, firstRequest: now, blocked: false });
    return { allowed: true, remainingAttempts: maxAttempts - 1, resetIn: windowMs, blocked: false };
  }

  if (entry.count >= maxAttempts) {
    const resetIn = windowMs - (now - entry.firstRequest);
    entry.blocked = true;
    rateLimitStore.set(action, entry);
    return { allowed: false, remainingAttempts: 0, resetIn, blocked: true };
  }

  entry.count += 1;
  rateLimitStore.set(action, entry);

  return {
    allowed: true,
    remainingAttempts: maxAttempts - entry.count,
    resetIn: windowMs - (now - entry.firstRequest),
    blocked: false,
  };
}

/**
 * Reset le rate limit pour une action
 */
export function resetRateLimit(action: string): void {
  rateLimitStore.delete(action);
}

/**
 * Verifie le rate limit pour la connexion
 */
export function checkLoginRateLimit(): ReturnType<typeof checkRateLimit> {
  return checkRateLimit(
    'login',
    SECURITY_CONFIG.RATE_LIMIT_LOGIN.attempts,
    SECURITY_CONFIG.RATE_LIMIT_LOGIN.windowMs
  );
}

/**
 * Verifie le rate limit pour l'inscription
 */
export function checkSignupRateLimit(): ReturnType<typeof checkRateLimit> {
  return checkRateLimit(
    'signup',
    SECURITY_CONFIG.RATE_LIMIT_SIGNUP.attempts,
    SECURITY_CONFIG.RATE_LIMIT_SIGNUP.windowMs
  );
}

/**
 * Verifie le rate limit pour le reset password
 */
export function checkPasswordResetRateLimit(): ReturnType<typeof checkRateLimit> {
  return checkRateLimit(
    'password_reset',
    SECURITY_CONFIG.RATE_LIMIT_PASSWORD_RESET.attempts,
    SECURITY_CONFIG.RATE_LIMIT_PASSWORD_RESET.windowMs
  );
}

// ============================================
// DETECTION D'ATTAQUES
// ============================================

/**
 * Detecte les tentatives d'injection SQL/NoSQL/XSS
 */
export function detectInjection(input: string): boolean {
  if (!input || typeof input !== 'string') return false;

  const injectionPatterns = [
    // SQL Injection
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|UNION|ALTER|CREATE|TRUNCATE|EXEC|EXECUTE)\b)/i,
    /(-{2}|\/\*|\*\/|;--)/,
    /(\bOR\b|\bAND\b)\s+\d+\s*=\s*\d+/i,
    /'\s*(OR|AND)\s*'?\d/i,
    // NoSQL Injection
    /(\$where|\$gt|\$lt|\$ne|\$regex|\$or|\$and)/i,
    // XSS
    /<script\b[^>]*>/i,
    /javascript:/i,
    /on\w+\s*=/i,
    /data:\s*text\/html/i,
    /<iframe/i,
    /<embed/i,
    /<object/i,
    // Path traversal
    /\.\.\//,
    /\.\.\\/,
  ];

  return injectionPatterns.some(pattern => pattern.test(input));
}

/**
 * Verifie si une URL est sure
 */
export function isSafeUrl(url: string): boolean {
  if (!url || typeof url !== 'string') return false;

  try {
    const parsed = new URL(url);
    const allowedProtocols = ['https:', 'http:'];
    const blockedHosts = ['localhost', '127.0.0.1', '0.0.0.0'];

    if (!allowedProtocols.includes(parsed.protocol)) {
      return false;
    }

    if (blockedHosts.some(host => parsed.hostname.includes(host))) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

// ============================================
// PROTECTION DES DONNEES
// ============================================

/**
 * Masque partiellement un email pour l'affichage
 */
export function maskEmail(email: string): string {
  if (!email || !email.includes('@')) return '***@***.***';

  const [localPart, domain] = email.split('@');
  const maskedLocal = localPart.length > 2
    ? localPart[0] + '*'.repeat(Math.min(localPart.length - 2, 5)) + localPart[localPart.length - 1]
    : '*'.repeat(localPart.length);

  const domainParts = domain.split('.');
  const maskedDomain = domainParts.length > 1
    ? domainParts[0][0] + '***.' + domainParts[domainParts.length - 1]
    : '***';

  return `${maskedLocal}@${maskedDomain}`;
}

/**
 * Masque partiellement un numero de telephone
 */
export function maskPhone(phone: string): string {
  if (!phone || phone.length < 4) return '****';
  return '*'.repeat(phone.length - 4) + phone.slice(-4);
}

/**
 * Genere un identifiant unique securise
 */
export function generateSecureId(): string {
  const array = new Uint8Array(16);
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(array);
  } else {
    // Fallback pour environnements sans crypto
    for (let i = 0; i < array.length; i++) {
      array[i] = Math.floor(Math.random() * 256);
    }
  }
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

// ============================================
// SANITIZATION DES OBJETS METIER
// ============================================

/**
 * Nettoie les donnees d'un aliment avant stockage
 */
export function sanitizeFoodItem(item: {
  name: string;
  expirationDate?: string;
  quantity?: string | number;
  category?: string;
  price?: number;
}): {
  name: string;
  expirationDate: string;
  quantity?: number;
  category?: string;
  price?: number;
} {
  const sanitized: any = {
    name: sanitizeFoodName(item.name),
    expirationDate: sanitizeString(item.expirationDate || '', 10),
  };

  if (item.quantity !== undefined && item.quantity !== null && item.quantity !== '') {
    const qty = typeof item.quantity === 'number'
      ? item.quantity
      : parseInt(sanitizeString(String(item.quantity), 4), 10);
    if (!isNaN(qty) && qty >= 1 && qty <= 9999) {
      sanitized.quantity = qty;
    }
  }

  if (item.category) {
    sanitized.category = sanitizeString(item.category, 50);
  }

  if (item.price !== undefined && isValidPrice(item.price)) {
    sanitized.price = Math.round(item.price * 100) / 100;
  }

  return sanitized;
}

/**
 * Nettoie les donnees d'une liste avant stockage
 */
export function sanitizeListData(list: {
  title: string;
  color?: string;
}): {
  title: string;
  color?: string;
} {
  return {
    title: sanitizeString(list.title, SECURITY_CONFIG.LIST_NAME_MAX_LENGTH),
    color: list.color ? sanitizeString(list.color, 7) : undefined,
  };
}

// ============================================
// EXPORTS
// ============================================

export default {
  // Config
  SECURITY_CONFIG,

  // Sanitization
  escapeHtml,
  sanitizeString,
  sanitizeEmail,
  sanitizeFoodName,
  sanitizeObject,
  sanitizeFoodItem,
  sanitizeListData,

  // Validation
  validateEmail,
  isValidEmail,
  validatePassword,
  isValidName,
  validateFoodName,
  validateListTitle,
  validateDate,
  validateQuantity,
  validateBarcode,
  isValidPrice,

  // Rate limiting
  checkRateLimit,
  resetRateLimit,
  checkLoginRateLimit,
  checkSignupRateLimit,
  checkPasswordResetRateLimit,

  // Detection
  detectInjection,
  isSafeUrl,

  // Protection
  maskEmail,
  maskPhone,
  generateSecureId,
};
