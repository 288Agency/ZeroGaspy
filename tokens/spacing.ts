// ============================================================================
// ZeroGaspy Design System · Spacing
// ============================================================================
// 4pt grid strict. Tous les multiples de 4.
// Indexés en nombre de "ticks" de 4pt : space[4] === 16pt.
// Plus lisible que xs/sm/md/lg quand on bosse à 3+ niveaux dans une StyleSheet.
//
// Règles :
//   · screen-padding-h : 20pt (space[5])
//   · card-padding     : 16pt (space[4])
//   · card-gap         : 12pt (space[3]) entre cards d'une liste
//   · section-gap      : 32pt (space[8]) entre sections
//   · hit-target-min   : 44pt (iOS HIG)
// ============================================================================

export const space = {
  0:  0,
  1:  4,
  2:  8,
  3:  12,
  4:  16,
  5:  20,
  6:  24,
  8:  32,
  10: 40,
  12: 48,
  16: 64,
  20: 80,
} as const;

// Alias sémantiques pour layout-level patterns (à utiliser dans les écrans,
// pas dans les composants atomiques).
export const layout = {
  screenPaddingH: space[5],   // 20 — gutter horizontal écran
  screenPaddingV: space[4],   // 16
  cardPadding:    space[4],   // 16
  cardGap:        space[3],   // 12
  sectionGap:     space[8],   // 32
  groupGap:       space[6],   // 24
  hitTarget:      44,         // iOS HIG min, non multiple de 4 by design
} as const;

export type SpaceToken = keyof typeof space;
