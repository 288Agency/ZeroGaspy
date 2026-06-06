// ============================================================================
// ZeroGaspy Design System · Spacing (handoff port)
// ============================================================================
// 4pt grid pour les niveaux atomiques. `layout.screenPaddingH` cale sur la
// valeur handoff (18px) qui n'est pas multiple de 4 — choix éditorial pour
// gagner ~2px de respiration sans repenser la grid.
//
// Règles (handoff §4.5) :
//   · screen-padding-h : 18pt           (handoff)
//   · card-padding     : 12–14pt        (handoff: pcard 12, .card 14)
//   · card-gap         : 8pt            (entre cards d'une liste)
//   · section-gap      : 22pt           (section-head margin-top)
//   · bento-gap        : 10pt           (grille bento)
//   · hit-target-min   : 44pt           (iOS HIG)
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

// Alias sémantiques pour layout-level patterns
export const layout = {
  screenPaddingH: 18,         // handoff
  screenPaddingV: space[2],   // 8 — handoff .screen-body padding 8 top
  cardPadding:    space[3],   // 12 — handoff .pcard
  cardPaddingLg:  14,         // .card, .bento .stat, .space (handoff: 14)
  cardGap:        space[2],   // 8 — entre product cards
  bentoGap:       10,         // grille bento (handoff: 10)
  sectionGap:     22,         // section-head margin-top (handoff)
  groupGap:       space[6],   // 24
  hitTarget:      44,         // iOS HIG
  quickAction:    38,         // hit target actions inline ProductCard (handoff)
} as const;

export type SpaceToken = keyof typeof space;
