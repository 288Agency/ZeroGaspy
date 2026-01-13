// ============================================
// RESPONSIVE UTILITIES
// Scaling system for different screen sizes
// ============================================

import { Dimensions, PixelRatio, Platform } from 'react-native';

// Base dimensions (iPhone 14 Pro as reference)
const BASE_WIDTH = 393;
const BASE_HEIGHT = 852;

// Get current screen dimensions
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Determine if it's a small screen (old phones, SE, etc.)
export const isSmallScreen = SCREEN_WIDTH < 375;
export const isMediumScreen = SCREEN_WIDTH >= 375 && SCREEN_WIDTH < 414;
export const isLargeScreen = SCREEN_WIDTH >= 414;

// Screen size category
export type ScreenSize = 'small' | 'medium' | 'large';
export const screenSize: ScreenSize = isSmallScreen ? 'small' : isMediumScreen ? 'medium' : 'large';

// Scale factors
const widthScale = SCREEN_WIDTH / BASE_WIDTH;
const heightScale = SCREEN_HEIGHT / BASE_HEIGHT;

// Use the smaller scale to maintain aspect ratio
const scale = Math.min(widthScale, heightScale);

// ============================================
// SCALING FUNCTIONS
// ============================================

/**
 * Scale a value based on screen width
 * Use for horizontal dimensions (width, horizontal padding/margin)
 */
export function scaleWidth(size: number): number {
  return Math.round(size * widthScale);
}

/**
 * Scale a value based on screen height
 * Use for vertical dimensions (height, vertical padding/margin)
 */
export function scaleHeight(size: number): number {
  return Math.round(size * heightScale);
}

/**
 * Scale a value proportionally (uses smaller scale)
 * Use for elements that should maintain aspect ratio
 */
export function scaleSize(size: number): number {
  return Math.round(size * scale);
}

/**
 * Scale font size with limits to ensure readability
 * Applies a moderate scaling to prevent text from becoming too small/large
 */
export function scaleFontSize(size: number): number {
  const scaledSize = size * Math.min(scale, 1.2); // Cap at 1.2x for large screens
  const minScale = 0.75; // Don't go below 75% of original size
  const cappedSize = Math.max(scaledSize, size * minScale);

  // Round to nearest 0.5 for cleaner rendering
  return Math.round(cappedSize * 2) / 2;
}

/**
 * Scale spacing (padding, margin, gaps)
 * Uses moderate scaling to maintain proportions
 */
export function scaleSpacing(size: number): number {
  const scaledSize = size * scale;
  const minScale = 0.7; // Don't go below 70% of original
  return Math.round(Math.max(scaledSize, size * minScale));
}

/**
 * Get responsive value based on screen size
 * Allows specifying different values for each screen size
 */
export function responsive<T>(values: { small: T; medium: T; large: T }): T {
  return values[screenSize];
}

/**
 * Moderate scale for elements that need subtle scaling
 */
export function moderateScale(size: number, factor: number = 0.5): number {
  return Math.round(size + (scaleSize(size) - size) * factor);
}

/**
 * Scale line height proportionally to font size
 */
export function scaleLineHeight(lineHeight: number, fontSize: number): number {
  const ratio = lineHeight / fontSize;
  return Math.round(scaleFontSize(fontSize) * ratio);
}

// ============================================
// RESPONSIVE TYPOGRAPHY
// ============================================

