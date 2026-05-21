import './i18n';
import i18n from './i18n';
import { useEffect, useRef, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { Alert, AppState } from 'react-native';
import { NavigationContainer, NavigationState, createNavigationContainerRef } from '@react-navigation/native';
import { RootStackParamList } from './types/navigation';
import { getScreenFromNotificationData } from './utils/notificationNavigation';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const navigationRef = createNavigationContainerRef<RootStackParamList>();
import * as Notifications from 'expo-notifications';
import * as Linking from 'expo-linking';
import AppNavigator from './navigation/AppNavigator';
import AuthNavigator from './navigation/AuthNavigator';
import { ONBOARDING_KEY } from './constants/onboarding';
import { OnboardingFlow } from './components/ds';
import { requestNotificationPermissions } from './services/notificationService';
import SplashScreen from './components/SplashScreen';
import ErrorBoundary from './components/ErrorBoundary';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { GamificationProvider } from './contexts/GamificationContext';
import { ThemeProvider as LegacyThemeProvider } from './contexts/ThemeContext.legacy';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider as DSThemeProvider } from './contexts/ThemeContext';
import { ToastProvider } from './components/ds';
import { SubscriptionProvider } from './contexts/SubscriptionContext';
import { supabase } from './config/supabase';
import {
  checkAndScheduleNotifications,
  addNotificationReceivedListener,
  addNotificationResponseListener,
  scheduleWelcomeBackNotification,
  scheduleDinnerReminderNotification,
  scheduleWeeklyRecapNotification,
} from './services/notificationService';
import { registerPushToken, updateLastOpenedAt } from './services/pushTokenService';
import logger from './utils/logger';
import { runStartupDiagnostics } from './utils/diagnostics';
import { initSentry, Sentry } from './config/sentry';
import {
  initAnalytics,
  trackAppOpened,
  trackScreen,
  trackOnboardingCompleted,
  identifyUser,
  shutdownAnalytics,
} from './services/analytics';
import { savePendingReferralCode } from './services/referralService';

// Initialiser Sentry et PostHog au démarrage
initSentry();
initAnalytics();

// Exécuter les diagnostics au démarrage
runStartupDiagnostics();

// Configuration du deep linking
const linking = {
  prefixes: [Linking.createURL('/'), 'zerogaspy://'],
  config: {
    screens: {
      Home: 'home',
      Lists: 'lists',
      AddFood: 'add-food',
      InventoryList: 'inventory',
      Account: 'account',
      Recipes: 'recipes',
      Stats: 'stats',
      MealPlanner: 'meal-planner',
      ShoppingList: 'shopping-list',
    },
  },
};

// Fonction pour extraire les paramètres d'authentification d'une URL
function extractAuthParams(url: string): { accessToken?: string; refreshToken?: string; type?: string } | null {
  try {
    // Supabase utilise des fragments (#) pour les tokens
    const hashIndex = url.indexOf('#');
    if (hashIndex === -1) return null;

    const hash = url.substring(hashIndex + 1);
    const params = new URLSearchParams(hash);

    const accessToken = params.get('access_token');
    const refreshToken = params.get('refresh_token');
    const type = params.get('type');

    if (accessToken && refreshToken) {
      return { accessToken, refreshToken, type: type || undefined };
    }
    return null;
  } catch (error) {
    logger.error('Erreur extraction params auth:', error);
    return null;
  }
}

// Extraire le nom de l'écran actif depuis le state de navigation
function getActiveRouteName(state: NavigationState | undefined): string | undefined {
  if (!state) return undefined;
  const route = state.routes[state.index];
  if (route.state) {
    return getActiveRouteName(route.state as NavigationState);
  }
  return route.name;
}

