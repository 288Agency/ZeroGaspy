/**
 * Noms expo-font — Brand Bible (Switzer + Clash Grotesk).
 *
 * Une famille par graisse, et non une seule famille variable.
 * React Native Android ne sait pas instancier les axes d'une police variable :
 * `fontWeight` y est ignoré pour une famille custom et tous les poids rendent
 * la graisse par défaut. On encode donc la graisse dans le nom de famille, ce
 * qui donne le même rendu sur les deux plateformes.
 */

export type HandoffWeight = '400' | '500' | '600' | '700';

export const HANDOFF_FONT_FAMILY = {
  /** Corps, UI, titres secondaires */
  sans: 'Switzer-Regular',
  sansMedium: 'Switzer-Medium',
  sansSemibold: 'Switzer-Semibold',
  sansBold: 'Switzer-Bold',
  /** Accents éditoriaux italiques (« vide. », « soir. ») */
  sansItalic: 'Switzer-Italic',
  /** Display — hero, grands titres */
  display: 'ClashGrotesk-Regular',
  displayMedium: 'ClashGrotesk-Medium',
  displaySemibold: 'ClashGrotesk-Semibold',
  displayBold: 'ClashGrotesk-Bold',
} as const;

const SANS_BY_WEIGHT: Record<HandoffWeight, string> = {
  '400': HANDOFF_FONT_FAMILY.sans,
  '500': HANDOFF_FONT_FAMILY.sansMedium,
  '600': HANDOFF_FONT_FAMILY.sansSemibold,
  '700': HANDOFF_FONT_FAMILY.sansBold,
};

const DISPLAY_BY_WEIGHT: Record<HandoffWeight, string> = {
  '400': HANDOFF_FONT_FAMILY.display,
  '500': HANDOFF_FONT_FAMILY.displayMedium,
  '600': HANDOFF_FONT_FAMILY.displaySemibold,
  '700': HANDOFF_FONT_FAMILY.displayBold,
};

export function handoffSansFamily(weight: HandoffWeight): string {
  return SANS_BY_WEIGHT[weight];
}

export function handoffDisplayFamily(weight: HandoffWeight): string {
  return DISPLAY_BY_WEIGHT[weight];
}
