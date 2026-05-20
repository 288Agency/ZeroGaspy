// ============================================================================
// ZeroGaspy Design System · Colors
// ============================================================================
// 3 familles :
//   · Ink     — neutres premium (base de toute UI, partagée light/dark)
//   · Sap     — vert signature, accent unique (#1FB87A)
//   · Signal  — feedback states (danger / warning / success / info / reward)
//
// Les tokens SÉMANTIQUES (bg, fg, border, accent…) sont la SOURCE DE VÉRITÉ
// pour les composants. Ne référence JAMAIS Ink/500 ou Sap/600 directement —
// passe par `colors.fg.secondary` ou `colors.accent.default`.
// ============================================================================

// ────────────────────────────────────────────────────────────────────────────
// PALETTES BRUTES
// ────────────────────────────────────────────────────────────────────────────

export const Ink = {
  50:  '#FAFAF7',
  100: '#F2F1ED',
  200: '#E5E4DE',
  300: '#CCCBC3',
  400: '#A3A29A',
  500: '#787870',
  600: '#54534C',
  700: '#3A3934',
  800: '#26251F',
  900: '#1C1B17',
  950: '#0E0D0B',
} as const;

export const Sap = {
  50:  '#ECFDF3',
  100: '#D1FADF',
  200: '#A6F4C5',
  300: '#6CE9A6',
  400: '#32D583',
  500: '#1FB87A', // ← signature
  600: '#079455',
  700: '#067647',
  800: '#085D3A',
  900: '#074D31',
  950: '#053824',
} as const;

export const Signal = {
  // Danger — expiré, destructive
  danger: {
    50:  '#FEF3F2',
    100: '#FEE4E2',
    300: '#FDA29B',
    500: '#D92D20',
    600: '#B42318',
    700: '#912018',
  },
  // Warning — J-3
  warning: {
    50:  '#FFFAEB',
    100: '#FEF0C7',
    300: '#FEC84B',
    500: '#F79009',
    600: '#DC6803',
    700: '#B54708',
  },
  // Success — fresh, ok (alias de Sap mais exposé sémantiquement)
  success: {
    50:  '#ECFDF3',
    100: '#D1FADF',
    300: '#6CE9A6',
    500: '#1FB87A',
    600: '#079455',
    700: '#067647',
  },
  // Info — premium, état neutre informatif
  info: {
    50:  '#EFF8FF',
    100: '#D1E9FF',
    300: '#84CAFF',
    500: '#2E90FA',
    600: '#1570EF',
    700: '#175CD3',
  },
  // Reward — achievement, gamification
  reward: {
    50:  '#F4F3FF',
    100: '#EBE9FE',
    300: '#BDB4FE',
    500: '#9E77ED',
    600: '#7F56D9',
    700: '#6941C6',
  },
} as const;

// ────────────────────────────────────────────────────────────────────────────
// TOKENS SÉMANTIQUES — LIGHT
// ────────────────────────────────────────────────────────────────────────────

export const lightColors = {
  // Backgrounds
  bg: {
    canvas:   Ink[50],     // body / screen background
    surface:  '#FFFFFF',   // cards, sheets, modals
    elevated: '#FFFFFF',   // popovers, FAB (combinée avec elev-3)
    sunken:   Ink[100],    // chips, input filled, skeletons
    overlay:  'rgba(14, 13, 11, 0.40)', // backdrop sheet / modal
  },

  // Foregrounds
  fg: {
    primary:   Ink[900],
    secondary: Ink[600],
    tertiary:  Ink[500],
    muted:     Ink[400],
    disabled:  Ink[300],
    inverse:   Ink[50],
    onAccent:  '#FFFFFF',
    link:      Sap[600],
  },

  // Borders & dividers
  border: {
    default:  Ink[200],
    strong:   Ink[300],
    subtle:   Ink[100],
    focus:    Ink[900],
    accent:   Sap[500],
  },

  // Accent
  accent: {
    default: Sap[500],
    hover:   Sap[600],
    pressed: Sap[700],
    soft:    Sap[50],
    softFg:  Sap[700],
    border:  Sap[200],
  },

  // Sémantique feedback
  feedback: {
    danger: {
      bg:     Signal.danger[50],
      fg:     Signal.danger[700],
      border: Signal.danger[300],
      solid:  Signal.danger[500],
      onSolid: '#FFFFFF',
    },
    warning: {
      bg:     Signal.warning[50],
      fg:     Signal.warning[700],
      border: Signal.warning[300],
      solid:  Signal.warning[500],
      onSolid: Ink[900], // sur jaune/orange → texte sombre
    },
    success: {
      bg:     Signal.success[50],
      fg:     Signal.success[700],
      border: Signal.success[300],
      solid:  Signal.success[500],
      onSolid: '#FFFFFF',
    },
    info: {
      bg:     Signal.info[50],
      fg:     Signal.info[700],
      border: Signal.info[300],
      solid:  Signal.info[500],
      onSolid: '#FFFFFF',
    },
    reward: {
      bg:     Signal.reward[50],
      fg:     Signal.reward[700],
      border: Signal.reward[300],
      solid:  Signal.reward[500],
      onSolid: '#FFFFFF',
    },
  },

  // Shadows base color
  shadow: 'rgba(14, 13, 11, 1)', // multiplié par opacity dans shadows.ts
} as const;

