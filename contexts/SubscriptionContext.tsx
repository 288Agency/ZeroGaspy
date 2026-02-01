import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Platform, Alert } from 'react-native';
import Purchases, {
  PurchasesPackage,
  CustomerInfo,
  PurchasesError,
  LOG_LEVEL,
} from 'react-native-purchases';
import { useAuth } from './AuthContext';
import {
  REVENUECAT_API_KEY_IOS,
  REVENUECAT_API_KEY_ANDROID,
  ENTITLEMENT_ID,
} from '../constants/subscription';
import logger from '../utils/logger';

export type SubscriptionPlan = 'free' | 'monthly' | 'yearly';

interface SubscriptionContextType {
  isPremium: boolean;
  isLoading: boolean;
  currentPlan: SubscriptionPlan;
  expirationDate: Date | null;
  packages: PurchasesPackage[];
  purchasePackage: (pkg: PurchasesPackage) => Promise<boolean>;
  restorePurchases: () => Promise<boolean>;
  refreshSubscriptionStatus: () => Promise<void>;
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

interface SubscriptionProviderProps {
  children: ReactNode;
}

export function SubscriptionProvider({ children }: SubscriptionProviderProps) {
  const { user } = useAuth();
  const [isPremium, setIsPremium] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPlan, setCurrentPlan] = useState<SubscriptionPlan>('free');
  const [expirationDate, setExpirationDate] = useState<Date | null>(null);
  const [packages, setPackages] = useState<PurchasesPackage[]>([]);
  const [isConfigured, setIsConfigured] = useState(false);

  // Configuration de RevenueCat
  useEffect(() => {
    const configureRevenueCat = async () => {
      try {
        if (__DEV__) {
          Purchases.setLogLevel(LOG_LEVEL.DEBUG);
        }

        const apiKey = Platform.OS === 'ios'
          ? REVENUECAT_API_KEY_IOS
          : REVENUECAT_API_KEY_ANDROID;

        // Ne pas configurer si les clés ne sont pas definies
        if (apiKey === 'YOUR_IOS_API_KEY' || apiKey === 'YOUR_ANDROID_API_KEY') {
          logger.warn('RevenueCat API keys not configured');
          setIsLoading(false);
          return;
        }

        await Purchases.configure({ apiKey });
        setIsConfigured(true);
        logger.info('RevenueCat configured successfully');
      } catch (error) {
        logger.error('Error configuring RevenueCat:', error);
        setIsLoading(false);
      }
    };

    configureRevenueCat();
  }, []);

  // Identifier l'utilisateur et charger le statut
  useEffect(() => {
    if (!isConfigured) return;

    const setupUser = async () => {
      setIsLoading(true);
      try {
        // Identifier l'utilisateur si connecte
        if (user?.id) {
          await Purchases.logIn(user.id);
          logger.info('RevenueCat user identified:', user.id);
        } else {
          // Deconnecter de RevenueCat si pas d'utilisateur
          await Purchases.logOut();
        }

        // Charger les packages disponibles
        await loadOfferings();

        // Verifier le statut d'abonnement
        await checkSubscriptionStatus();
      } catch (error) {
        logger.error('Error setting up RevenueCat user:', error);
      } finally {
        setIsLoading(false);
      }
    };

    setupUser();
  }, [user?.id, isConfigured]);

  // Ecouter les changements de statut
  useEffect(() => {
    if (!isConfigured) return;

    const customerInfoUpdateListener = (customerInfo: CustomerInfo) => {
      updateSubscriptionState(customerInfo);
    };

    Purchases.addCustomerInfoUpdateListener(customerInfoUpdateListener);

    return () => {
      Purchases.removeCustomerInfoUpdateListener(customerInfoUpdateListener);
    };
  }, [isConfigured]);

  const loadOfferings = async () => {
    try {
      const offerings = await Purchases.getOfferings();
      if (offerings.current?.availablePackages) {
        setPackages(offerings.current.availablePackages);
      }
    } catch (error) {
      logger.error('Error loading offerings:', error);
    }
  };

  const checkSubscriptionStatus = async () => {
    try {
      const customerInfo = await Purchases.getCustomerInfo();
      updateSubscriptionState(customerInfo);
    } catch (error) {
      logger.error('Error checking subscription status:', error);
    }
  };

  const updateSubscriptionState = (customerInfo: CustomerInfo) => {
    const entitlement = customerInfo.entitlements.active[ENTITLEMENT_ID];

    if (entitlement) {
      setIsPremium(true);

      // Determiner le type d'abonnement
      const productId = entitlement.productIdentifier;
      if (productId.includes('yearly') || productId.includes('annual') || productId.includes('years')) {
        setCurrentPlan('yearly');
      } else {
        setCurrentPlan('monthly');
      }

      // Date d'expiration
      if (entitlement.expirationDate) {
        setExpirationDate(new Date(entitlement.expirationDate));
      }
    } else {
      setIsPremium(false);
      setCurrentPlan('free');
      setExpirationDate(null);
    }
  };

  const purchasePackage = async (pkg: PurchasesPackage): Promise<boolean> => {
    // Verifier que l'utilisateur est connecte
    if (!user) {
      Alert.alert(
        'Compte requis',
        'Vous devez avoir un compte pour vous abonner. Connectez-vous ou creez un compte.',
        [{ text: 'OK' }]
      );
      return false;
    }

    try {
      setIsLoading(true);
      const { customerInfo } = await Purchases.purchasePackage(pkg);
      updateSubscriptionState(customerInfo);

      if (customerInfo.entitlements.active[ENTITLEMENT_ID]) {
        Alert.alert(
          'Bienvenue Premium !',
          'Merci pour votre abonnement. Profitez de toutes les fonctionnalites !',
          [{ text: 'Super !' }]
        );
        return true;
      }
      return false;
    } catch (error) {
      const purchaseError = error as PurchasesError;

      // L'utilisateur a annule
      if (purchaseError.userCancelled) {
        return false;
      }

      logger.error('Purchase error:', purchaseError);
      Alert.alert(
        'Erreur d\'achat',
        'Une erreur est survenue lors de l\'achat. Veuillez reessayer.',
        [{ text: 'OK' }]
      );
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const restorePurchases = async (): Promise<boolean> => {
    try {
      setIsLoading(true);
      const customerInfo = await Purchases.restorePurchases();
      updateSubscriptionState(customerInfo);

      if (customerInfo.entitlements.active[ENTITLEMENT_ID]) {
        Alert.alert(
          'Achats restaures',
          'Votre abonnement Premium a ete restaure avec succes !',
          [{ text: 'OK' }]
        );
        return true;
      } else {
        Alert.alert(
          'Aucun achat trouve',
          'Aucun abonnement actif n\'a ete trouve pour ce compte.',
          [{ text: 'OK' }]
        );
        return false;
      }
    } catch (error) {
      logger.error('Restore error:', error);
      Alert.alert(
        'Erreur',
        'Impossible de restaurer les achats. Veuillez reessayer.',
        [{ text: 'OK' }]
      );
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const refreshSubscriptionStatus = async () => {
    await checkSubscriptionStatus();
  };

  return (
    <SubscriptionContext.Provider
      value={{
        isPremium,
        isLoading,
        currentPlan,
        expirationDate,
        packages,
        purchasePackage,
        restorePurchases,
        refreshSubscriptionStatus,
      }}
    >
      {children}
    </SubscriptionContext.Provider>
  );
}

export function useSubscription() {
  const context = useContext(SubscriptionContext);
  if (context === undefined) {
    throw new Error('useSubscription must be used within a SubscriptionProvider');
  }
  return context;
}
