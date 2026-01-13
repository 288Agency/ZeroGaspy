/**
 * Calculates the number of days until a date expires
 * @param dateString Date in DD/MM/YYYY format
 * @returns Number of days (negative if expired) or null if invalid
 */
export function getDaysUntilExpiration(dateString: string): number | null {
  try {
    if (!dateString) return null;
    const [day, month, year] = dateString.split('/').map(Number);
    const expiration = new Date(year, month - 1, day);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    expiration.setHours(0, 0, 0, 0);

    const diffTime = expiration.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  } catch {
    return null;
  }
}

/**
 * Formats a date to DD/MM/YYYY string
 */
export function formatDateToDDMMYYYY(date: Date): string {
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

/**
 * Parses a DD/MM/YYYY date string to a Date object
 */
export function parseDDMMYYYY(dateString: string): Date | null {
  try {
    const [day, month, year] = dateString.split('/').map(Number);
    return new Date(year, month - 1, day);
  } catch {
    return null;
  }
}
