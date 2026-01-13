/**
 * Utilitaires de sécurité pour ZeroGaspy
 * - Validation des entrées utilisateur
 * - Sanitisation des données
 * - Protection XSS
 */

/**
 * Échappe les caractères HTML dangereux
 */
export function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };
  return text.replace(/[&<>"']/g, (m) => map[m] || m);
}

/**
 * Nettoie une chaîne de caractères
 * - Supprime les espaces en début/fin
 * - Limite la longueur
 * - Supprime les caractères de contrôle
 */
export function sanitizeString(
  input: string,
  maxLength: number = 500
): string {
  if (!input || typeof input !== 'string') return '';
  
  return input
    .trim()
    // Supprime les caractères de contrôle (sauf retour à la ligne)
    .replace(/[\x00-\x09\x0B\x0C\x0E-\x1F\x7F]/g, '')
    // Limite la longueur
    .substring(0, maxLength);
}

/**
 * Valide un nom d'aliment
 */
export function validateFoodName(name: string): { valid: boolean; error?: string } {
  const sanitized = sanitizeString(name, 100);

  if (!sanitized) {
    return { valid: false, error: 'Le nom est requis' };
  }

  if (!/[a-zA-Z0-9\u00C0-\u024F]/.test(sanitized)) {
    return { valid: false, error: 'Le nom doit contenir des lettres ou chiffres' };
  }

  return { valid: true };
}

/**
 * Valide un email
 */
export function validateEmail(email: string): { valid: boolean; error?: string } {
  const sanitized = sanitizeString(email, 254);
  
  if (!sanitized) {
    return { valid: false, error: 'L\'email est requis' };
  }
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(sanitized)) {
    return { valid: false, error: 'Format d\'email invalide' };
  }
  
  return { valid: true };
}

/**
 * Valide une date au format JJ/MM/AAAA
 */
export function validateDate(dateStr: string): { valid: boolean; error?: string; date?: Date } {
  if (!dateStr) {
    return { valid: true }; // Date optionnelle
  }
  
  const sanitized = sanitizeString(dateStr, 10);
  const dateRegex = /^(\d{2})\/(\d{2})\/(\d{4})$/;
  const match = sanitized.match(dateRegex);
  
  if (!match) {
    return { valid: false, error: 'Format de date invalide (JJ/MM/AAAA)' };
  }
  
  const [, day, month, year] = match.map(Number);
  const date = new Date(year, month - 1, day);
  
  // Vérifie que la date est valide
  if (
    date.getDate() !== day ||
    date.getMonth() !== month - 1 ||
    date.getFullYear() !== year
  ) {
    return { valid: false, error: 'Date invalide' };
  }
  
  // Vérifie que la date n'est pas trop ancienne (max 1 an dans le passé)
  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
  if (date < oneYearAgo) {
    return { valid: false, error: 'Date trop ancienne' };
  }
  
  // Vérifie que la date n'est pas trop dans le futur (max 10 ans)
  const tenYearsLater = new Date();
  tenYearsLater.setFullYear(tenYearsLater.getFullYear() + 10);
  if (date > tenYearsLater) {
    return { valid: false, error: 'Date trop éloignée' };
  }
  
  return { valid: true, date };
}

/**
 * Valide une quantité
 */
export function validateQuantity(quantity: string): { valid: boolean; error?: string; value?: number } {
  if (!quantity || quantity.trim() === '') {
    return { valid: true }; // Quantité optionnelle
  }
  
  const num = parseInt(quantity, 10);
  
  if (isNaN(num)) {
    return { valid: false, error: 'La quantité doit être un nombre' };
  }
  
  if (num < 1) {
    return { valid: false, error: 'La quantité doit être au moins 1' };
  }
  
  if (num > 9999) {
    return { valid: false, error: 'La quantité est trop grande' };
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
  
  // Vérifie que le code ne contient que des chiffres
  if (!/^\d+$/.test(sanitized)) {
    return { valid: false, error: 'Code-barres invalide' };
  }
  
  // Vérifie la longueur (EAN-8, EAN-13, UPC-A, etc.)
  const validLengths = [8, 12, 13, 14];
  if (!validLengths.includes(sanitized.length)) {
    return { valid: false, error: 'Longueur de code-barres invalide' };
  }
  
  return { valid: true };
}

/**
 * Valide un titre de liste
 */
export function validateListTitle(title: string): { valid: boolean; error?: string } {
  const sanitized = sanitizeString(title, 50);

  if (!sanitized) {
    return { valid: false, error: 'Le titre est requis' };
  }

  return { valid: true };
}

/**
 * Nettoie les données d'un aliment avant stockage
 */
export function sanitizeFoodItem(item: {
  name: string;
  expirationDate?: string;
  quantity?: string | number;
  category?: string;
}): {
  name: string;
  expirationDate: string;
  quantity?: number;
  category?: string;
} {
  return {
    name: sanitizeString(item.name, 100),
    expirationDate: sanitizeString(item.expirationDate || '', 10),
    quantity: typeof item.quantity === 'number' 
      ? Math.min(Math.max(1, item.quantity), 9999)
      : item.quantity 
        ? parseInt(sanitizeString(String(item.quantity), 4), 10) || undefined
        : undefined,
    category: item.category ? sanitizeString(item.category, 50) : undefined,
  };
}
