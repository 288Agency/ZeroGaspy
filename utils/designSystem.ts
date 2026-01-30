// ============================================
// ZEROGASPY DESIGN SYSTEM
// Organic & Natural Theme
// ============================================

export const COLORS = {
  // Primary palette - Forest greens
  primary: {
    50: '#E8F5E9',
    100: '#C8E6C9',
    200: '#A5D6A7',
    300: '#81C784',
    400: '#66BB6A',
    500: '#3C6E47', // Main brand color
    600: '#2E5339',
    700: '#1F3A27',
    800: '#152818',
    900: '#0A1409',
  },

  // Secondary palette - Warm earthy tones
  secondary: {
    cream: '#F7F5E6',
    sand: '#EDE8D0',
    warmGray: '#D4CFC0',
    sage: '#A3C9A8',
    mint: '#B8E0BE',
  },

  // Accent colors - Organic food-inspired
  accent: {
    carrot: '#FF8C42',
    tomato: '#E74C3C',
    lemon: '#F1C40F',
    blueberry: '#5D6D9E',
    eggplant: '#6C5B7B',
    avocado: '#6BBF59',
  },

  // Semantic colors
  semantic: {
    success: '#4CAF50',
    warning: '#FF9800',
    danger: '#E53935',
    info: '#2196F3',
  },

  // Neutral shades
  neutral: {
    white: '#FFFFFF',
    black: '#1A1A1A',
    gray50: '#FAFAFA',
    gray100: '#F5F5F5',
    gray200: '#EEEEEE',
    gray300: '#E0E0E0',
    gray400: '#BDBDBD',
    gray500: '#9E9E9E',
    gray600: '#757575',
    gray700: '#616161',
    gray800: '#424242',
    gray900: '#212121',
  },

  // Text colors
  text: {
    primary: '#2D3436',
    secondary: '#636E72',
    muted: '#A0A0A0',
    inverse: '#FFFFFF',
    brand: '#3C6E47',
  },

  // Surface colors (light mode)
  surface: {
    background: '#F7F5E6',
    card: '#FFFFFF',
    elevated: '#FFFFFF',
    overlay: 'rgba(0, 0, 0, 0.5)',
  },

  // Button colors (light mode)
  button: {
    primary: '#3C6E47',
    primaryText: '#FFFFFF',
    secondary: '#EDE8D0',
    secondaryText: '#3C6E47',
  },

  // Interactive elements (light mode)
  interactive: {
    primary: '#3C6E47',
    secondary: '#FF8C42',
    hover: '#2E5339',
    active: '#1F3A27',
  },
};

// ============================================
// DARK MODE COLOR PALETTE
// Warm, cozy dark theme
// ============================================

export const COLORS_DARK = {
  // Primary palette - Forest greens for dark mode
  primary: {
    50: '#0A1409',
    100: '#152818',
    200: '#1F3A26', // Button background
    300: '#2E5339',
    400: '#3C6E47',
    500: '#88B89B', // Main interactive color
    600: '#A3C9A8',
    700: '#B8E0BE',
    800: '#C8E6C9',
    900: '#E8F5E9',
  },

  // Secondary palette - Warm dark tones
  secondary: {
    cream: '#1C1C1A', // Global background
    sand: '#252522',
    warmGray: '#33332E', // Card background
    sage: '#88B89B', // Interactive elements
    mint: '#A3C9A8',
  },

  // Accent colors - Warm contrasts
  accent: {
    carrot: '#F4A259', // Warm orange for interactive elements
    tomato: '#EF5350',
    lemon: '#FFEB3B',
    blueberry: '#7986CB',
    eggplant: '#9575CD',
    avocado: '#88B89B',
  },

  // Semantic colors - Adjusted for dark mode
  semantic: {
    success: '#88B89B',
    warning: '#F4A259',
    danger: '#EF5350',
    info: '#42A5F5',
  },

  // Neutral shades - Warm dark palette
  neutral: {
    white: '#1C1C1A', // Global background
    black: '#E6E6E6', // Main text
    gray50: '#1C1C1A',
    gray100: '#252522',
    gray200: '#33332E', // Card background
    gray300: '#3D3D38',
    gray400: '#5A5A54',
    gray500: '#757570',
    gray600: '#9E9E99',
    gray700: '#BDBDB8',
    gray800: '#D4D4D0',
    gray900: '#E6E6E6',
  },

  // Text colors - High contrast on dark
  text: {
    primary: '#E6E6E6', // Main text
    secondary: '#B0B0AB',
    muted: '#757570',
    inverse: '#1C1C1A',
    brand: '#88B89B', // Interactive green
  },

  // Additional dark mode specific colors
  surface: {
    background: '#1C1C1A', // Global background
    card: '#33332E', // Card background
    elevated: '#3D3D38', // Elevated surfaces
    overlay: 'rgba(28, 28, 26, 0.9)',
  },

  // Button colors
  button: {
    primary: '#1F3A26', // Green button background
    primaryText: '#E6E6E6', // Button text
    secondary: '#33332E',
    secondaryText: '#A3C9A8',
  },

  // Interactive elements
  interactive: {
    primary: '#88B89B', // Main interactive color
    secondary: '#F4A259', // Warm accent
    hover: '#A3C9A8',
    active: '#1F3A26',
  },
};

