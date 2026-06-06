// ============================================================================
// ZeroGaspy Design System · ThemeContext (v2)
// ============================================================================
// Patch local : scheme forcé en 'light'. Le toggle dark mode n'est pas exposé.
// Les exports darkColors restent disponibles dans tokens/colors.ts pour usage
// futur si on réactive le dark mode.
// ============================================================================

import React, { createContext, useContext, useMemo, ReactNode } from 'react';

import {
  getColors,
  typography,
  space,
  layout,
  elevation,
  glow,
  radius,
  componentRadius,
  type ColorScheme,
  type SemanticColors,
} from '@/tokens';

interface ThemeContextValue {
  scheme: ColorScheme;
  setSchemeOverride: (s: ColorScheme | null) => void;
  colors: SemanticColors;
  typography: typeof typography;
  space: typeof space;
  layout: typeof layout;
  elevation: typeof elevation;
  glow: typeof glow;
  radius: typeof radius;
  componentRadius: typeof componentRadius;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

interface ThemeProviderProps {
  children: ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const value = useMemo<ThemeContextValue>(
    () => ({
      scheme: 'light',
      setSchemeOverride: () => {},
      colors: getColors('light'),
      typography,
      space,
      layout,
      elevation,
      glow,
      radius,
      componentRadius,
    }),
    [],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within a ThemeProvider');
  return ctx;
}

export function useColors(): SemanticColors {
  return useTheme().colors;
}

export function useColorScheme(): ColorScheme {
  return useTheme().scheme;
}