// ────────────────────────────────────────────────────────────────────────────
// TOKENS SÉMANTIQUES — DARK
// ────────────────────────────────────────────────────────────────────────────

export const darkColors = {
  bg: {
    canvas:   Ink[950],
    surface:  Ink[900],
    elevated: Ink[800],
    sunken:   Ink[800],
    overlay:  'rgba(0, 0, 0, 0.60)',
  },

  fg: {
    primary:   Ink[50],
    secondary: Ink[300],
    tertiary:  Ink[400],
    muted:     Ink[500],
    disabled:  Ink[600],
    inverse:   Ink[900],
    onAccent:  Ink[950],
    link:      Sap[400],
  },

  border: {
    default:  Ink[800],
    strong:   Ink[700],
    subtle:   Ink[800],
    focus:    Ink[50],
    accent:   Sap[400],
  },

  accent: {
    default: Sap[400],
    hover:   Sap[300],
    pressed: Sap[500],
    soft:    'rgba(31, 184, 122, 0.12)',
    softFg:  Sap[300],
    border:  'rgba(31, 184, 122, 0.30)',
  },

  feedback: {
    danger: {
      bg:     'rgba(217, 45, 32, 0.12)',
      fg:     Signal.danger[300],
      border: 'rgba(217, 45, 32, 0.35)',
      solid:  Signal.danger[500],
      onSolid: '#FFFFFF',
    },
    warning: {
      bg:     'rgba(247, 144, 9, 0.12)',
      fg:     Signal.warning[300],
      border: 'rgba(247, 144, 9, 0.35)',
      solid:  Signal.warning[500],
      onSolid: Ink[950],
    },
    success: {
      bg:     'rgba(31, 184, 122, 0.12)',
      fg:     Sap[300],
      border: 'rgba(31, 184, 122, 0.35)',
      solid:  Signal.success[500],
      onSolid: '#FFFFFF',
    },
    info: {
      bg:     'rgba(46, 144, 250, 0.12)',
      fg:     Signal.info[300],
      border: 'rgba(46, 144, 250, 0.35)',
      solid:  Signal.info[500],
      onSolid: '#FFFFFF',
    },
    reward: {
      bg:     'rgba(158, 119, 237, 0.14)',
      fg:     Signal.reward[300],
      border: 'rgba(158, 119, 237, 0.35)',
      solid:  Signal.reward[500],
      onSolid: '#FFFFFF',
    },
  },

  shadow: 'rgba(0, 0, 0, 1)',
} as const;

// ────────────────────────────────────────────────────────────────────────────
// TYPES
// ────────────────────────────────────────────────────────────────────────────

export type ColorScheme = 'light' | 'dark';
export type SemanticColors = typeof lightColors;

export const themes: Record<ColorScheme, SemanticColors> = {
  light: lightColors,
  dark:  darkColors as unknown as SemanticColors,
};

/**
 * Helper : récupère le set de tokens selon le scheme actif.
 * Usage dans un composant via ThemeContext :
 *   const colors = useThemeColors();  // → returns lightColors or darkColors
 */
export const getColors = (scheme: ColorScheme): SemanticColors =>
  themes[scheme];
