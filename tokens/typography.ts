// ============================================================================
// ZeroGaspy Design System · Typography
// ============================================================================
// SF Pro Display ≥ 22px (Display, Title 1, Title 2)
// SF Pro Text   < 22px (Title 3, Body, Footnote, Caption)
// SF Mono pour quantités / dates / codes
//
// iOS bascule auto via system font — on ne précise PAS fontFamily sur iOS
// pour laisser le système choisir Display/Text selon la taille (San Francisco
// optical sizes). Sur Android, on tombe sur le system default.
//
// 9 niveaux. Pas plus. Si tu as besoin d'un 10e, c'est probablement
// un mauvais token.
// ============================================================================

import { Platform, TextStyle } from 'react-native';

// ────────────────────────────────────────────────────────────────────────────
// Font families
// ────────────────────────────────────────────────────────────────────────────

const SF_TEXT = Platform.select({
  ios:     undefined,           // system → SF Pro Text/Display automatique
  android: 'sans-serif',
  default: 'System',
});

const SF_MONO = Platform.select({
  ios:     'Menlo',             // closest system mono on iOS
  android: 'monospace',
  default: 'monospace',
});

// ────────────────────────────────────────────────────────────────────────────
// Type scale — 9 niveaux
// ────────────────────────────────────────────────────────────────────────────

export const typography = {
  // Display — onboarding hero, paywall
  display: {
    fontFamily: SF_TEXT,
    fontSize: 40,
    lineHeight: 44,
    fontWeight: '700',
    letterSpacing: -1.5,
  } as TextStyle,

  // Title 1 — header d'écran
  title1: {
    fontFamily: SF_TEXT,
    fontSize: 28,
    lineHeight: 32,
    fontWeight: '700',
    letterSpacing: -0.8,
  } as TextStyle,

  // Title 2 — section, modal title
  title2: {
    fontFamily: SF_TEXT,
    fontSize: 22,
    lineHeight: 26,
    fontWeight: '600',
    letterSpacing: -0.4,
  } as TextStyle,

  // Title 3 — sub-section, card title
  title3: {
    fontFamily: SF_TEXT,
    fontSize: 17,
    lineHeight: 22,
    fontWeight: '600',
    letterSpacing: -0.2,
  } as TextStyle,

  // Body — texte courant
  body: {
    fontFamily: SF_TEXT,
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '400',
    letterSpacing: 0,
  } as TextStyle,

  // Body emphasis — body mis en avant inline
  bodyEmphasis: {
    fontFamily: SF_TEXT,
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '600',
    letterSpacing: 0,
  } as TextStyle,

  // Footnote — meta, helper text
  footnote: {
    fontFamily: SF_TEXT,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '400',
    letterSpacing: 0.1,
  } as TextStyle,

  // Caption — badge, timestamp (uppercase fréquent)
  caption: {
    fontFamily: SF_TEXT,
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '600',
    letterSpacing: 0.3,
  } as TextStyle,

  // Mono — quantités, dates, codes-barres
  mono: {
    fontFamily: SF_MONO,
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '500',
    letterSpacing: 0,
  } as TextStyle,
} as const;

export type TypographyToken = keyof typeof typography;
