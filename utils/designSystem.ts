// ============================================
// ZEROGASPY DESIGN SYSTEM
// Brand palette derived from logo: sage + forest + cream
// Mapped onto the legacy COLORS shape so the 60+ legacy consumers
// inherit the new handoff palette automatically (cf. tokens/colors.ts).
// ============================================

export const COLORS = {
  // Primary palette - Forest greens (handoff: Sage 100..500 then Forest 600..900)
  primary: {
    50: '#EEF6E2',  // sage-100
    100: '#DCEDC1', // sage-200
    200: '#C2DF9C', // sage-300
    300: '#A8D183', // sage-400 (light Z in logo)
    400: '#8DBE6B', // sage-500
    500: '#2F6B3F', // forest-600 — Main brand color (deep G)
    600: '#225230', // forest-700
    700: '#173B22', // forest-800
    800: '#0F2716', // forest-850
    900: '#0E2517', // forest-900
  },

  // Secondary palette - Warm cream/ink (handoff)
  secondary: {
    cream: '#F4EFE2',     // cream-100 (logo bg)
    sand: '#EBE6D8',      // cream-200
    warmGray: '#DCD6C5',  // cream-300
    sage: '#A8D183',      // sage-400
    mint: '#C2DF9C',      // sage-300
  },

  // Accent colors - kept as-is (used sparingly for category accents).
  // Tomato updated to handoff value (warmer earthy red).
  accent: {
    carrot: '#FF8C42',
    tomato: '#D85535', // urgent-solid (handoff)
    lemon: '#F1C40F',
    blueberry: '#5D6D9E',
    eggplant: '#6C5B7B',
    avocado: '#6BBF59',
    gold: '#F59E0B',
    amber: '#B45309',
  },

  // Semantic colors (handoff status values, kept warmer/more organic)
  semantic: {
    success: '#3D7A45',      // ok-solid
    successLight: '#6FA64F', // sage-600
    warning: '#C68A1E',      // warn-solid
    warningDark: '#7A5414',  // warn-fg
    warningAmber: '#7A5414',
    danger: '#D85535',       // urgent-solid
    dangerDark: '#B23A1A',   // urgent-fg
    dangerLight: '#D85535',
    dangerMuted: '#F0A085',  // urgent-border
    info: '#1F4A7A',         // info-fg
  },

  // Status indicator colors — more muted, brand-aligned
  status: {
    fresh: '#8DBE6B',         // sage-500
    expiringSoon: '#C68A1E',  // warn-solid
    expired: '#D85535',       // urgent-solid
    indigo: '#6366F1',
  },

  // Neutral shades — warmed up slightly to harmonize with cream canvas
  neutral: {
    white: '#FFFFFF',
    black: '#1E2A1F',         // ink-900 (warm ink)
    gray50: '#FAF7ED',        // cream-50
    gray100: '#F4EFE2',       // cream-100
    gray150: '#EBE6D8',       // cream-200
    gray200: '#EBE6D8',       // cream-200
    gray300: '#DCD6C5',       // cream-300
    gray400: '#B8B2A0',       // cream-400
    gray500: '#8A8472',       // cream-500
    gray600: '#6B6657',       // cream-600
    grayMuted: '#6B7568',     // ink-500
    grayDisabled: '#B8B2A0',  // cream-400
    grayBorder: '#DCD6C5',    // cream-300
    gray700: '#6B7568',       // ink-500
    gray800: '#2D3A2F',       // ink-700
    gray900: '#1E2A1F',       // ink-900
  },

  // Text colors — handoff ink scale + warm tertiary
  text: {
    primary: '#1E2A1F',      // ink-900
    secondary: '#6B7568',    // ink-500
    tertiary: '#8A8472',     // cream-500 (warm gray-tan)
    muted: '#B8B2A0',        // cream-400
    inverse: '#FAF7ED',      // cream-50
    brand: '#2F6B3F',        // forest-600
    danger: '#B23A1A',       // urgent-fg
    warningDark: '#7A5414',  // warn-fg
    achievement: '#C68A1E',  // warn-solid
  },

  // Surface colors — cream-based instead of pure white
  surface: {
    background: '#F4EFE2',   // cream-100 (canvas)
    card: '#FAF7ED',         // cream-50 (surface)
    elevated: '#FFFFFF',     // bg-elevated
    overlay: 'rgba(30, 42, 31, 0.32)', // ink-tinted scrim
    warningBg: '#FAE9C3',    // warn-bg
    successBg: '#DCEDC1',    // ok-bg (sage-200)
    infoBg: '#DCEAF6',       // info-bg
    dangerBg: '#FBE5DC',     // urgent-bg
    dangerBgLight: '#FBE5DC',
    dangerBgMuted: '#FBE5DC',
    dangerBorder: '#F0A085', // urgent-border
    warningLightBg: '#FAE9C3',
    achievementBg: '#FAE9C3',
    achievementBorder: '#E5C172',
    premiumBg: '#FAE9C3',
    disabledBg: '#EBE6D8',
  },

  // Button colors
  button: {
    primary: '#2F6B3F',       // forest-600
    primaryText: '#FFFFFF',
    secondary: '#EBE6D8',     // cream-200
    secondaryText: '#2F6B3F', // forest-600
  },

  // Interactive elements
  interactive: {
    primary: '#2F6B3F',  // forest-600
    secondary: '#D85535', // tomato (urgent-solid) for accent contrast
    hover: '#225230',    // forest-700
    active: '#173B22',   // forest-800
  },
};

