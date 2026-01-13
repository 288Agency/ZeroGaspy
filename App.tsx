import './global.css';
import { useEffect, useRef, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import AppNavigator from './navigation/AppNavigator';
import OnboardingScreen, { ONBOARDING_KEY } from './screens/OnboardingScreen';
import SplashScreen from './components/SplashScreen';
import {
  checkAndScheduleNotifications,
  addNotificationReceivedListener,
  addNotificationResponseListener,
} from './services/notificationService';
import logger from './utils/logger';

export default function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const notificationListener = useRef<Notifications.EventSubscription | null>(null);
  const responseListener = useRef<Notifications.EventSubscription | null>(null);

  useEffect(() => {
    checkOnboardingStatus();
  }, []);

  useEffect(() => {
    if (!showOnboarding && !isLoading) {
      // Initialiser les notifications seulement après l'onboarding
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
  }, [showOnboarding, isLoading]);

  const checkOnboardingStatus = async () => {
    try {
      const completed = await AsyncStorage.getItem(ONBOARDING_KEY);
      setShowOnboarding(completed !== 'true');
    } catch (error) {
      logger.error('Error checking onboarding status:', error);
      setShowOnboarding(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOnboardingComplete = () => {
    setShowOnboarding(false);
  };

  if (isLoading) {
    return (
      <>
        <SplashScreen />
        <StatusBar style="dark" />
      </>
    );
  }

  if (showOnboarding) {
    return (
      <>
        <OnboardingScreen onComplete={handleOnboardingComplete} />
        <StatusBar style="dark" />
      </>
    );
  }

  return (
    <NavigationContainer>
      <AppNavigator />
      <StatusBar style="auto" />
    </NavigationContainer>
  );
}
