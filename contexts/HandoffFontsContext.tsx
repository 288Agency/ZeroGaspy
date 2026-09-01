import React, { createContext, useContext, ReactNode } from 'react';
import { useFonts } from 'expo-font';
import {
  DMSans_400Regular,
  DMSans_500Medium,
  DMSans_600SemiBold,
  DMSans_700Bold,
} from '@expo-google-fonts/dm-sans';
import { InstrumentSerif_400Regular_Italic } from '@expo-google-fonts/instrument-serif';

const HandoffFontsReadyContext = createContext(false);

export function useHandoffFontsReady(): boolean {
  return useContext(HandoffFontsReadyContext);
}

interface HandoffFontsProviderProps {
  children: ReactNode;
}

/**
 * Charge DM Sans + Instrument Serif (handoff / Brand Bible aligné).
 * Geist Mono reste en Menlo jusqu'à bundling dédié.
 * Ne bloque pas le boot : fallback système puis swap quand chargé.
 */
export function HandoffFontsProvider({ children }: HandoffFontsProviderProps) {
  const [loaded] = useFonts({
    DMSans_400Regular,
    DMSans_500Medium,
    DMSans_600SemiBold,
    DMSans_700Bold,
    InstrumentSerif_400Regular_Italic,
  });

  return (
    <HandoffFontsReadyContext.Provider value={loaded}>
      {children}
    </HandoffFontsReadyContext.Provider>
  );
}
