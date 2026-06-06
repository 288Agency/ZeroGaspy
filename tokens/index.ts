// ============================================================================
// ZeroGaspy Design System · Tokens index
// ============================================================================
// Single import path pour tous les tokens :
//   import { tokens } from '@/tokens';
//   import { Sage, Forest, Cream, typography, space, elevation, glow, radius } from '@/tokens';
// ============================================================================

export {
  Sage,
  Forest,
  Cream,
  InkWarm,
  Signal,
  Ink,        // alias rétrocompat
  Sap,        // alias rétrocompat
  lightColors,
  darkColors,
  themes,
  getColors,
  type ColorScheme,
  type SemanticColors,
} from './colors';

export {
  typography,
  FONT_HANDOFF,
  type TypographyToken,
} from './typography';

export {
  space,
  layout,
  type SpaceToken,
} from './spacing';

export {
  elevation,
  glow,
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
import { elevation, glow } from './shadows';
import { radius, componentRadius } from './radius';

export const tokens = {
  colors: lightColors,
  typography,
  space,
  layout,
  elevation,
  glow,
  radius,
  componentRadius,
} as const;
