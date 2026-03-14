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
  showRewardedAd: () => Promise<boolean>;
  incrementActionCount: () => void;
  shouldShowAds: boolean;
  isAdsModuleAvailable: boolean;
  isRewardedAdReady: boolean;
  isRewardedAdLoading: boolean;
  retryLoadRewardedAd: () => void;
  needsConsent: boolean;
  requestConsent: () => Promise<void>;
}

const AdContext = createContext<AdContextType>({
  isAdReady: false,
  showInterstitial: async () => false,
  showRewardedAd: async () => false,
  incrementActionCount: () => {},
  shouldShowAds: true,
  isAdsModuleAvailable: false,
  isRewardedAdReady: false,
  isRewardedAdLoading: false,
  retryLoadRewardedAd: () => {},
  needsConsent: false,
  requestConsent: async () => {},
});

export function AdProvider({ children }: { children: React.ReactNode }) {
  const { isPremium } = useSubscription();
  const { isInitialized: consentInitialized, canShowPersonalizedAds, refreshConsent } = useConsent();
  const [isInitialized, setIsInitialized] = useState(false);
  const [isInterstitialReady, setIsInterstitialReady] = useState(false);
  const [isRewardedAdReady, setIsRewardedAdReady] = useState(false);
  const [isRewardedAdLoading, setIsRewardedAdLoading] = useState(false);
  const [needsConsent, setNeedsConsent] = useState(false);
  const [actionCount, setActionCount] = useState(0);
  const lastInterstitialTime = useRef<number>(0);
  const interstitialRef = useRef<any>(null);
  const rewardedAdRef = useRef<any>(null);
  const adsModuleRef = useRef<any>(null);
  const rewardedRetryCount = useRef<number>(0);
  const rewardedRetryTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const canRequestAdsRef = useRef<boolean>(false);

  // Les utilisateurs Premium ne voient pas de pubs
  const shouldShowAds = AD_CONFIG.showOnlyForFreeUsers ? !isPremium : true;
  const isAdsModuleAvailable = !isExpoGo;

  // Vérifier si on peut demander des pubs (consentement obtenu)
  const checkCanRequestAds = useCallback(async (): Promise<boolean> => {
    if (isExpoGo || !adsModuleRef.current) return false;

    try {
      const { AdsConsent } = adsModuleRef.current;
      const canRequest = await AdsConsent.canRequestAds();
      canRequestAdsRef.current = canRequest;
      setNeedsConsent(!canRequest);

      if (!canRequest) {
        logger.warn('AdMob: canRequestAds() = false - consentement non obtenu, les pubs ne chargeront pas');
      } else {
        logger.info('AdMob: canRequestAds() = true - les pubs peuvent charger');
      }

      return canRequest;
    } catch (error) {
      logger.error('Erreur vérification canRequestAds:', error);
      // En cas d'erreur, on tente quand même
      return true;
    }
  }, []);

  // Re-demander le consentement (appelé depuis le modal)
  const requestConsent = useCallback(async () => {
    if (isExpoGo || !adsModuleRef.current) return;

    try {
      const { AdsConsent } = adsModuleRef.current;

      logger.info('Re-demande du consentement UMP...');

      // Forcer la mise à jour des infos de consentement
      await AdsConsent.requestInfoUpdate();

      // Charger et afficher le formulaire
      await AdsConsent.loadAndShowConsentFormIfRequired();

      // Vérifier le nouveau statut
      const canRequest = await checkCanRequestAds();

      if (canRequest) {
        logger.info('Consentement obtenu ! Chargement des pubs...');
        // Rafraîchir le contexte de consentement
        await refreshConsent();
        // Les pubs se rechargeront via le useEffect
      }
    } catch (error) {
      logger.error('Erreur re-demande consentement:', error);
    }
  }, [checkCanRequestAds, refreshConsent]);

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

        logger.info('AdMob SDK initialise avec succes');
        logger.info(`Mode publicites: ${canShowPersonalizedAds ? 'personnalisees' : 'non-personnalisees'}`);

        // Vérifier si on peut demander des pubs
        await checkCanRequestAds();

        setIsInitialized(true);
      } catch (error) {
        logger.error('Erreur initialisation AdMob:', error);
      }
    };

    if (shouldShowAds && consentInitialized) {
      initializeAds();
    }
  }, [shouldShowAds, consentInitialized, canShowPersonalizedAds, checkCanRequestAds]);

  // Charger l'interstitiel
  const loadInterstitial = useCallback(() => {
    if (!shouldShowAds || !isInitialized || isExpoGo || !adsModuleRef.current) return;

    // Ne pas charger si le consentement n'est pas obtenu
    if (!canRequestAdsRef.current) {
      logger.info('Interstitiel non chargé: consentement requis');
      return;
    }

    try {
      const { InterstitialAd, AdEventType } = adsModuleRef.current;

      const interstitial = InterstitialAd.createForAdRequest(AD_UNIT_IDS.interstitial!, {
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
        logger.warn('Erreur chargement interstitiel:', error?.message || error?.code || error);
        setIsInterstitialReady(false);
      });

      interstitial.load();
      interstitialRef.current = interstitial;
    } catch (error) {
      logger.error('Erreur creation interstitiel:', error);
    }
  }, [shouldShowAds, isInitialized, canShowPersonalizedAds]);

  // Charger la rewarded ad avec retry automatique
  const loadRewardedAd = useCallback(() => {
    if (!isInitialized || isExpoGo || !adsModuleRef.current) return;

    // Ne pas charger si le consentement n'est pas obtenu
    if (!canRequestAdsRef.current) {
      logger.info('Rewarded ad non chargée: consentement requis');
      setIsRewardedAdLoading(false);
      return;
    }

    // Annuler un éventuel retry en cours
    if (rewardedRetryTimer.current) {
      clearTimeout(rewardedRetryTimer.current);
      rewardedRetryTimer.current = null;
    }

    setIsRewardedAdLoading(true);

    try {
      const { RewardedAd, RewardedAdEventType, AdEventType } = adsModuleRef.current;

      const rewarded = RewardedAd.createForAdRequest(AD_UNIT_IDS.rewarded!, {
        requestNonPersonalizedAdsOnly: !canShowPersonalizedAds,
      });

      rewarded.addAdEventListener(RewardedAdEventType.LOADED, () => {
        setIsRewardedAdReady(true);
        setIsRewardedAdLoading(false);
        rewardedRetryCount.current = 0;
        logger.info('Rewarded ad chargée avec succès');
      });

      rewarded.addAdEventListener(RewardedAdEventType.EARNED_REWARD, (reward: any) => {
        logger.info('Récompense gagnée:', reward);
      });

      rewarded.addAdEventListener(AdEventType.CLOSED, () => {
        setIsRewardedAdReady(false);
        // Recharger une nouvelle rewarded ad
        loadRewardedAd();
      });

      rewarded.addAdEventListener(AdEventType.ERROR, (error: any) => {
        const errorMsg = error?.message || error?.code || JSON.stringify(error);
        logger.warn(`Erreur chargement rewarded ad (tentative ${rewardedRetryCount.current + 1}/5):`, errorMsg);
        setIsRewardedAdReady(false);
        setIsRewardedAdLoading(false);

        // Retry automatique avec backoff exponentiel (max 5 tentatives, max 60s)
        if (rewardedRetryCount.current < 5) {
          const delay = Math.min(5000 * Math.pow(2, rewardedRetryCount.current), 60000);
          rewardedRetryCount.current += 1;
          logger.info(`Retry rewarded ad dans ${delay / 1000}s (tentative ${rewardedRetryCount.current}/5)`);
          rewardedRetryTimer.current = setTimeout(() => {
            loadRewardedAd();
          }, delay);
        } else {
          logger.warn('Rewarded ad: toutes les tentatives échouées. L\'utilisateur peut réessayer manuellement.');
        }
      });

      rewarded.load();
      rewardedAdRef.current = rewarded;
    } catch (error) {
      logger.error('Erreur création rewarded ad:', error);
      setIsRewardedAdLoading(false);
    }
  }, [isInitialized, canShowPersonalizedAds]);

  // Retry manuel (appelé depuis le modal)
  const retryLoadRewardedAd = useCallback(async () => {
    if (isRewardedAdReady || isRewardedAdLoading) return;

    // Re-vérifier le consentement avant de retenter
    if (!canRequestAdsRef.current) {
      const canRequest = await checkCanRequestAds();
      if (!canRequest) {
        logger.info('Retry rewarded ad impossible: consentement requis');
        return;
      }
    }

    rewardedRetryCount.current = 0;
    loadRewardedAd();
  }, [isRewardedAdReady, isRewardedAdLoading, loadRewardedAd, checkCanRequestAds]);

  // Charger l'interstitiel et la rewarded ad quand le SDK est pret
  useEffect(() => {
    if (isInitialized && shouldShowAds) {
      loadInterstitial();
      loadRewardedAd();
    }
  }, [isInitialized, shouldShowAds, loadInterstitial, loadRewardedAd]);

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

  // Afficher la rewarded ad
  const showRewardedAd = useCallback(async (): Promise<boolean> => {
    if (isExpoGo) return false;

    // Vérifier si la rewarded ad est prête
    if (!isRewardedAdReady || !rewardedAdRef.current) {
      logger.info('Rewarded ad non prête');
      return false;
    }

    try {
      await rewardedAdRef.current.show();
      return true;
    } catch (error) {
      logger.error('Erreur affichage rewarded ad:', error);
      return false;
    }
  }, [isRewardedAdReady]);

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
        showRewardedAd,
        incrementActionCount,
        shouldShowAds,
        isAdsModuleAvailable,
        isRewardedAdReady,
        isRewardedAdLoading,
        retryLoadRewardedAd,
        needsConsent,
        requestConsent,
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
