import React, { createContext, useContext, ReactNode } from 'react';
import { useFonts } from 'expo-font';

const HandoffFontsReadyContext = createContext(false);

export function useHandoffFontsReady(): boolean {
  return useContext(HandoffFontsReadyContext);
}

interface HandoffFontsProviderProps {
  children: ReactNode;
}

/**
 * Charge Switzer (variable) + Clash Grotesk (variable) depuis assets/fonts.
 * Ne bloque pas le boot : fallback système puis swap quand chargé.
 */
export function HandoffFontsProvider({ children }: HandoffFontsProviderProps) {
  const [loaded] = useFonts({
    Switzer: require('../assets/fonts/Switzer-Variable.ttf'),
    'Switzer-Italic': require('../assets/fonts/Switzer-VariableItalic.ttf'),
    ClashGrotesk: require('../assets/fonts/ClashGrotesk-Variable.ttf'),
  });

  return (
    <HandoffFontsReadyContext.Provider value={loaded}>
      {children}
    </HandoffFontsReadyContext.Provider>
  );
}
