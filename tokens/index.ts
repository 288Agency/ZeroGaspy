// ============================================================================
// ZeroGaspy Design System · Tokens index
// ============================================================================
// Single import path pour tous les tokens :
//   import { tokens } from '@/tokens';
//   import { Ink, Sap, typography, space, elevation, radius } from '@/tokens';
// ============================================================================

export {
  Ink,
  Sap,
  Signal,
  lightColors,
  darkColors,
  themes,
  getColors,
  type ColorScheme,
  type SemanticColors,
} from './colors';

export {
  typography,
  type TypographyToken,
} from './typography';

export {
  space,
  layout,
  type SpaceToken,
} from './spacing';

export {
  elevation,
  focusRing,
  type ElevationToken,
} from './shadows';

export {
  radius,
  componentRadius,
  type RadiusToken,
} from './radius';

// Convenience grouping (light scheme par défaut)
import { lightColors } from './colors';
import { typography } from './typography';
import { space, layout } from './spacing';
import { elevation } from './shadows';
import { radius, componentRadius } from './radius';

export const tokens = {
  colors: lightColors,
  typography,
  space,
  layout,
  elevation,
  radius,
  componentRadius,
} as const;
