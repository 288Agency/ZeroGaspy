import React, { createContext, useContext, ReactNode } from 'react';
import {
  COLORS,
  GRADIENTS,
  CATEGORY_COLORS,
  EXPIRATION_COLORS,
} from '../utils/designSystem';

interface ThemeContextType {
  colors: typeof COLORS;
  gradients: typeof GRADIENTS;
  categoryColors: typeof CATEGORY_COLORS;
  expirationColors: typeof EXPIRATION_COLORS;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
  children: ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  return (
    <ThemeContext.Provider value={{ colors: COLORS, gradients: GRADIENTS, categoryColors: CATEGORY_COLORS, expirationColors: EXPIRATION_COLORS }}>
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
