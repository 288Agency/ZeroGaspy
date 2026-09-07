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
 * Charge Switzer + Clash Grotesk depuis assets/fonts, une famille par graisse.
 *
 * Les fichiers variables ne suffisent pas : Android ne sait pas en instancier
 * les axes, donc `fontWeight` y est sans effet et tout rend en Regular. Les
 * noms enregistrés ici sont ceux que tokens/handoffFonts résout par graisse.
 *
 * Ne bloque pas le boot : fallback système puis swap quand chargé.
 */
export function HandoffFontsProvider({ children }: HandoffFontsProviderProps) {
  const [loaded] = useFonts({
    'Switzer-Regular': require('../assets/fonts/Switzer-Regular.ttf'),
    'Switzer-Medium': require('../assets/fonts/Switzer-Medium.ttf'),
    'Switzer-Semibold': require('../assets/fonts/Switzer-Semibold.ttf'),
    'Switzer-Bold': require('../assets/fonts/Switzer-Bold.ttf'),
    'Switzer-Italic': require('../assets/fonts/Switzer-Italic.ttf'),
    'ClashGrotesk-Regular': require('../assets/fonts/ClashGrotesk-Regular.ttf'),
    'ClashGrotesk-Medium': require('../assets/fonts/ClashGrotesk-Medium.ttf'),
    'ClashGrotesk-Semibold': require('../assets/fonts/ClashGrotesk-Semibold.ttf'),
    'ClashGrotesk-Bold': require('../assets/fonts/ClashGrotesk-Bold.ttf'),
  });

  return (
    <HandoffFontsReadyContext.Provider value={loaded}>
      {children}
    </HandoffFontsReadyContext.Provider>
  );
}
