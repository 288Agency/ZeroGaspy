import React, { useState, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Constants from 'expo-constants';
import { AD_UNIT_IDS } from '../constants/ads';
import { useAds } from '../contexts/AdContext';
import { COLORS } from '../utils/designSystem';
import logger from '../utils/logger';

// Check if we're in Expo Go (ads module won't work there)
const isExpoGo = Constants.appOwnership === 'expo';

interface AdBannerProps {
  size?: string;
  style?: object;
}

export default function AdBanner({ size, style }: AdBannerProps) {
  const { shouldShowAds, isAdReady, isAdsModuleAvailable } = useAds();
  const [hasError, setHasError] = useState(false);
  const [BannerComponent, setBannerComponent] = useState<any>(null);
  const [bannerSize, setBannerSize] = useState<any>(null);

  // Load ads module dynamically only when not in Expo Go
  useEffect(() => {
    if (!isExpoGo && isAdsModuleAvailable) {
      try {
        const adsModule = require('react-native-google-mobile-ads');
        setBannerComponent(() => adsModule.BannerAd);
        setBannerSize(size || adsModule.BannerAdSize.ANCHORED_ADAPTIVE_BANNER);
      } catch (error) {
        logger.warn('Could not load ads module for banner');
        setHasError(true);
      }
    }
  }, [isAdsModuleAvailable, size]);

  // Ne pas afficher si:
  // - Expo Go (module non disponible)
  // - Pas d'ID banniere
  // - Utilisateur Premium
  // - Module non pret
  // - Erreur
  // - Composant non charge
  if (isExpoGo || !AD_UNIT_IDS.banner || !shouldShowAds || !isAdReady || hasError || !BannerComponent) {
    return null;
  }

  return (
    <View style={[styles.container, style]}>
      <BannerComponent
        unitId={AD_UNIT_IDS.banner!}
        size={bannerSize}
        requestOptions={{
          requestNonPersonalizedAdsOnly: false,
        }}
        onAdLoaded={() => {
          logger.info('Banniere chargee');
        }}
        onAdFailedToLoad={(error: any) => {
          logger.warn('Erreur chargement banniere:', error);
          setHasError(true);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.secondary.cream,
  },
});
