// Limites pour les utilisateurs gratuits
export const FREE_LIMITS = {
  MAX_LISTS: 3,
  MAX_SHARED_LISTS: 1,
} as const;

// Clés API RevenueCat
export const REVENUECAT_API_KEY_IOS: string = 'appl_PPJvqpqEsLOilhGTcuHFqyURZLB';
export const REVENUECAT_API_KEY_ANDROID: string = 'goog_bRwtRNSivrZVCUDRYJGLheqjbtc';

// ID de l'entitlement RevenueCat (Solo + Famille partagent le même entitlement)
export const ENTITLEMENT_ID = 'Zerogaspy Pro';

// IDs des produits
export const PRODUCT_IDS = {
  MONTHLY: 'com.288agency.zerogaspy.premium.monthly',
  YEARLY: 'com.288agency.zerogaspy.premium.years',
  FAMILY_MONTHLY: 'com.288agency.zerogaspy.premium.family.monthly',
  FAMILY_YEARLY: 'com.288agency.zerogaspy.premium.family.yearly',
} as const;

// Prix affichés (fallback si RevenueCat ne retourne pas les prix)
export const FALLBACK_PRICES = {
  MONTHLY: '3,49 €',
  YEARLY: '29,99 €',
  FAMILY_MONTHLY: '6,49 €',
  FAMILY_YEARLY: '49,99 €',
} as const;

// Fonctionnalités Premium Solo
export const PREMIUM_FEATURES = [
  {
    icon: 'scan-outline' as const,
    title: 'Scans ticket illimités',
    description: 'Ajoutez vos achats en scannant vos tickets de caisse',
  },
  {
    icon: 'sparkles-outline' as const,
    title: 'Recettes IA',
    description: 'Recettes générées avec vos ingrédients expirants',
  },
  {
    icon: 'bar-chart-outline' as const,
    title: 'Stats avancées',
    description: 'Économies, CO₂, rapport mensuel partageable',
  },
  {
    icon: 'people-outline' as const,
    title: 'Partage illimité',
    description: 'Partagez toutes vos listes avec votre entourage',
  },
] as const;

// Fonctionnalités Plan Famille (en plus du Solo)
export const FAMILY_FEATURES = [
  {
    icon: 'home-outline' as const,
    title: 'Jusqu\'à 6 membres',
    description: 'Invitez toute la famille dans vos espaces',
  },
  {
    icon: 'sync-outline' as const,
    title: 'Sync temps réel',
    description: 'Modifications visibles instantanément pour tous',
  },
  {
    icon: 'notifications-outline' as const,
    title: 'Notifications partagées',
    description: 'Alertes expirations pour toute la famille',
  },
  {
    icon: 'stats-chart-outline' as const,
    title: 'Stats du foyer',
    description: 'Vue consolidée des économies de toute la famille',
  },
] as const;
