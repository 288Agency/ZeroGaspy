// ============================================================================
// ZeroGaspy Design System · Typography
// ============================================================================
// Brand Bible — 3 familles (assets/fonts, une TTF statique par graisse) :
//   · Clash Grotesk  → display, hero, grands titres        (400/500/600/700)
//   · Switzer        → corps, UI, titres secondaires       (400/500/600/700)
//   · Switzer Italic → accents éditoriaux (« vide. », « soir. »)
//   · Menlo (système) → labels section / eyebrow uppercase
//
// Pas de fichier variable : Android n'en instancie pas les axes, tous les
// poids y rendraient en Regular. La graisse est donc dans le nom de famille.
//
// Fallback système tant que HandoffFontsProvider n'a pas fini le chargement.
// ============================================================================

import { Platform, TextStyle } from 'react-native';
import {
  HANDOFF_FONT_FAMILY,
  handoffDisplayFamily,
  handoffSansFamily,
} from './handoffFonts';

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

const SERIF_ITALIC_FALLBACK = Platform.select({
  ios:     'Georgia',
  android: 'serif',
  default: 'serif',
});

// ────────────────────────────────────────────────────────────────────────────
// Type scale — 10 niveaux
// ────────────────────────────────────────────────────────────────────────────

type SansWeight = '400' | '500' | '600' | '700';

// En mode handoff la graisse est portee par le nom de famille (une police
// statique par graisse, cf. tokens/handoffFonts) : on n'emet donc PAS de
// `fontWeight` en plus, sinon iOS synthetise un faux-gras par-dessus une
// police deja grasse. En fallback systeme, `fontWeight` reste la seule facon
// de choisir la graisse.

function sansStyle(handoff: boolean, weight: SansWeight): TextStyle {
  return handoff
    ? { fontFamily: handoffSansFamily(weight) }
    : { fontFamily: SF_TEXT, fontWeight: weight };
}

function displayStyle(handoff: boolean, weight: SansWeight): TextStyle {
  return handoff
    ? { fontFamily: handoffDisplayFamily(weight) }
    : { fontFamily: SF_TEXT, fontWeight: weight };
}

function buildTypography(handoff: boolean) {
  return {
  /** Hero count — chiffre géant today-hero */
  hero: {
    ...displayStyle(handoff, '700'),
    fontSize: 64,
    lineHeight: 60,
    letterSpacing: -3,
  } as TextStyle,

  /** Display — onboarding hero, paywall */
  display: {
    ...displayStyle(handoff, '700'),
    fontSize: 40,
    lineHeight: 44,
    letterSpacing: -1.5,
  } as TextStyle,

  /** Large title — greeting "Bonjour Sarah." */
  title1: {
    ...displayStyle(handoff, '700'),
    fontSize: 34,
    lineHeight: 36,
    letterSpacing: -1.2,
  } as TextStyle,

  /** Title 2 — section, modal title */
  title2: {
    ...sansStyle(handoff, '600'),
    fontSize: 22,
    lineHeight: 26,
    letterSpacing: -0.4,
  } as TextStyle,

  /** Title 3 — sub-section, screen title */
  title3: {
    ...sansStyle(handoff, '600'),
    fontSize: 17,
    lineHeight: 22,
    letterSpacing: -0.3,
  } as TextStyle,

  /** Card title — ProductCard name */
  cardTitle: {
    ...sansStyle(handoff, '600'),
    fontSize: 15,
    lineHeight: 20,
    letterSpacing: -0.2,
  } as TextStyle,

  /** Body — texte courant */
  body: {
    ...sansStyle(handoff, '400'),
    fontSize: 15,
    lineHeight: 22,
    letterSpacing: 0,
  } as TextStyle,

  /** Body emphasis */
  bodyEmphasis: {
    ...sansStyle(handoff, '500'),
    fontSize: 16,
    lineHeight: 22,
    letterSpacing: -0.1,
  } as TextStyle,

  /** Footnote — meta, helper text */
  footnote: {
    ...sansStyle(handoff, '400'),
    fontSize: 13,
    lineHeight: 18,
    letterSpacing: 0,
  } as TextStyle,

  /** Caption — badge */
  caption: {
    ...sansStyle(handoff, '600'),
    fontSize: 11,
    lineHeight: 14,
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
    ...(handoff ? null : { fontWeight: '400' as const }),
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