// ============================================
// SHADOWS - Soft organic shadows
// ============================================

export const SHADOWS = {
  xs: {
    shadowColor: '#1E2A1F',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  sm: {
    shadowColor: '#1E2A1F',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  md: {
    shadowColor: '#1E2A1F',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 4,
  },
  lg: {
    shadowColor: '#1E2A1F',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 8,
  },
  xl: {
    shadowColor: '#1E2A1F',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.2,
    shadowRadius: 28,
    elevation: 12,
  },
  colored: (color: string, opacity: number = 0.3) => ({
    shadowColor: color,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: opacity,
    shadowRadius: 20,
    elevation: 10,
  }),
  glow: (color: string) => ({
    shadowColor: color,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 15,
    elevation: 8,
  }),
};

// ============================================
// SPACING - Consistent spacing scale
// ============================================

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  '3xl': 32,
  '4xl': 40,
  '5xl': 48,
  '6xl': 64,
};

// ============================================
// BORDER RADIUS - Organic rounded corners
// ============================================

export const RADIUS = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  '3xl': 32,
  full: 9999,
};

// ============================================
// TYPOGRAPHY - Font sizes and weights
// ============================================

export const TYPOGRAPHY = {
  // Display sizes
  display: {
    fontSize: 38,
    lineHeight: 48,
    fontWeight: '800' as const,
    letterSpacing: -1.5,
  },

  // Headings
  h1: {
    fontSize: 32,
    lineHeight: 40,
    fontWeight: '700' as const,
    letterSpacing: -1,
  },
  h2: {
    fontSize: 26,
    lineHeight: 34,
    fontWeight: '700' as const,
    letterSpacing: -0.5,
  },
  h3: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '600' as const,
    letterSpacing: 0,
  },
  h4: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '600' as const,
    letterSpacing: 0,
  },

  // Body text
  bodyLg: {
    fontSize: 17,
    lineHeight: 26,
    fontWeight: '400' as const,
  },
  body: {
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '400' as const,
  },
  bodySm: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '400' as const,
  },

  // Supporting text
  caption: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '500' as const,
  },
  label: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600' as const,
    letterSpacing: 0.3,
  },

  // Button text
  button: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '600' as const,
    letterSpacing: 0.3,
  },
  buttonSm: {
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '600' as const,
    letterSpacing: 0.2,
  },
};

// ============================================
// ANIMATION DURATIONS
// ============================================

