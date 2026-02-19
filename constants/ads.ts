import { Platform } from 'react-native';

// Mode test - mettre a false en production
const USE_TEST_ADS = __DEV__;

// IDs de production AdMob
const PRODUCTION_IDS = {
  ios: {
    banner: null, // Pas de banniere configuree
    interstitial: 'ca-app-pub-7371774777716579/2445384562',
  },
  android: {
    banner: null, // Pas de banniere configuree
    interstitial: 'ca-app-pub-7371774777716579/8330575565',
  },
};

// IDs de test Google (valeurs officielles, hardcodées pour éviter l'import du module natif)
// Ces valeurs sont documentées: https://developers.google.com/admob/android/test-ads
const TEST_IDS = {
  banner: Platform.select({
    ios: 'ca-app-pub-3940256099942544/2934735716',
    android: 'ca-app-pub-3940256099942544/6300978111',
    default: 'ca-app-pub-3940256099942544/6300978111',
  }),
  interstitial: Platform.select({
    ios: 'ca-app-pub-3940256099942544/4411468910',
    android: 'ca-app-pub-3940256099942544/1033173712',
    default: 'ca-app-pub-3940256099942544/1033173712',
  }),
};

// Export des IDs selon la plateforme et le mode
export const AD_UNIT_IDS = {
  // Banniere desactivee en production (pas d'ID configure)
  banner: USE_TEST_ADS ? TEST_IDS.banner : null,
  interstitial: USE_TEST_ADS
    ? TEST_IDS.interstitial
    : Platform.select({
        ios: PRODUCTION_IDS.ios.interstitial,
        android: PRODUCTION_IDS.android.interstitial,
        default: TEST_IDS.interstitial,
      }),
};

// Configuration des pubs
export const AD_CONFIG = {
  // Delai minimum entre deux interstitiels (en ms) - 3 minutes
  interstitialCooldown: 3 * 60 * 1000,
  // Nombre d'actions avant d'afficher un interstitiel
  actionsBeforeInterstitial: 3,
  // Afficher les pubs uniquement pour les non-Premium
  showOnlyForFreeUsers: true,
};
