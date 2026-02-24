// Limites pour les utilisateurs gratuits
export const FREE_LIMITS = {
  MAX_LISTS: 3,
} as const;

// Clés API RevenueCat (à remplacer par vos clés)
export const REVENUECAT_API_KEY_IOS: string = 'appl_PPJvqpqEsLOilhGTcuHFqyURZLB';
export const REVENUECAT_API_KEY_ANDROID: string = 'YOUR_ANDROID_API_KEY';

// ID de l'entitlement RevenueCat
export const ENTITLEMENT_ID = 'Zerogaspy Pro';

// IDs des produits (à configurer dans RevenueCat)
export const PRODUCT_IDS = {
  MONTHLY: 'com.288agency.zerogaspy.premium.monthly',
  YEARLY: 'com.288agency.zerogaspy.premium.years',
} as const;

// Prix affichés (fallback si RevenueCat ne retourne pas les prix)
export const FALLBACK_PRICES = {
  MONTHLY: '3,99 €',
  YEARLY: '39,99 €',
} as const;

// Fonctionnalités premium
export const PREMIUM_FEATURES = [
  {
    icon: 'list-outline' as const,
    title: 'Listes illimitees',
    description: 'Creez autant de listes que vous voulez',
  },
  {
    icon: 'scan-outline' as const,
    title: 'Scanner de tickets',
    description: 'Ajoutez vos achats en scannant vos tickets de caisse',
  },
  {
    icon: 'eye-off-outline' as const,
    title: 'Sans publicite',
    description: 'Profitez de l\'app sans aucune pub',
  },
] as const;
