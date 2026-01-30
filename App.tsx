import './global.css';
import { useEffect, useRef, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { Alert } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import * as Linking from 'expo-linking';
import AppNavigator from './navigation/AppNavigator';
import AuthNavigator from './navigation/AuthNavigator';
import OnboardingScreen, { ONBOARDING_KEY } from './screens/OnboardingScreen';
import SplashScreen from './components/SplashScreen';
import ErrorBoundary from './components/ErrorBoundary';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { GamificationProvider } from './contexts/GamificationContext';
import { ThemeProvider, useTheme } from './contexts/ThemeContext';
import { SubscriptionProvider } from './contexts/SubscriptionContext';
import { ConsentProvider } from './contexts/ConsentContext';
import { AdProvider } from './contexts/AdContext';
import { supabase } from './config/supabase';
import {
  checkAndScheduleNotifications,
  addNotificationReceivedListener,
  addNotificationResponseListener,
} from './services/notificationService';
import logger from './utils/logger';

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

// Composant interne qui gère la navigation basée sur l'auth
function RootNavigator() {
  const { user, isLoading: authLoading, isLocalMode } = useAuth();
  const { isDark } = useTheme();
  const [showOnboarding, setShowOnboarding] = useState<boolean | null>(null);
  const [isCheckingOnboarding, setIsCheckingOnboarding] = useState(true);
  const notificationListener = useRef<Notifications.EventSubscription | null>(null);
  const responseListener = useRef<Notifications.EventSubscription | null>(null);

  useEffect(() => {
    checkOnboardingStatus();
  }, []);

  // Gérer les deep links pour l'authentification (confirmation email, reset password)
  useEffect(() => {
    const handleDeepLink = async (event: { url: string }) => {
      const { url } = event;
      logger.info('Deep link reçu:', url);

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

      // Écouter les notifications reçues
      notificationListener.current = addNotificationReceivedListener((notification) => {
        logger.info('Notification reçue:', notification.request.content.title);
      });

      // Écouter les clics sur les notifications
      responseListener.current = addNotificationResponseListener((response) => {
        logger.info('Réponse notification:', response.notification.request.content.title);
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

  const handleOnboardingComplete = () => {
    setShowOnboarding(false);
  };

  // Style de la StatusBar basé sur le thème
  const statusBarStyle = isDark ? 'light' : 'dark';

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
        <OnboardingScreen onComplete={handleOnboardingComplete} />
        <StatusBar style={statusBarStyle} />
      </>
    );
  }

  // Vérifier l'authentification
  const isAuthenticated = user !== null || isLocalMode;

  // Si pas authentifié, afficher l'écran de connexion
  if (!isAuthenticated) {
    return (
      <NavigationContainer linking={linking}>
        <AuthNavigator />
        <StatusBar style={statusBarStyle} />
      </NavigationContainer>
    );
  }

  // Utilisateur authentifié ou en mode local, afficher l'app principale
  return (
    <NavigationContainer linking={linking}>
      <AppNavigator />
      <StatusBar style={statusBarStyle} />
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <AuthProvider>
          <SubscriptionProvider>
            <ConsentProvider>
              <AdProvider>
                <GamificationProvider>
                  <RootNavigator />
                </GamificationProvider>
              </AdProvider>
            </ConsentProvider>
          </SubscriptionProvider>
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
