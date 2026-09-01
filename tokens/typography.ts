// ============================================================================
// ZeroGaspy Design System · Typography (handoff port)
// ============================================================================
// Le handoff appelle 3 familles Google Fonts :
//   · DM Sans            → corps, UI, titres
//   · Instrument Serif   → accents éditoriaux italiques (« Bonjour *Sarah.* »)
//   · Geist Mono         → labels de section, données, tags (UPPERCASE)
//
// Stratégie de port :
//   1. On garde le système iOS (SF Pro) comme fallback par défaut : sur iOS,
//      `fontFamily: undefined` laisse San Francisco choisir Display/Text
//      automatiquement selon la taille. C'est ce qu'on a déjà.
//   2. DM Sans + Instrument Serif via @expo-google-fonts (HandoffFontsProvider).
//      Geist Mono → Menlo en attendant un bundle dédié.
//   3. Échelle ajustée pour matcher le handoff :
//      Hero count 64px, large title 34px, etc.
//
// 10 niveaux. Pas plus.
// ============================================================================

import { Platform, TextStyle } from 'react-native';
import { HANDOFF_FONT_FAMILY } from './handoffFonts';

// ────────────────────────────────────────────────────────────────────────────
// Font families
// ────────────────────────────────────────────────────────────────────────────

const SF_TEXT = Platform.select({
  ios:     undefined,           // system → SF Pro Text/Display automatique
  android: 'sans-serif',
  default: 'System',
});

const SF_MONO = Platform.select({
  ios:     'Menlo',
  android: 'monospace',
  default: 'monospace',
});

/**
 * Noms des fonts du handoff. Pour les utiliser, charger via expo-font au boot :
 *   import { useFonts } from 'expo-font';
 *   useFonts({
 *     'DM Sans':           require('./assets/fonts/DMSans-Regular.ttf'),
 *     'Instrument Serif':  require('./assets/fonts/InstrumentSerif-Italic.ttf'),
 *     'Geist Mono':        require('./assets/fonts/GeistMono-Regular.ttf'),
 *   });
 * Tant que les fichiers ne sont pas embarqués, RN tombera sur le fallback système.
 */
export const FONT_HANDOFF = {
  sans:  'DM Sans',
  serif: 'Instrument Serif',
  mono:  'Geist Mono',
} as const;

// Fallback italique : si Instrument Serif n'est pas chargé, RN ignore le nom
// et utilise la font system italique (Georgia sur iOS donne un bon rendu)
const SERIF_ITALIC_FALLBACK = Platform.select({
  ios:     'Georgia',
  android: 'serif',
  default: 'serif',
});

// ────────────────────────────────────────────────────────────────────────────
// Type scale — 10 niveaux (handoff alignment)
// ────────────────────────────────────────────────────────────────────────────

type SansWeight = '400' | '500' | '600' | '700';

function sansFamily(weight: SansWeight, handoff: boolean): string | undefined {
  if (!handoff) return SF_TEXT;
  switch (weight) {
    case '500': return HANDOFF_FONT_FAMILY.sansMedium;
    case '600': return HANDOFF_FONT_FAMILY.sansSemibold;
    case '700': return HANDOFF_FONT_FAMILY.sansBold;
    default: return HANDOFF_FONT_FAMILY.sansRegular;
  }
}

function sansWeight(weight: SansWeight, handoff: boolean): TextStyle['fontWeight'] {
  return handoff ? undefined : weight;
}

function buildTypography(handoff: boolean) {
  return {
  /** Hero count — chiffre géant today-hero (handoff: 64px) */
  hero: {
    fontFamily: sansFamily('700', handoff),
    fontSize: 64,
    lineHeight: 60,
    fontWeight: sansWeight('700', handoff),
    letterSpacing: -3,
  } as TextStyle,

  /** Display — onboarding hero, paywall */
  display: {
    fontFamily: sansFamily('700', handoff),
    fontSize: 40,
    lineHeight: 44,
    fontWeight: sansWeight('700', handoff),
    letterSpacing: -1.5,
  } as TextStyle,

  /** Large title — greeting "Bonjour Sarah." (handoff: 34px) */
  title1: {
    fontFamily: sansFamily('700', handoff),
    fontSize: 34,
    lineHeight: 36,
    fontWeight: sansWeight('700', handoff),
    letterSpacing: -1.2,
  } as TextStyle,

  /** Title 2 — section, modal title */
  title2: {
    fontFamily: sansFamily('600', handoff),
    fontSize: 22,
    lineHeight: 26,
    fontWeight: sansWeight('600', handoff),
    letterSpacing: -0.4,
  } as TextStyle,

  /** Title 3 — sub-section, screen title (handoff: 17/600/-0.3) */
  title3: {
    fontFamily: sansFamily('600', handoff),
    fontSize: 17,
    lineHeight: 22,
    fontWeight: sansWeight('600', handoff),
    letterSpacing: -0.3,
  } as TextStyle,

  /** Card title — ProductCard name (handoff: 15/600/-0.2) */
  cardTitle: {
    fontFamily: sansFamily('600', handoff),
    fontSize: 15,
    lineHeight: 20,
    fontWeight: sansWeight('600', handoff),
    letterSpacing: -0.2,
  } as TextStyle,

  /** Body — texte courant (handoff: 15/400) */
  body: {
    fontFamily: sansFamily('400', handoff),
    fontSize: 15,
    lineHeight: 22,
    fontWeight: sansWeight('400', handoff),
    letterSpacing: 0,
  } as TextStyle,

  /** Body emphasis — body mis en avant inline (handoff: 16/500) */
  bodyEmphasis: {
    fontFamily: sansFamily('500', handoff),
    fontSize: 16,
    lineHeight: 22,
    fontWeight: sansWeight('500', handoff),
    letterSpacing: -0.1,
  } as TextStyle,

  /** Footnote — meta, helper text (handoff: 13/400) */
  footnote: {
    fontFamily: sansFamily('400', handoff),
    fontSize: 13,
    lineHeight: 18,
    fontWeight: sansWeight('400', handoff),
    letterSpacing: 0,
  } as TextStyle,

  /** Caption — badge (handoff: 11/600 + letter-spacing 0.2) */
  caption: {
    fontFamily: sansFamily('600', handoff),
    fontSize: 11,
    lineHeight: 14,
    fontWeight: sansWeight('600', handoff),
    letterSpacing: 0.2,
  } as TextStyle,

  /** Section label — UPPERCASE mono (handoff: 12/600 + ls 0.6) */
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

  /** Eyebrow — petit label au-dessus d'un hero (handoff: 11/500 + ls 0.8 UPPERCASE) */
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
    fontFamily: handoff ? HANDOFF_FONT_FAMILY.serifItalic : SERIF_ITALIC_FALLBACK,
    fontStyle: handoff ? undefined : 'italic',
    fontWeight: '400',
  } as TextStyle,
} as const;
}

/** Fallback système (avant chargement des Google Fonts). */
export const typography = buildTypography(false);

/** DM Sans + Instrument Serif — activé par ThemeProvider quand fonts prêtes. */
export function getHandoffTypography() {
  return buildTypography(true);
}

export type TypographyToken = keyof typeof typography;
