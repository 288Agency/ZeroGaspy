// ============================================================================
// ZeroGaspy Design System · Colors (handoff port — sage / forest / cream)
// ============================================================================
// Palette dérivée du logo : Z sauge clair (#A8D183) + G vert forêt (#2F6B3F)
// posés sur fond crème (#F4EFE2). Trois familles brutes (Sage / Forest / Cream)
// + InkWarm pour les textes + Signal pour les statuts (tomate / safran / sauge).
//
// L'API SÉMANTIQUE (bg / fg / border / accent / feedback) est identique à
// l'ancienne — les `components/ds/*` consomment via `useTheme().colors.fg.primary`
// etc. et héritent automatiquement de la nouvelle palette sans modification.
//
// Les exports `Ink` et `Sap` sont conservés comme ALIAS de la nouvelle palette
// (rétrocompat) — ne pas utiliser pour du nouveau code, passer par les tokens
// sémantiques ou par Sage/Forest/Cream/InkWarm directement.
// ============================================================================

// ────────────────────────────────────────────────────────────────────────────
// PALETTES BRUTES (cf. handoff tokens.css)
// ────────────────────────────────────────────────────────────────────────────

export const Sage = {
  100: '#EEF6E2',
  200: '#DCEDC1',
  300: '#C2DF9C',
  400: '#A8D183', // Z clair du logo
  500: '#8DBE6B',
  600: '#6FA64F',
} as const;

export const Forest = {
  300: '#6A9A5E',
  400: '#4F8443',
  500: '#3D7A45', // feuille foncée
  600: '#2F6B3F', // G profond — accent principal
  700: '#225230',
  800: '#173B22',
  900: '#0E2517',
} as const;

export const Cream = {
  50:  '#FAF7ED',
  100: '#F4EFE2', // fond logo / canvas app
  200: '#EBE6D8',
  300: '#DCD6C5',
  400: '#B8B2A0',
  500: '#8A8472',
  600: '#6B6657',
} as const;

export const InkWarm = {
  100: '#ECE8DD',
  300: '#B4B1A3',
  500: '#6B7568',
  700: '#2D3A2F',
  900: '#1E2A1F', // texte primaire
  950: '#0F1810',
} as const;

// Statuts — calibrés sur le handoff (urgent tomate / warn safran / ok sauge)
export const Signal = {
  urgent: {
    bg:     '#FBE5DC',
    border: '#F0A085',
    fg:     '#B23A1A',
    solid:  '#D85535',
  },
  warn: {
    bg:     '#FAE9C3',
    border: '#E5C172',
    fg:     '#7A5414',
    solid:  '#C68A1E',
  },
  ok: {
    bg:     Sage[200],
    border: Sage[400],
    fg:     Forest[700],
    solid:  Forest[500],
  },
  info: {
    bg:     '#DCEAF6',
    border: '#A8C5E0',
    fg:     '#1F4A7A',
    solid:  '#2E7AC5',
  },
  reward: {
    bg:     '#F4F3FF',
    border: '#BDB4FE',
    fg:     '#6941C6',
    solid:  '#7F56D9',
  },
} as const;

// ────────────────────────────────────────────────────────────────────────────
// Aliases hérités — pour ne rien casser dans les imports existants
// (`Ink` et `Sap` sont consommés par d'anciens composants ds/*)
// ────────────────────────────────────────────────────────────────────────────

/** Alias rétrocompat : ancien Ink remplacé par InkWarm (teinté légèrement sauge). */
export const Ink = {
  50:  Cream[50],
  100: InkWarm[100],
  200: '#DCD6C5',
  300: InkWarm[300],
  400: Cream[400],
  500: InkWarm[500],
  600: Cream[600],
  700: InkWarm[700],
  800: '#152018',
  900: InkWarm[900],
  950: InkWarm[950],
} as const;

/** Alias rétrocompat : ancien Sap (#1FB87A SaaS) remplacé par Forest (vert logo). */
export const Sap = {
  50:  Sage[100],
  100: Sage[200],
  200: Sage[300],
  300: Sage[400],
  400: Forest[400],
  500: Forest[600], // accent
  600: Forest[700], // pressed
  700: Forest[800],
  800: Forest[900],
  900: '#0A1B11',
  950: '#06110A',
} as const;

// ────────────────────────────────────────────────────────────────────────────
// TOKENS SÉMANTIQUES — LIGHT
// ────────────────────────────────────────────────────────────────────────────