// ============================================
// SHADOWS - Soft organic shadows
// ============================================

export const SHADOWS = {
  sm: {
    shadowColor: '#3C6E47',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  md: {
    shadowColor: '#3C6E47',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 4,
  },
  lg: {
    shadowColor: '#3C6E47',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 8,
  },
  xl: {
    shadowColor: '#3C6E47',
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
  },
  h4: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '600' as const,
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
  primary: ['#3C6E47', '#2E5339'],
  primaryLight: ['#4A8C5A', '#3C6E47'],
  success: ['#6BBF59', '#3C6E47'],
  warning: ['#FFD93D', '#F4A261'],
  danger: ['#FF6B6B', '#E53935'],
  cream: ['#F7F5E6', '#EDE8D0'],
  sage: ['#B8E0BE', '#A3C9A8'],
};

// Dark mode gradients
export const GRADIENTS_DARK = {
  primary: ['#1F3A26', '#152818'],
  primaryLight: ['#2E5339', '#1F3A26'],
  success: ['#88B89B', '#3C6E47'],
  warning: ['#F4A259', '#E8943D'],
  danger: ['#EF5350', '#D32F2F'],
  surface: ['#33332E', '#1C1C1A'],
  card: ['#3D3D38', '#33332E'],
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

// Dark mode category colors
export const CATEGORY_COLORS_DARK: Record<string, { bg: string; text: string; icon: string }> = {
  fruits: { bg: '#3D2A2A', text: '#FF8A80', icon: 'nutrition' },
  vegetables: { bg: '#1F3A26', text: '#88B89B', icon: 'leaf' },
  dairy: { bg: '#1A2D3D', text: '#82B1FF', icon: 'water' },
  meat: { bg: '#3D2424', text: '#FF8A80', icon: 'restaurant' },
  fish: { bg: '#1A3338', text: '#80DEEA', icon: 'fish' },
  bakery: { bg: '#3D3520', text: '#FFD54F', icon: 'pizza' },
  beverages: { bg: '#2D1F3D', text: '#CE93D8', icon: 'wine' },
  frozen: { bg: '#1A2D3D', text: '#81D4FA', icon: 'snow' },
  condiments: { bg: '#3D2E1A', text: '#F4A259', icon: 'flask' },
  snacks: { bg: '#3D1F2D', text: '#F48FB1', icon: 'cafe' },
  other: { bg: '#33332E', text: '#90A4AE', icon: 'cube' },
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

// Dark mode expiration colors
export const EXPIRATION_COLORS_DARK = {
  expired: {
    bg: '#3D2424',
    text: '#FF8A80',
    border: '#5D3A3A',
  },
  expiresToday: {
    bg: '#3D2E1A',
    text: '#F4A259',
    border: '#5D4A2A',
  },
  expiresSoon: {
    bg: '#3D3820',
    text: '#FFD54F',
    border: '#5D5430',
  },
  fresh: {
    bg: '#1F3A26',
    text: '#88B89B',
    border: '#2E5339',
  },
};
