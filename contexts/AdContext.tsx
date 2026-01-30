import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import Constants from 'expo-constants';
import { AD_UNIT_IDS, AD_CONFIG } from '../constants/ads';
import { useSubscription } from './SubscriptionContext';
import { useConsent } from './ConsentContext';
import logger from '../utils/logger';

// Check if we're in Expo Go (ads module won't work there)
const isExpoGo = Constants.appOwnership === 'expo';

interface AdContextType {
  isAdReady: boolean;
  showInterstitial: () => Promise<boolean>;
  incrementActionCount: () => void;
  shouldShowAds: boolean;
  isAdsModuleAvailable: boolean;
}

const AdContext = createContext<AdContextType>({
  isAdReady: false,
  showInterstitial: async () => false,
  incrementActionCount: () => {},
  shouldShowAds: true,
  isAdsModuleAvailable: false,
});

export function AdProvider({ children }: { children: React.ReactNode }) {
  const { isPremium } = useSubscription();
  const { isInitialized: consentInitialized, canShowPersonalizedAds } = useConsent();
  const [isInitialized, setIsInitialized] = useState(false);
  const [isInterstitialReady, setIsInterstitialReady] = useState(false);
  const [actionCount, setActionCount] = useState(0);
  const lastInterstitialTime = useRef<number>(0);
  const interstitialRef = useRef<any>(null);
  const adsModuleRef = useRef<any>(null);

  // Les utilisateurs Premium ne voient pas de pubs
  const shouldShowAds = AD_CONFIG.showOnlyForFreeUsers ? !isPremium : true;
  const isAdsModuleAvailable = !isExpoGo;

  // Initialiser le SDK AdMob APRES que le consentement soit initialise
  useEffect(() => {
    const initializeAds = async () => {
      if (isExpoGo) {
        logger.info('Running in Expo Go - ads disabled');
        return;
      }

      // Attendre que le consentement soit initialise
      if (!consentInitialized) {
        logger.info('En attente de l\'initialisation du consentement...');
        return;
      }

      try {
        // Dynamic require only when not in Expo Go
        const adsModule = require('react-native-google-mobile-ads');
        adsModuleRef.current = adsModule;

        const mobileAds = adsModule.default;
        const { MaxAdContentRating } = adsModule;

        // Configuration du SDK avec le statut de consentement
        await mobileAds().setRequestConfiguration({
          maxAdContentRating: MaxAdContentRating.G,
          tagForChildDirectedTreatment: false,
          tagForUnderAgeOfConsent: false,
        });

        // Initialiser le SDK
        await mobileAds().initialize();
        setIsInitialized(true);

        logger.info('AdMob SDK initialise avec succes');
        logger.info(`Mode publicites: ${canShowPersonalizedAds ? 'personnalisees' : 'non-personnalisees'}`);
      } catch (error) {
        logger.error('Erreur initialisation AdMob:', error);
      }
    };

    if (shouldShowAds && consentInitialized) {
      initializeAds();
    }
  }, [shouldShowAds, consentInitialized, canShowPersonalizedAds]);

  // Charger l'interstitiel
  const loadInterstitial = useCallback(() => {
    if (!shouldShowAds || !isInitialized || isExpoGo || !adsModuleRef.current) return;

    try {
      const { InterstitialAd, AdEventType } = adsModuleRef.current;

      const interstitial = InterstitialAd.createForAdRequest(AD_UNIT_IDS.interstitial!, {
        // Utiliser le consentement pour les pubs personnalisees
        requestNonPersonalizedAdsOnly: !canShowPersonalizedAds,
      });

      interstitial.addAdEventListener(AdEventType.LOADED, () => {
        setIsInterstitialReady(true);
        logger.info('Interstitiel charge');
      });

      interstitial.addAdEventListener(AdEventType.CLOSED, () => {
        setIsInterstitialReady(false);
        // Recharger un nouvel interstitiel
        loadInterstitial();
      });

      interstitial.addAdEventListener(AdEventType.ERROR, (error: any) => {
        logger.warn('Erreur chargement interstitiel:', error);
        setIsInterstitialReady(false);
      });

      interstitial.load();
      interstitialRef.current = interstitial;
    } catch (error) {
      logger.error('Erreur creation interstitiel:', error);
    }
  }, [shouldShowAds, isInitialized, canShowPersonalizedAds]);

  // Charger l'interstitiel quand le SDK est pret
  useEffect(() => {
    if (isInitialized && shouldShowAds) {
      loadInterstitial();
    }
  }, [isInitialized, shouldShowAds, loadInterstitial]);

  // Afficher l'interstitiel
  const showInterstitial = useCallback(async (): Promise<boolean> => {
    if (!shouldShowAds || isExpoGo) return false;

    // Verifier le cooldown
    const now = Date.now();
    if (now - lastInterstitialTime.current < AD_CONFIG.interstitialCooldown) {
      logger.info('Interstitiel en cooldown');
      return false;
    }

    // Verifier si l'interstitiel est pret
    if (!isInterstitialReady || !interstitialRef.current) {
      logger.info('Interstitiel non pret');
      return false;
    }

    try {
      await interstitialRef.current.show();
      lastInterstitialTime.current = now;
      setActionCount(0);
      return true;
    } catch (error) {
      logger.error('Erreur affichage interstitiel:', error);
      return false;
    }
  }, [shouldShowAds, isInterstitialReady]);

  // Incrementer le compteur d'actions et afficher l'interstitiel si necessaire
  const incrementActionCount = useCallback(() => {
    if (!shouldShowAds) return;

    setActionCount((prev) => {
      const newCount = prev + 1;
      if (newCount >= AD_CONFIG.actionsBeforeInterstitial) {
        showInterstitial();
        return 0;
      }
      return newCount;
    });
  }, [shouldShowAds, showInterstitial]);

  return (
    <AdContext.Provider
      value={{
        isAdReady: isInitialized,
        showInterstitial,
        incrementActionCount,
        shouldShowAds,
        isAdsModuleAvailable,
      }}
    >
      {children}
    </AdContext.Provider>
  );
}

export function useAds() {
  const context = useContext(AdContext);
  if (!context) {
    throw new Error('useAds must be used within an AdProvider');
  }
  return context;
}
