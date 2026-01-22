import './global.css';
import { useEffect, useRef, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
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

// Composant interne qui gère la navigation basée sur l'auth
function RootNavigator() {
  const { user, isLoading: authLoading, isLocalMode } = useAuth();
  const [showOnboarding, setShowOnboarding] = useState<boolean | null>(null);
  const [isCheckingOnboarding, setIsCheckingOnboarding] = useState(true);
  const notificationListener = useRef<Notifications.EventSubscription | null>(null);
  const responseListener = useRef<Notifications.EventSubscription | null>(null);

  useEffect(() => {
    checkOnboardingStatus();
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

  // Afficher le splash pendant le chargement initial
  if (isCheckingOnboarding || authLoading || showOnboarding === null) {
    return (
      <>
        <SplashScreen />
        <StatusBar style="dark" />
      </>
    );
  }

  // Afficher l'onboarding si pas encore fait
  if (showOnboarding) {
    return (
      <>
        <OnboardingScreen onComplete={handleOnboardingComplete} />
        <StatusBar style="dark" />
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
        <StatusBar style="dark" />
      </NavigationContainer>
    );
  }

  // Utilisateur authentifié ou en mode local, afficher l'app principale
  return (
    <NavigationContainer linking={linking}>
      <AppNavigator />
      <StatusBar style="auto" />
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <RootNavigator />
      </AuthProvider>
    </ErrorBoundary>
  );
}
