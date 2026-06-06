// ============================================================================
// ZeroGaspy Design System · Elevation / Shadows (handoff port)
// ============================================================================
// 5 niveaux + glow accent + focus ring.
//
// Calibration handoff (cf. README §4.4) :
//   shadow-1 → elevation[2]  cartes au repos
//   shadow-2 → elevation[3]  cartes élevées
//   shadow-3 → elevation[4]  sheets, toasts
//   shadow-glow → glow       hero today-hero, FAB
//
// Base de teinte = vert-ink (rgba(30,42,31, X)) plutôt que noir pur, pour
// rester cohérent avec le canvas crème.
//
// React Native quirk : iOS lit shadowColor + offset + opacity + radius.
// Android n'a que `elevation` (numérique).
// ============================================================================

import { Platform, ViewStyle } from 'react-native';

type Shadow = ViewStyle;

const SHADOW_INK = '#1E2A1F'; // teinte vert-forêt foncé (vs noir pur)
const SHADOW_GLOW_GREEN = '#3D7A45'; // forest-500 pour le glow accent

const ios = (
  offsetY: number,
  radius: number,
  opacity: number,
  color: string = SHADOW_INK,
): ViewStyle => ({
  shadowColor: color,
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
  color?: string,
): Shadow =>
  Platform.select({
    ios:     ios(offsetY, radius, opacity, color),
    android: android(elevation),
    default: ios(offsetY, radius, opacity, color),
  })!;

// ────────────────────────────────────────────────────────────────────────────
// 5 niveaux
// ────────────────────────────────────────────────────────────────────────────

export const elevation = {
  /** Pressed / inset — quasi-flat */
  1: shadow(1, 1, 0.03, 1),
  /** Card default (handoff shadow-1) */
  2: shadow(1, 2, 0.04, 2),
  /** Card élevée (handoff shadow-2) */
  3: shadow(2, 8, 0.06, 4),
  /** Bottom sheet, toast (handoff shadow-3) */
  4: shadow(8, 24, 0.08, 8),
  /** Popover, alert, FAB max */
  5: shadow(16, 48, 0.12, 16),
} as const;

// ────────────────────────────────────────────────────────────────────────────
// Glow — uniquement pour today-hero, cook-hero, FAB accent
// (équivalent handoff `--shadow-glow`)
// ────────────────────────────────────────────────────────────────────────────

export const glow: ViewStyle = Platform.select({
  ios: {
    shadowColor:  SHADOW_GLOW_GREEN,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 16,
    shadowOpacity: 0.20,
  },
  android: { elevation: 12 },
  default: {
    shadowColor:  SHADOW_GLOW_GREEN,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 16,
    shadowOpacity: 0.20,
  },
})!;

// ────────────────────────────────────────────────────────────────────────────
// Focus ring — appliqué via borderColor sur le composant focusable
// ────────────────────────────────────────────────────────────────────────────

export const focusRing = {
  borderWidth: 2,
  borderColor: '#1E2A1F', // ink/900 — override avec colors.border.focus
} as const;

export type ElevationToken = keyof typeof elevation;
