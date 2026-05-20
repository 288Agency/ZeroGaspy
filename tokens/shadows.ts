// ============================================================================
// ZeroGaspy Design System · Elevation / Shadows
// ============================================================================
// 5 niveaux + focus ring. Shadows NEUTRES (base Ink/950, pas teintées vert).
// On a retiré les "colored" et "glow" du DS actuel — trop décoratifs.
//
// React Native quirk : iOS prend shadowColor + offset + opacity + radius.
// Android n'a que `elevation`. On exporte les deux pour cross-platform.
// ============================================================================

import { Platform, ViewStyle } from 'react-native';

type Shadow = ViewStyle;

const ios = (
  offsetY: number,
  radius: number,
  opacity: number,
): ViewStyle => ({
  shadowColor: '#0E0D0B',
  shadowOffset: { width: 0, height: offsetY },
  shadowRadius: radius,
  shadowOpacity: opacity,
});

const android = (elevation: number): ViewStyle => ({ elevation });

const shadow = (
  offsetY: number,
  radius: number,
  opacity: number,
  elevation: number,
): Shadow =>
  Platform.select({
    ios:     ios(offsetY, radius, opacity),
    android: android(elevation),
    default: ios(offsetY, radius, opacity),
  })!;

// ────────────────────────────────────────────────────────────────────────────
// 5 niveaux
// ────────────────────────────────────────────────────────────────────────────

export const elevation = {
  /** Pressed / inset — quasi-flat, indique un état enfoncé */
  1: shadow(1, 2, 0.06, 1),
  /** Card default — repos */
  2: shadow(2, 6, 0.06, 2),
  /** Card hover / button raised */
  3: shadow(6, 16, 0.08, 4),
  /** Bottom sheet, modal */
  4: shadow(12, 32, 0.10, 8),
  /** Popover, alert, FAB max */
  5: shadow(24, 64, 0.14, 16),
} as const;

// ────────────────────────────────────────────────────────────────────────────
// Focus ring — appliqué via borderColor sur le composant focusable.
// (RN ne supporte pas box-shadow, on simule via border 2px Ink/200 → Ink/900)
// ────────────────────────────────────────────────────────────────────────────

export const focusRing = {
  borderWidth: 2,
  borderColor: '#1C1B17', // Ink/900 — à override avec colors.border.focus selon le scheme
} as const;

export type ElevationToken = keyof typeof elevation;