// Composant interne qui gère la navigation basée sur l'auth
function RootNavigator() {
  const { user, isLoading: authLoading, isLocalMode, skipAuth } = useAuth();
  const [showOnboarding, setShowOnboarding] = useState<boolean | null>(null);
  const [isCheckingOnboarding, setIsCheckingOnboarding] = useState(true);
  const notificationListener = useRef<Notifications.EventSubscription | null>(null);
  const responseListener = useRef<Notifications.EventSubscription | null>(null);
  const routeNameRef = useRef<string | undefined>(undefined);
  const userIdRef = useRef<string | undefined>(undefined);

  // Track app_opened au montage
  useEffect(() => {
    trackAppOpened();
  }, []);

  // Identifier l'user PostHog quand il se connecte
  useEffect(() => {
    userIdRef.current = user?.id;
    if (user?.id) {
      identifyUser(user.id, { email: user.email ?? null });
    }
  }, [user?.id]);

  // Cleanup PostHog quand l'app passe en background
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'background') {
        shutdownAnalytics();
      }
      if (state === 'active') {
        initAnalytics();
        if (userIdRef.current) {
          updateLastOpenedAt(userIdRef.current);
        }
      }
    });
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    checkOnboardingStatus();
  }, []);

  // Gérer les deep links pour l'authentification (confirmation email, reset password)
  useEffect(() => {
    const handleDeepLink = async (event: { url: string }) => {
      const { url } = event;
      logger.info('Deep link reçu:', url);

      // Widget iOS tap → aliments expirants
      if (url.includes('expiring-soon')) {
        if (navigationRef.isReady()) {
          navigationRef.navigate('ExpiringSoon' as any);
        }
        return;
      }

      const inviteMatch = url.match(/invite\/([A-Z0-9-]+)/i);
      if (inviteMatch) {
        await savePendingReferralCode(inviteMatch[1]);
        return;
      }

      const authParams = extractAuthParams(url);
      if (authParams?.accessToken && authParams?.refreshToken) {
        try {
          const { error } = await supabase.auth.setSession({
            access_token: authParams.accessToken,
            refresh_token: authParams.refreshToken,
          });

          if (error) {
            logger.error('Erreur setSession:', error);
            Alert.alert('Erreur', 'Impossible de confirmer votre compte. Veuillez réessayer.');
          } else {
            const message = authParams.type === 'signup'
              ? 'Votre email a été confirmé avec succès !'
              : authParams.type === 'recovery'
              ? 'Vous pouvez maintenant changer votre mot de passe.'
              : 'Authentification réussie !';
            Alert.alert('Succès', message);
          }
        } catch (error) {
          logger.error('Erreur deep link auth:', error);
          Alert.alert('Erreur', 'Une erreur est survenue lors de la confirmation.');
        }
      }
    };

    // Vérifier l'URL initiale (si l'app a été ouverte via un deep link)
    Linking.getInitialURL().then((url) => {
      if (url) {
        handleDeepLink({ url });
      }
    });

    // Écouter les deep links pendant que l'app est ouverte
    const subscription = Linking.addEventListener('url', handleDeepLink);

    return () => {
      subscription.remove();
    };
  }, []);

  useEffect(() => {
    const isAuthenticated = user !== null || isLocalMode;

    if (showOnboarding === false && !authLoading && isAuthenticated) {
      // Initialiser les notifications seulement après l'onboarding et auth
      checkAndScheduleNotifications();
      scheduleDinnerReminderNotification(i18n.language);
      scheduleWeeklyRecapNotification(i18n.language);

      // Enregistrer le push token et tracker l'ouverture (users connectés uniquement)
      if (user?.id) {
        registerPushToken(user.id);
        updateLastOpenedAt(user.id);
      }

      // Écouter les notifications reçues
      notificationListener.current = addNotificationReceivedListener((notification) => {
        logger.info('Notification reçue:', notification.request.content.title);
      });

      // Écouter les clics sur les notifications
      responseListener.current = addNotificationResponseListener((response) => {
        logger.info('Notification tapped:', response.notification.request.content.title);
        const data = response.notification.request.content.data as Record<string, unknown> | null;
        const dest = getScreenFromNotificationData(data);
        if (navigationRef.isReady()) {
          navigationRef.navigate(dest.screen as any, dest.params as any);
        }
      });

      // Cold-start: l'app a été lancée via un tap sur une notification
      Notifications.getLastNotificationResponseAsync().then((response) => {
        if (response) {
          const data = response.notification.request.content.data as Record<string, unknown> | null;
          const dest = getScreenFromNotificationData(data);
          if (navigationRef.isReady()) {
            navigationRef.navigate(dest.screen as any, dest.params as any);
          }
        }
      });
    }

    return () => {
      if (notificationListener.current) {
        notificationListener.current.remove();
      }
      if (responseListener.current) {
        responseListener.current.remove();
      }
    };
  }, [showOnboarding, authLoading, user, isLocalMode]);

  const checkOnboardingStatus = async () => {
    try {
      const completed = await AsyncStorage.getItem(ONBOARDING_KEY);
      setShowOnboarding(completed !== 'true');
    } catch (error) {
      logger.error('Error checking onboarding status:', error);
      setShowOnboarding(false);
    } finally {
      setIsCheckingOnboarding(false);
    }
  };

  const handleOnboardingComplete = async () => {
    trackOnboardingCompleted();
    scheduleWelcomeBackNotification(i18n.language);
    try {
      await AsyncStorage.setItem(ONBOARDING_KEY, 'true');
    } catch (error) {
      logger.error('Erreur sauvegarde onboarding:', error);
    }
    if (!user) {
      skipAuth();
    }
    setShowOnboarding(false);
  };

  // Screen tracking callback pour NavigationContainer
  const onNavigationStateChange = (state: NavigationState | undefined) => {
    const currentRouteName = getActiveRouteName(state);
    if (currentRouteName && currentRouteName !== routeNameRef.current) {
      trackScreen(currentRouteName);
    }
    routeNameRef.current = currentRouteName;
  };

  const statusBarStyle = 'dark' as const;

  // Afficher le splash pendant le chargement initial
  if (isCheckingOnboarding || authLoading || showOnboarding === null) {
    return (
      <>
        <SplashScreen />
        <StatusBar style={statusBarStyle} />
      </>
    );
  }

  // Afficher l'onboarding si pas encore fait
  if (showOnboarding) {
    return (
      <>
        <OnboardingFlow
          onComplete={handleOnboardingComplete}
          onRequestNotifications={requestNotificationPermissions}
        />
        <StatusBar style={statusBarStyle} />
      </>
    );
  }

  // Vérifier l'authentification
  const isAuthenticated = user !== null || isLocalMode;

  // Si pas authentifié, afficher l'écran de connexion
  if (!isAuthenticated) {
    return (
      <NavigationContainer ref={navigationRef} linking={linking} onStateChange={onNavigationStateChange}>
        <AuthNavigator />
        <StatusBar style={statusBarStyle} />
      </NavigationContainer>
    );
  }

  // Utilisateur authentifié ou en mode local, afficher l'app principale
  return (
    <NavigationContainer ref={navigationRef} linking={linking} onStateChange={onNavigationStateChange}>
      <AppNavigator />
      <StatusBar style={statusBarStyle} />
    </NavigationContainer>
  );
}

function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ErrorBoundary>
          <LegacyThemeProvider>
            <DSThemeProvider>
              <AuthProvider>
                <SubscriptionProvider>
                  <GamificationProvider>
                    <ToastProvider bottomOffset={49}>
                      <RootNavigator />
                    </ToastProvider>
                  </GamificationProvider>
                </SubscriptionProvider>
              </AuthProvider>
            </DSThemeProvider>
          </LegacyThemeProvider>
        </ErrorBoundary>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

export default Sentry.wrap(App);
