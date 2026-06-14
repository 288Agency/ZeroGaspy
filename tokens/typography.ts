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
//   2. On AJOUTE des constantes `FONT_SANS_HANDOFF`, `FONT_SERIF`, `FONT_MONO`
//      qui pointent vers les noms Google Fonts. Pour la fidélité 100% au
//      handoff, embarquer ces 3 familles via `expo-font` au boot (TODO).
//      En attendant, fallback sur Georgia italic / Menlo / système.
//   3. Échelle ajustée pour matcher le handoff :
//      Hero count 64px, large title 34px, etc.
//
// 10 niveaux. Pas plus.
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

export const typography = {
  /** Hero count — chiffre géant today-hero (handoff: 64px) */
  hero: {
    fontFamily: SF_TEXT,
    fontSize: 64,
    lineHeight: 60,
    fontWeight: '700',
    letterSpacing: -3,
  } as TextStyle,

  /** Display — onboarding hero, paywall */
  display: {
    fontFamily: SF_TEXT,
    fontSize: 40,
    lineHeight: 44,
    fontWeight: '700',
    letterSpacing: -1.5,
  } as TextStyle,

  /** Large title — greeting "Bonjour Sarah." (handoff: 34px) */
  title1: {
    fontFamily: SF_TEXT,
    fontSize: 34,
    lineHeight: 36,
    fontWeight: '700',
    letterSpacing: -1.2,
  } as TextStyle,

  /** Title 2 — section, modal title */
  title2: {
    fontFamily: SF_TEXT,
    fontSize: 22,
    lineHeight: 26,
    fontWeight: '600',
    letterSpacing: -0.4,
  } as TextStyle,

  /** Title 3 — sub-section, screen title (handoff: 17/600/-0.3) */
  title3: {
    fontFamily: SF_TEXT,
    fontSize: 17,
    lineHeight: 22,
    fontWeight: '600',
    letterSpacing: -0.3,
  } as TextStyle,

  /** Card title — ProductCard name (handoff: 15/600/-0.2) */
  cardTitle: {
    fontFamily: SF_TEXT,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '600',
    letterSpacing: -0.2,
  } as TextStyle,

  /** Body — texte courant (handoff: 15/400) */
  body: {
    fontFamily: SF_TEXT,
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '400',
    letterSpacing: 0,
  } as TextStyle,

  /** Body emphasis — body mis en avant inline (handoff: 16/500) */
  bodyEmphasis: {
    fontFamily: SF_TEXT,
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '500',
    letterSpacing: -0.1,
  } as TextStyle,

  /** Footnote — meta, helper text (handoff: 13/400) */
  footnote: {
    fontFamily: SF_TEXT,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '400',
    letterSpacing: 0,
  } as TextStyle,

  /** Caption — badge (handoff: 11/600 + letter-spacing 0.2) */
  caption: {
    fontFamily: SF_TEXT,
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '600',
    letterSpacing: 0.2,
  } as TextStyle,

  /** Section label — UPPERCASE mono (handoff: 12/600 + ls 0.6) */
  sectionLabel: {
    fontFamily: SF_MONO, // bascule Geist Mono une fois chargée
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
    fontFamily: SERIF_ITALIC_FALLBACK, // bascule Instrument Serif une fois chargée
    fontStyle: 'italic',
    fontWeight: '400',
  } as TextStyle,
} as const;

export type TypographyToken = keyof typeof typography;