export const RESPONSIVE_TYPOGRAPHY = {
  // Display sizes
  display: {
    fontSize: scaleFontSize(38),
    lineHeight: scaleLineHeight(48, 38),
    fontWeight: '800' as const,
    letterSpacing: -1.5,
  },

  // Headings
  h1: {
    fontSize: scaleFontSize(32),
    lineHeight: scaleLineHeight(40, 32),
    fontWeight: '700' as const,
    letterSpacing: -1,
  },
  h2: {
    fontSize: scaleFontSize(26),
    lineHeight: scaleLineHeight(34, 26),
    fontWeight: '700' as const,
    letterSpacing: -0.5,
  },
  h3: {
    fontSize: scaleFontSize(22),
    lineHeight: scaleLineHeight(28, 22),
    fontWeight: '600' as const,
  },
  h4: {
    fontSize: scaleFontSize(18),
    lineHeight: scaleLineHeight(24, 18),
    fontWeight: '600' as const,
  },

  // Body text
  bodyLg: {
    fontSize: scaleFontSize(17),
    lineHeight: scaleLineHeight(26, 17),
    fontWeight: '400' as const,
  },
  body: {
    fontSize: scaleFontSize(15),
    lineHeight: scaleLineHeight(22, 15),
    fontWeight: '400' as const,
  },
  bodySm: {
    fontSize: scaleFontSize(14),
    lineHeight: scaleLineHeight(20, 14),
    fontWeight: '400' as const,
  },

  // Supporting text
  caption: {
    fontSize: scaleFontSize(12),
    lineHeight: scaleLineHeight(16, 12),
    fontWeight: '500' as const,
  },
  label: {
    fontSize: scaleFontSize(13),
    lineHeight: scaleLineHeight(18, 13),
    fontWeight: '600' as const,
    letterSpacing: 0.3,
  },

  // Button text
  button: {
    fontSize: scaleFontSize(16),
    lineHeight: scaleLineHeight(22, 16),
    fontWeight: '600' as const,
    letterSpacing: 0.3,
  },
  buttonSm: {
    fontSize: scaleFontSize(14),
    lineHeight: scaleLineHeight(18, 14),
    fontWeight: '600' as const,
  },
};

// ============================================
// RESPONSIVE SPACING
// ============================================

export const RESPONSIVE_SPACING = {
  xs: scaleSpacing(4),
  sm: scaleSpacing(8),
  md: scaleSpacing(12),
  lg: scaleSpacing(16),
  xl: scaleSpacing(20),
  '2xl': scaleSpacing(24),
  '3xl': scaleSpacing(32),
  '4xl': scaleSpacing(40),
  '5xl': scaleSpacing(48),
  '6xl': scaleSpacing(64),
};

// ============================================
// RESPONSIVE RADIUS
// ============================================

export const RESPONSIVE_RADIUS = {
  sm: scaleSize(8),
  md: scaleSize(12),
  lg: scaleSize(16),
  xl: scaleSize(20),
  '2xl': scaleSize(24),
  '3xl': scaleSize(32),
  full: 9999,
};

// ============================================
// DEVICE INFO
// ============================================

export const DEVICE = {
  width: SCREEN_WIDTH,
  height: SCREEN_HEIGHT,
  isSmallScreen,
  isMediumScreen,
  isLargeScreen,
  screenSize,
  pixelRatio: PixelRatio.get(),
  fontScale: PixelRatio.getFontScale(),
  isIOS: Platform.OS === 'ios',
  isAndroid: Platform.OS === 'android',
};

// ============================================
// COMMON RESPONSIVE VALUES
// ============================================

export const RESPONSIVE = {
  // Horizontal padding for screens
  screenPaddingHorizontal: responsive({
    small: 16,
    medium: 20,
    large: 24,
  }),

  // Button heights
  buttonHeight: {
    sm: scaleSize(36),
    md: scaleSize(44),
    lg: scaleSize(52),
  },

  // Icon sizes
  iconSize: {
    sm: scaleSize(16),
    md: scaleSize(20),
    lg: scaleSize(24),
    xl: scaleSize(32),
  },

  // Card dimensions
  cardPadding: scaleSpacing(16),
  cardRadius: scaleSize(16),

  // Header
  headerHeight: scaleSize(56),
  headerPaddingTop: scaleSize(50),

  // Bottom safe area
  bottomPadding: responsive({
    small: 24,
    medium: 32,
    large: 40,
  }),

  // Modal
  modalMaxWidth: Math.min(SCREEN_WIDTH - 32, 400),
};
