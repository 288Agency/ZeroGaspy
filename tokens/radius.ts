// ============================================================================
// ZeroGaspy Design System · Border radius (handoff port)
// ============================================================================
// Échelle alignée sur le handoff (cf. README §4.3) :
//   xs (6)   → coin de hairline / pcard-img
//   sm (10)  → tag, mini-chip, input cards
//   md (14)  → Card produit, bento stat, space card
//   lg (20)  → today-hero, cook-hero, modal
//   xl (28)  → Bottom sheet (top only)
//   full     → Badge, FAB, avatar, button
//
// `2xl` est conservé comme alias de `xl` pour rétrocompat avec les usages
// existants (`radius['2xl']` dans BottomSheet.tsx).
// ============================================================================

export const radius = {
  xs:    6,
  sm:    10,
  md:    14,
  lg:    20,
  xl:    28,
  '2xl': 28, // alias rétrocompat de xl
  full:  999,
} as const;

// Alias sémantiques par composant
export const componentRadius = {
  input:       radius.md,    // 14 — input (handoff utilise r-md)
  card:        radius.md,    // 14 — pcard, .card, .space, .bento .stat
  button:      radius.full,  // 999 — handoff: tous les .btn sont en pill
  buttonSm:    radius.full,  // 999 — pareil
  sheet:       radius.xl,    // 28 — top only
  modal:       radius.lg,    // 20
  badge:       radius.full,
  avatar:      radius.full,
  fab:         radius.full,
  productImg:  radius.sm,    // 10 — image dans ProductCard (handoff: r-sm)
  hero:        radius.lg,    // 20 — today-hero, cook-hero
} as const;

export type RadiusToken = keyof typeof radius;
