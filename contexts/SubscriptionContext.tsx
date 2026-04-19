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

// 🛠️ MODE DÉVELOPPEMENT - Désactivé pour sécurité
// Pour tester le premium en dev : utiliser RevenueCat sandbox
const ENABLE_PREMIUM_IN_DEV = false;

export type SubscriptionPlan = 'free' | 'monthly' | 'yearly' | 'family_monthly' | 'family_yearly';

interface SubscriptionContextType {
  isPremium: boolean;
  isFamily: boolean;
  isLoading: boolean;
  currentPlan: SubscriptionPlan;
  expirationDate: Date | null;
  packages: PurchasesPackage[];
  purchasePackage: (pkg: PurchasesPackage) => Promise<boolean>;
  restorePurchases: () => Promise<boolean>;
  refreshSubscriptionStatus: () => Promise<void>;
  reloadOfferings: () => Promise<void>;
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

interface SubscriptionProviderProps {
  children: ReactNode;
}

export function SubscriptionProvider({ children }: SubscriptionProviderProps) {
  const { user } = useAuth();
  const [isPremium, setIsPremium] = useState(ENABLE_PREMIUM_IN_DEV);
  const [isFamily, setIsFamily] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPlan, setCurrentPlan] = useState<SubscriptionPlan>(ENABLE_PREMIUM_IN_DEV ? 'yearly' : 'free');
  const [expirationDate, setExpirationDate] = useState<Date | null>(null);
  const [packages, setPackages] = useState<PurchasesPackage[]>([]);
  const [isConfigured, setIsConfigured] = useState(false);

  // Mode développement : forcer premium
  useEffect(() => {
    if (ENABLE_PREMIUM_IN_DEV) {
      logger.info('🛠️ MODE DEV : Premium activé gratuitement pour tester');
      setIsPremium(true);
      setCurrentPlan('yearly');
      setIsLoading(false);
    }
  }, []);

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
        // Identifier l'utilisateur si connecte, sinon utiliser un utilisateur anonyme
        if (user?.id) {
          await Purchases.logIn(user.id);
          logger.info('RevenueCat user identified:', user.id);
        }
        // Note: On ne fait plus de logOut() quand pas d'utilisateur
        // RevenueCat utilise automatiquement un ID anonyme

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
      logger.info('RevenueCat offerings loaded:', {
        hasCurrentOffering: !!offerings.current,
        currentOfferingId: offerings.current?.identifier,
        packagesCount: offerings.current?.availablePackages?.length || 0,
        allOfferingsCount: Object.keys(offerings.all).length,
      });

      if (offerings.current?.availablePackages) {
        setPackages(offerings.current.availablePackages);
        logger.info('Packages set:', offerings.current.availablePackages.map(p => p.identifier));
      } else {
        // Essayer de trouver un offering alternatif
        const allOfferingKeys = Object.keys(offerings.all);
        if (allOfferingKeys.length > 0) {
          const firstOffering = offerings.all[allOfferingKeys[0]];
          if (firstOffering?.availablePackages) {
            setPackages(firstOffering.availablePackages);
            logger.info('Using fallback offering:', allOfferingKeys[0]);
          }
        } else {
          logger.warn('No offerings available from RevenueCat');
        }
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
    // Debug: afficher toutes les entitlements reçues
    const activeEntitlementKeys = Object.keys(customerInfo.entitlements.active);
    const allEntitlementKeys = Object.keys(customerInfo.entitlements.all);
    logger.info('RevenueCat entitlements debug:', {
      expectedId: ENTITLEMENT_ID,
      activeEntitlements: activeEntitlementKeys,
      allEntitlements: allEntitlementKeys,
      activeSubscriptions: customerInfo.activeSubscriptions,
    });

    if (activeEntitlementKeys.length > 0 && !customerInfo.entitlements.active[ENTITLEMENT_ID]) {
      logger.warn(
        `ENTITLEMENT_ID mismatch! Expected "${ENTITLEMENT_ID}" but got: [${activeEntitlementKeys.join(', ')}]`
      );
    }

    const entitlement = customerInfo.entitlements.active[ENTITLEMENT_ID];

    if (entitlement) {
      setIsPremium(true);
      logger.info('Premium activated:', { productId: entitlement.productIdentifier });

      // Determiner le type d'abonnement
      const productId = entitlement.productIdentifier;
      const isFamilyProduct = productId.includes('family');
      setIsFamily(isFamilyProduct);
      if (isFamilyProduct) {
        if (productId.includes('yearly') || productId.includes('annual') || productId.includes('years')) {
          setCurrentPlan('family_yearly');
        } else {
          setCurrentPlan('family_monthly');
        }
      } else if (productId.includes('yearly') || productId.includes('annual') || productId.includes('years')) {
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
      setIsFamily(false);
      setCurrentPlan('free');
      setExpirationDate(null);
      logger.info('No active premium entitlement found');
    }
  };

  const purchasePackage = async (pkg: PurchasesPackage): Promise<boolean> => {
    try {
      setIsLoading(true);

      // RevenueCat gère les achats anonymes nativement
      // L'achat sera lié au compte quand l'utilisateur se connectera
      const { customerInfo } = await Purchases.purchasePackage(pkg);
      logger.info('Purchase completed, checking entitlements...', {
        activeEntitlements: Object.keys(customerInfo.entitlements.active),
        expectedEntitlement: ENTITLEMENT_ID,
      });
      updateSubscriptionState(customerInfo);

      if (customerInfo.entitlements.active[ENTITLEMENT_ID]) {
        Alert.alert(
          'Bienvenue Premium !',
          'Merci pour votre abonnement. Profitez de toutes les fonctionnalites !',
          [{ text: 'Super !' }]
        );
        return true;
      }

      // L'achat a reussi cote Store mais l'entitlement n'est pas trouve
      logger.warn('Purchase succeeded but entitlement not found!', {
        expected: ENTITLEMENT_ID,
        got: Object.keys(customerInfo.entitlements.active),
      });
      Alert.alert(
        'Achat effectue',
        'L\'achat a ete effectue mais l\'activation n\'a pas pu etre verifiee. Essayez "Restaurer les achats" dans quelques instants.',
        [{ text: 'OK' }]
      );
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

  const reloadOfferings = async () => {
    setIsLoading(true);
    try {
      await loadOfferings();
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SubscriptionContext.Provider
      value={{
        isPremium,
        isFamily,
        isLoading,
        currentPlan,
        expirationDate,
        packages,
        purchasePackage,
        restorePurchases,
        refreshSubscriptionStatus,
        reloadOfferings,
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
