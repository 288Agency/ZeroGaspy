import type { ConfigContext, ExpoConfig } from 'expo/config';
import type { WithAndroidWidgetsParams } from 'react-native-android-widget';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const withIOSWidget = require('./plugins/withIOSWidget');

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
  version: '2.0.7',
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
      CFBundleDevelopmentRegion: 'fr',
      CFBundleLocalizations: ['fr', 'en'],
    },
    entitlements: {
      'com.apple.security.application-groups': ['group.com.zerogaspy.app.widget'],
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
    withIOSWidget,
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
    '@react-native-community/datetimepicker',
    'expo-av',
    'expo-web-browser',
    'expo-secure-store',
    'expo-font',
    'expo-apple-authentication',
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
