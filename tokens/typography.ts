// ============================================================================
// ZeroGaspy Design System · Typography
// ============================================================================
// Brand Bible — 3 familles (assets/fonts, variables TTF) :
//   · Clash Grotesk Variable → display, hero, grands titres
//   · Switzer Variable       → corps, UI, titres secondaires
//   · Switzer Variable Italic → accents éditoriaux (« vide. », « soir. »)
//   · Menlo (système)        → labels section / eyebrow uppercase
//
// Fallback système tant que HandoffFontsProvider n'a pas fini le chargement.
// ============================================================================

import { Platform, TextStyle } from 'react-native';
import { HANDOFF_FONT_FAMILY } from './handoffFonts';

// ────────────────────────────────────────────────────────────────────────────
// Font families
// ────────────────────────────────────────────────────────────────────────────

const SF_TEXT = Platform.select({
  ios:     undefined,
  android: 'sans-serif',
  default: 'System',
});

const SF_MONO = Platform.select({
  ios:     'Menlo',
  android: 'monospace',
  default: 'monospace',
});

export const FONT_HANDOFF = {
  sans:  'Switzer',
  display: 'Clash Grotesk',
  sansItalic: 'Switzer',
} as const;

const SERIF_ITALIC_FALLBACK = Platform.select({
  ios:     'Georgia',
  android: 'serif',
  default: 'serif',
});

// ────────────────────────────────────────────────────────────────────────────
// Type scale — 10 niveaux
// ────────────────────────────────────────────────────────────────────────────

type SansWeight = '400' | '500' | '600' | '700';

function sansFamily(handoff: boolean): string | undefined {
  return handoff ? HANDOFF_FONT_FAMILY.sans : SF_TEXT;
}

function displayFamily(handoff: boolean): string | undefined {
  return handoff ? HANDOFF_FONT_FAMILY.display : SF_TEXT;
}

function buildTypography(handoff: boolean) {
  return {
  /** Hero count — chiffre géant today-hero */
  hero: {
    fontFamily: displayFamily(handoff),
    fontSize: 64,
    lineHeight: 60,
    fontWeight: '700',
    letterSpacing: -3,
  } as TextStyle,

  /** Display — onboarding hero, paywall */
  display: {
    fontFamily: displayFamily(handoff),
    fontSize: 40,
    lineHeight: 44,
    fontWeight: '700',
    letterSpacing: -1.5,
  } as TextStyle,

  /** Large title — greeting "Bonjour Sarah." */
  title1: {
    fontFamily: displayFamily(handoff),
    fontSize: 34,
    lineHeight: 36,
    fontWeight: '700',
    letterSpacing: -1.2,
  } as TextStyle,

  /** Title 2 — section, modal title */
  title2: {
    fontFamily: sansFamily(handoff),
    fontSize: 22,
    lineHeight: 26,
    fontWeight: '600',
    letterSpacing: -0.4,
  } as TextStyle,

  /** Title 3 — sub-section, screen title */
  title3: {
    fontFamily: sansFamily(handoff),
    fontSize: 17,
    lineHeight: 22,
    fontWeight: '600',
    letterSpacing: -0.3,
  } as TextStyle,

  /** Card title — ProductCard name */
  cardTitle: {
    fontFamily: sansFamily(handoff),
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '600',
    letterSpacing: -0.2,
  } as TextStyle,

  /** Body — texte courant */
  body: {
    fontFamily: sansFamily(handoff),
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '400',
    letterSpacing: 0,
  } as TextStyle,

  /** Body emphasis */
  bodyEmphasis: {
    fontFamily: sansFamily(handoff),
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '500',
    letterSpacing: -0.1,
  } as TextStyle,

  /** Footnote — meta, helper text */
  footnote: {
    fontFamily: sansFamily(handoff),
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '400',
    letterSpacing: 0,
  } as TextStyle,

  /** Caption — badge */
  caption: {
    fontFamily: sansFamily(handoff),
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '600',
    letterSpacing: 0.2,
  } as TextStyle,

  /** Section label — UPPERCASE mono */
  sectionLabel: {
    fontFamily: SF_MONO,
    fontSize: 12,
    lineHeight: 14,
    fontWeight: '600',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  } as TextStyle,

  /** Mono — quantités, dates, codes-barres */
  mono: {
    fontFamily: SF_MONO,
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '500',
    letterSpacing: 0,
  } as TextStyle,

  /** Eyebrow — petit label au-dessus d'un hero */
  eyebrow: {
    fontFamily: SF_MONO,
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '500',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  } as TextStyle,

  /** Accent éditorial italique — « Sarah. », « cuisine ça. » */
  serifItalic: {
    fontFamily: handoff ? HANDOFF_FONT_FAMILY.sansItalic : SERIF_ITALIC_FALLBACK,
    fontStyle: handoff ? undefined : 'italic',
    fontWeight: '400',
  } as TextStyle,
} as const;
}

/** Fallback système (avant chargement des fonts brand). */
export const typography = buildTypography(false);

/** Switzer + Clash Grotesk — activé par ThemeProvider quand fonts prêtes. */
export function getHandoffTypography() {
  return buildTypography(true);
}

export type TypographyToken = keyof typeof typography;
