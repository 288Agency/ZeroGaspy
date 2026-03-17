import type { ConfigContext, ExpoConfig } from 'expo/config';
import type { WithAndroidWidgetsParams } from 'react-native-android-widget';

// Configuration AdMob
const ADMOB_IOS_APP_ID = 'ca-app-pub-7371774777716579~3910128601';
const ADMOB_ANDROID_APP_ID = 'ca-app-pub-7371774777716579~3489372499';

// Configuration du widget Android
const widgetConfig: WithAndroidWidgetsParams = {
  widgets: [
    {
      name: 'ExpiringFoods',
      label: 'ZeroGaspy - Expirations',
      description: 'Affiche les aliments qui expirent bientôt',
      minWidth: '320dp',
      minHeight: '120dp',
      targetCellWidth: 4,
      targetCellHeight: 2,
      previewImage: './assets/logo.png',
      resizeMode: 'horizontal|vertical',
      // Mise à jour toutes les 30 minutes
      updatePeriodMillis: 1800000,
    },
  ],
};

export default ({ config }: ConfigContext): ExpoConfig => {
  // Diagnostic : vérifier que les variables sont chargées au build
  console.log('🔍 [Build] EXPO_PUBLIC_SUPABASE_URL:', process.env.EXPO_PUBLIC_SUPABASE_URL ? 'SET' : 'MISSING');
  console.log('🔍 [Build] EXPO_PUBLIC_SUPABASE_ANON_KEY:', process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ? 'SET' : 'MISSING');

  return {
  ...config,
  name: 'ZeroGaspy',
  slug: 'ZeroGaspyLocal',
  version: '2.0.6',
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'light',
  newArchEnabled: true,
  splash: {
    image: './assets/logo.png',
    resizeMode: 'contain',
    backgroundColor: '#F7F5E6',
  },
  notification: {
    icon: './assets/logo.png',
    color: '#3C6E47',
    androidMode: 'default',
    androidCollapsedTitle: 'ZeroGaspy',
  },
  ios: {
    supportsTablet: false,
    bundleIdentifier: 'com.zerogaspy.app',
    buildNumber: '13',
    appleTeamId: 'M32LP7D76G',
    infoPlist: {
      NSCameraUsageDescription:
        "Cette application a besoin d'accéder à votre caméra pour prendre des photos d'aliments.",
      NSPhotoLibraryUsageDescription:
        "Cette application a besoin d'accéder à votre galerie photo pour sélectionner des images d'aliments.",
      ITSAppUsesNonExemptEncryption: false,
      GADApplicationIdentifier: ADMOB_IOS_APP_ID,
      NSUserTrackingUsageDescription:
        'Cette application utilise des publicites personnalisees pour rester gratuite. Vos donnees ne sont pas partagees avec des tiers.',
      CFBundleDevelopmentRegion: 'fr',
      CFBundleLocalizations: ['fr', 'en'],
    },
    entitlements: {
      'com.apple.security.application-groups': ['group.com.zerogaspy.app'],
    },
  },
  android: {
    package: 'com.zerogaspy.app',
    versionCode: 13,
    adaptiveIcon: {
      foregroundImage: './assets/adaptive-icon.png',
      backgroundColor: '#F7F5E6',
    },
    edgeToEdgeEnabled: true,
    predictiveBackGestureEnabled: false,
    softwareKeyboardLayoutMode: 'resize',
    permissions: [
      'CAMERA',
      'READ_EXTERNAL_STORAGE',
      'WRITE_EXTERNAL_STORAGE',
      'RECEIVE_BOOT_COMPLETED',
      'VIBRATE',
      'SCHEDULE_EXACT_ALARM',
    ],
  },
  web: {
    favicon: './assets/logo.png',
  },
  scheme: 'zerogaspy',
  plugins: [
    ['react-native-android-widget', widgetConfig],
    // '@bacons/apple-targets', // Désactivé temporairement - incompatible avec Expo SDK 54
    [
      '@sentry/react-native/expo',
      {
        organization: process.env.SENTRY_ORG || '288-agency',
        project: process.env.SENTRY_PROJECT || 'zerogaspy',
      },
    ],
    [
      'expo-notifications',
      {
        icon: './assets/logo.png',
        color: '#3C6E47',
        sounds: [],
      },
    ],
    [
      'react-native-google-mobile-ads',
      {
        androidAppId: ADMOB_ANDROID_APP_ID,
        iosAppId: ADMOB_IOS_APP_ID,
        userTrackingUsageDescription:
          'Cette application utilise des publicites personnalisees pour rester gratuite. Vos donnees ne sont pas partagees avec des tiers.',
        skAdNetworkItems: [
          'cstr6suwn9.skadnetwork',
          '4fzdc2evr5.skadnetwork',
          '2fnua5tdw4.skadnetwork',
          'ydx93a7ass.skadnetwork',
          '5a6flpkh64.skadnetwork',
          'p78aez8anl.skadnetwork',
          'v72qych5uu.skadnetwork',
          'c6k4g5qg8m.skadnetwork',
          's39g8k73mm.skadnetwork',
          '3qy4746246.skadnetwork',
          '3sh42y64q3.skadnetwork',
          'f38h382jlk.skadnetwork',
          'hs6bdukanm.skadnetwork',
          'prcb7njmu6.skadnetwork',
          'wzmmz9fp6w.skadnetwork',
          'yclnxrl5pm.skadnetwork',
          '4468km3ulz.skadnetwork',
          't38b2kh725.skadnetwork',
          '7ug5zh24hu.skadnetwork',
          '9rd848q2bz.skadnetwork',
          'n6fk4nfna4.skadnetwork',
          'kbd757ywx3.skadnetwork',
          '9t245vhmpl.skadnetwork',
          '44jx6755aq.skadnetwork',
          'tl55sbb4fm.skadnetwork',
          '2u9pt9hc89.skadnetwork',
          '8s468mfl3y.skadnetwork',
          'klf5c3l5u5.skadnetwork',
          'ppxm28t8ap.skadnetwork',
          '424m5254lk.skadnetwork',
          'uw77j35x4d.skadnetwork',
          '578prtvx9j.skadnetwork',
          '4dzt52r2t5.skadnetwork',
          'e5fvkxwrpn.skadnetwork',
          '8c4e2ghe7u.skadnetwork',
          'zq492l623r.skadnetwork',
          '3qcr597p9d.skadnetwork',
        ],
      },
    ],
    '@react-native-community/datetimepicker',
    'expo-av',
    'expo-web-browser',
    'expo-secure-store',
    'expo-font',
    'expo-apple-authentication',
    [
      'expo-tracking-transparency',
      {
        userTrackingPermission:
          'Cette application utilise des publicites personnalisees pour rester gratuite. Vos donnees ne sont pas partagees avec des tiers.',
      },
    ],
  ],
  extra: {
    eas: {
      projectId: '67db9e46-01d4-4c41-815b-237ba7f22681',
    },
    // Variables d'environnement exposées à l'application
    supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL,
    supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
    feedbackEmail: process.env.EXPO_PUBLIC_FEEDBACK_EMAIL,
    // Note: Les clés OCR (Mindee/Google Vision) sont maintenant côté serveur via Edge Function
  },
  owner: '288agency',
  };
};
