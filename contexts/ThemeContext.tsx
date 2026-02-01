import React, { createContext, useContext, ReactNode } from 'react';
import {
  COLORS,
  GRADIENTS,
  CATEGORY_COLORS,
  EXPIRATION_COLORS,
} from '../utils/designSystem';

export type ThemePreference = 'light';

interface ThemeContextType {
  theme: ThemePreference;
  isDark: boolean;
  colors: typeof COLORS;
  gradients: typeof GRADIENTS;
  categoryColors: typeof CATEGORY_COLORS;
  expirationColors: typeof EXPIRATION_COLORS;
  setTheme: (theme: ThemePreference) => Promise<void>;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
  children: ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  // Mode clair uniquement - pas de dark mode
  const isDark = false;
  const theme: ThemePreference = 'light';

  const setTheme = async (_newTheme: ThemePreference) => {
    // Dark mode désactivé - ne fait rien
  };

  return (
    <ThemeContext.Provider value={{ theme, isDark, colors: COLORS, gradients: GRADIENTS, categoryColors: CATEGORY_COLORS, expirationColors: EXPIRATION_COLORS, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