export const ANIMATION = {
  fast: 150,
  normal: 300,
  slow: 500,
  verySlow: 800,

  // Spring configs
  spring: {
    gentle: { friction: 10, tension: 40 },
    bouncy: { friction: 5, tension: 40 },
    stiff: { friction: 15, tension: 120 },
  },
};

// ============================================
// GRADIENT DEFINITIONS
// ============================================

export const GRADIENTS = {
  primary: ['#2F6B3F', '#225230'],       // forest-600 → 700
  primaryLight: ['#3D7A45', '#2F6B3F'],  // forest-500 → 600
  success: ['#6FA64F', '#2F6B3F'],       // sage-600 → forest-600
  warning: ['#E5C172', '#C68A1E'],       // warn-border → warn-solid
  danger: ['#F0A085', '#D85535'],        // urgent-border → urgent-solid
  cream: ['#F4EFE2', '#EBE6D8'],         // cream-100 → 200
  sage: ['#DCEDC1', '#A8D183'],          // sage-200 → 400
};

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Convert hex color to rgba
 */
export function hexToRgba(hex: string, opacity: number): string {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return `rgba(60, 110, 71, ${opacity})`;
  const r = parseInt(result[1], 16);
  const g = parseInt(result[2], 16);
  const b = parseInt(result[3], 16);
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}

/**
 * Lighten a hex color
 */
export function lightenColor(hex: string, percent: number): string {
  const num = parseInt(hex.replace('#', ''), 16);
  const amt = Math.round(2.55 * percent);
  const R = (num >> 16) + amt;
  const G = ((num >> 8) & 0x00ff) + amt;
  const B = (num & 0x0000ff) + amt;
  return `#${(
    0x1000000 +
    (R < 255 ? (R < 1 ? 0 : R) : 255) * 0x10000 +
    (G < 255 ? (G < 1 ? 0 : G) : 255) * 0x100 +
    (B < 255 ? (B < 1 ? 0 : B) : 255)
  )
    .toString(16)
    .slice(1)}`;
}

/**
 * Darken a hex color
 */
export function darkenColor(hex: string, percent: number): string {
  return lightenColor(hex, -percent);
}

/**
 * Get contrasting text color (black or white)
 */
export function getContrastText(hexColor: string): string {
  const hex = hexColor.replace('#', '');
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5 ? COLORS.text.primary : COLORS.text.inverse;
}

// ============================================
// FOOD CATEGORY COLORS
// ============================================

export const CATEGORY_COLORS: Record<string, { bg: string; text: string; icon: string }> = {
  fruits: { bg: '#FFE4E1', text: '#C0392B', icon: 'nutrition' },
  vegetables: { bg: '#E8F5E9', text: '#2E7D32', icon: 'leaf' },
  dairy: { bg: '#E3F2FD', text: '#1565C0', icon: 'water' },
  meat: { bg: '#FFEBEE', text: '#C62828', icon: 'restaurant' },
  fish: { bg: '#E0F7FA', text: '#00838F', icon: 'fish' },
  bakery: { bg: '#FFF8E1', text: '#F57F17', icon: 'pizza' },
  beverages: { bg: '#F3E5F5', text: '#7B1FA2', icon: 'wine' },
  frozen: { bg: '#E1F5FE', text: '#0277BD', icon: 'snow' },
  condiments: { bg: '#FFF3E0', text: '#E65100', icon: 'flask' },
  snacks: { bg: '#FCE4EC', text: '#C2185B', icon: 'cafe' },
  other: { bg: '#ECEFF1', text: '#546E7A', icon: 'cube' },
};

// ============================================
// EXPIRATION STATUS COLORS
// ============================================

export const EXPIRATION_COLORS = {
  expired: {
    bg: '#FFEBEE',
    text: '#C62828',
    border: '#EF9A9A',
  },
  expiresToday: {
    bg: '#FFF3E0',
    text: '#E65100',
    border: '#FFCC80',
  },
  expiresSoon: {
    bg: '#FFFDE7',
    text: '#F57F17',
    border: '#FFF59D',
  },
  fresh: {
    bg: '#E8F5E9',
    text: '#2E7D32',
    border: '#A5D6A7',
  },
};

