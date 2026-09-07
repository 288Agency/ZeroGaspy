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
  version: '2.2.0',
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
    // Android affiche la petite icone en silhouette monochrome : il faut un
    // asset blanc sur transparent, sinon le logo couleur devient un carre blanc.
    icon: './assets/notification-icon.png',
    color: '#2F6B3F',
    androidMode: 'default',
    androidCollapsedTitle: 'ZeroGaspy',
  },
  ios: {
    supportsTablet: false,
    bundleIdentifier: 'com.zerogaspy.app',
    buildNumber: '59',
    appleTeamId: 'CU86TBMX5S',
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
    versionCode: 59,
    adaptiveIcon: {
      foregroundImage: './assets/adaptive-icon.png',
      backgroundColor: '#F7F5E6',
    },
    edgeToEdgeEnabled: true,
    predictiveBackGestureEnabled: false,
    softwareKeyboardLayoutMode: 'resize',
    // SCHEDULE_EXACT_ALARM retiree : permission restreinte par Google Play
    // (reservee reveils/agendas) et inutile ici, les rappels passent par des
    // triggers DAILY / WEEKLY / TIME_INTERVAL.
    permissions: [
      'CAMERA',
      'RECEIVE_BOOT_COMPLETED',
      'VIBRATE',
    ],
    // Injectees par les plugins expo-file-system / expo-image-picker mais
    // jamais necessaires : on n'ecrit que dans le stockage prive de l'app.
    // READ_EXTERNAL_STORAGE est conservee : requestMediaLibraryPermissionsAsync()
    // retombe dessus sur Android <= 12 (import photo feedback + ticket de caisse).
    // SYSTEM_ALERT_WINDOW vient du template Expo (withAndroidBaseMods), pas de
    // nous : sans elle en moins la fiche Play affiche « Affichage par-dessus
    // d'autres applis », alors que l'app ne dessine aucune overlay.
    blockedPermissions: [
      'android.permission.WRITE_EXTERNAL_STORAGE',
      'android.permission.SYSTEM_ALERT_WINDOW',
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
        icon: './assets/notification-icon.png',
        color: '#2F6B3F',
        sounds: [],
      },
    ],
    '@react-native-community/datetimepicker',
    // Lecture video uniquement (logo de boot) : pas de RECORD_AUDIO dans le manifeste.
    ['expo-av', { microphonePermission: false }],
    // Scan code-barres / date / ticket : photo uniquement, jamais de video sonore.
    // Sans ca expo-camera injecte RECORD_AUDIO -> « Microphone » dans la fiche Play.
    ['expo-camera', { recordAudioAndroid: false, microphonePermission: false }],
    // Idem : expo-image-picker ajoute RECORD_AUDIO par defaut (capture video).
    ['expo-image-picker', { microphonePermission: false }],
    'expo-web-browser',
    'expo-secure-store',
    'expo-font',
    'expo-apple-authentication',
    'react-native-bottom-tabs',
  ],
  extra: {
    eas: {
      projectId: '67db9e46-01d4-4c41-815b-237ba7f22681',
      // Déclare l'extension widget à EAS pour qu'il provisionne ses credentials
      // (sinon EAS ne gère que l'app principale → « No profiles for …widget »).
      build: {
        experimental: {
          ios: {
            appExtensions: [
              {
                targetName: 'ZeroGaspyWidget',
                bundleIdentifier: 'com.zerogaspy.app.widget',
                entitlements: {
                  'com.apple.security.application-groups': [
                    'group.com.zerogaspy.app.widget',
                  ],
                },
              },
            ],
          },
        },
      },
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
