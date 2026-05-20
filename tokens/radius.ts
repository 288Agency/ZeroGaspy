// ============================================================================
// ZeroGaspy Design System · Border radius
// ============================================================================
// 7 niveaux. Concentriques — quand on niche un élément dans un autre,
// son radius doit être ≈ parent − padding pour rester optiquement régulier.
//
// Mapping iOS :
//   xs (4)    → coin de hairline
//   sm (8)    → tag, mini-chip
//   md (12)   → TextField
//   lg (16)   → Card
//   xl (20)   → Button (primary/secondary)
//   2xl (28)  → Bottom sheet, modal
//   full      → Badges, FAB, avatar
// ============================================================================

export const radius = {
  xs:   4,
  sm:   8,
  md:   12,
  lg:   16,
  xl:   20,
  '2xl': 28,
  full: 999,
} as const;

// Alias sémantiques par composant (préférables dans les composants)
export const componentRadius = {
  input:       radius.md,    // 12
  card:        radius.lg,    // 16
  button:      radius.xl,    // 20
  buttonSm:    radius.md,    // 12 — boutons sm gardent un radius plus serré
  sheet:       radius['2xl'], // 28 — top only
  modal:       radius.xl,    // 20
  badge:       radius.full,
  avatar:      radius.full,
  fab:         radius.full,
  productImg:  radius.md,    // 12 — image dans ProductCard
} as const;

export type RadiusToken = keyof typeof radius;