export const lightColors = {
  bg: {
    canvas:   Cream[100],   // fond app
    surface:  Cream[50],    // cartes
    elevated: '#FFFFFF',    // sheets, modals, popovers
    sunken:   Cream[200],   // chips, input filled, skeletons
    overlay:  'rgba(14, 24, 16, 0.45)',
  },

  fg: {
    primary:   InkWarm[900],
    secondary: InkWarm[500],
    tertiary:  Cream[500],
    muted:     Cream[400],
    disabled:  Cream[300],
    inverse:   Cream[50],
    onAccent:  '#FFFFFF',
    link:      Forest[600],
  },

  border: {
    default:  'rgba(30, 42, 31, 0.14)',
    strong:   'rgba(30, 42, 31, 0.22)',
    subtle:   'rgba(30, 42, 31, 0.08)',
    focus:    InkWarm[900],
    accent:   Forest[600],
  },

  accent: {
    default: Forest[600],
    hover:   Forest[700],
    pressed: Forest[700],
    soft:    Sage[200],
    softFg:  Forest[700],
    border:  Sage[400],
  },

  feedback: {
    danger: {
      bg:     Signal.urgent.bg,
      fg:     Signal.urgent.fg,
      border: Signal.urgent.border,
      solid:  Signal.urgent.solid,
      onSolid: '#FFFFFF',
    },
    warning: {
      bg:     Signal.warn.bg,
      fg:     Signal.warn.fg,
      border: Signal.warn.border,
      solid:  Signal.warn.solid,
      onSolid: InkWarm[900],
    },
    success: {
      bg:     Signal.ok.bg,
      fg:     Signal.ok.fg,
      border: Signal.ok.border,
      solid:  Signal.ok.solid,
      onSolid: '#FFFFFF',
    },
    info: {
      bg:     Signal.info.bg,
      fg:     Signal.info.fg,
      border: Signal.info.border,
      solid:  Signal.info.solid,
      onSolid: '#FFFFFF',
    },
    reward: {
      bg:     Signal.reward.bg,
      fg:     Signal.reward.fg,
      border: Signal.reward.border,
      solid:  Signal.reward.solid,
      onSolid: '#FFFFFF',
    },
  },

  shadow: 'rgba(30, 42, 31, 1)', // teinte vert-ink, multipliée par opacity dans shadows.ts
} as const;

// ────────────────────────────────────────────────────────────────────────────
// TOKENS SÉMANTIQUES — DARK (dormant — non exposé par ThemeContext patch local)
// ────────────────────────────────────────────────────────────────────────────

export const darkColors = {
  bg: {
    canvas:   '#0E1A11',
    surface:  '#14221A',
    elevated: '#1B2D22',
    sunken:   '#0A1209',
    overlay:  'rgba(0, 0, 0, 0.60)',
  },

  fg: {
    primary:   Cream[50],
    secondary: Cream[300],
    tertiary:  Cream[400],
    muted:     Cream[500],
    disabled:  InkWarm[700],
    inverse:   InkWarm[900],
    onAccent:  Forest[900],
    link:      Sage[400],
  },

  border: {
    default:  'rgba(244, 239, 226, 0.10)',
    strong:   'rgba(244, 239, 226, 0.18)',
    subtle:   'rgba(244, 239, 226, 0.06)',
    focus:    Cream[50],
    accent:   Sage[400],
  },

  accent: {
    default: Sage[400],
    hover:   Sage[300],
    pressed: Sage[500],
    soft:    'rgba(168, 209, 131, 0.15)',
    softFg:  Sage[300],
    border:  'rgba(168, 209, 131, 0.30)',
  },

  feedback: {
    danger: {
      bg:     'rgba(216, 85, 53, 0.14)',
      fg:     '#F0A085',
      border: 'rgba(216, 85, 53, 0.35)',
      solid:  Signal.urgent.solid,
      onSolid: '#FFFFFF',
    },
    warning: {
      bg:     'rgba(198, 138, 30, 0.14)',
      fg:     '#E5C172',
      border: 'rgba(198, 138, 30, 0.35)',
      solid:  Signal.warn.solid,
      onSolid: InkWarm[950],
    },
    success: {
      bg:     'rgba(61, 122, 69, 0.14)',
      fg:     Sage[300],
      border: 'rgba(61, 122, 69, 0.35)',
      solid:  Signal.ok.solid,
      onSolid: '#FFFFFF',
    },
    info: {
      bg:     'rgba(46, 122, 197, 0.14)',
      fg:     '#A8C5E0',
      border: 'rgba(46, 122, 197, 0.35)',
      solid:  Signal.info.solid,
      onSolid: '#FFFFFF',
    },
    reward: {
      bg:     'rgba(127, 86, 217, 0.14)',
      fg:     '#BDB4FE',
      border: 'rgba(127, 86, 217, 0.35)',
      solid:  Signal.reward.solid,
      onSolid: '#FFFFFF',
    },
  },

  shadow: 'rgba(0, 0, 0, 1)',
} as const;

// ────────────────────────────────────────────────────────────────────────────
// TYPES + HELPER
// ────────────────────────────────────────────────────────────────────────────

export type ColorScheme = 'light' | 'dark';
export type SemanticColors = typeof lightColors;

export const themes: Record<ColorScheme, SemanticColors> = {
  light: lightColors,
  dark:  darkColors as unknown as SemanticColors,
};

export const getColors = (scheme: ColorScheme): SemanticColors => themes[scheme];
