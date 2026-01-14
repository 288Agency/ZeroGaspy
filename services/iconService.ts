// ============================================
// ICON SERVICE
// Attribution automatique d'icônes selon le nom
// ============================================

import { Ionicons } from '@expo/vector-icons';

type IoniconsName = keyof typeof Ionicons.glyphMap;

// ============================================
// ICÔNES POUR LES ALIMENTS
// ============================================

interface FoodIconMapping {
  keywords: string[];
  icon: IoniconsName;
  color?: string;
  category?: string;
}

const FOOD_ICON_MAPPINGS: FoodIconMapping[] = [
  // Fruits 🍎
  { keywords: ['pomme', 'pommes'], icon: 'apple', color: '#EF4444', category: 'fruits' },
  { keywords: ['banane', 'bananes'], icon: 'moon', color: '#FCD34D', category: 'fruits' },
  { keywords: ['orange', 'oranges', 'clémentine'], icon: 'basketball', color: '#F97316', category: 'fruits' },
  { keywords: ['fraise', 'fraises'], icon: 'heart', color: '#F43F5E', category: 'fruits' },
  { keywords: ['raisin', 'raisins'], icon: 'ellipse', color: '#8B5CF6', category: 'fruits' },
  { keywords: ['citron', 'citrons', 'lime'], icon: 'water', color: '#FDE047', category: 'fruits' },
  { keywords: ['poire', 'poires'], icon: 'water-outline', color: '#A3E635', category: 'fruits' },
  { keywords: ['kiwi', 'kiwis'], icon: 'ellipse-outline', color: '#84CC16', category: 'fruits' },
  { keywords: ['mangue', 'mangues'], icon: 'leaf', color: '#FB923C', category: 'fruits' },
  { keywords: ['ananas'], icon: 'diamond', color: '#FACC15', category: 'fruits' },
  { keywords: ['melon'], icon: 'disc', color: '#FCA5A5', category: 'fruits' },
  { keywords: ['pastèque'], icon: 'disc-outline', color: '#FB7185', category: 'fruits' },
  { keywords: ['cerise', 'cerises'], icon: 'radio-button-on', color: '#DC2626', category: 'fruits' },
  { keywords: ['pêche', 'pêches', 'nectarine'], icon: 'ellipse', color: '#FDBA74', category: 'fruits' },
  { keywords: ['abricot', 'abricots'], icon: 'ellipse', color: '#FB923C', category: 'fruits' },

  // Légumes 🥕
  { keywords: ['tomate', 'tomates'], icon: 'nutrition', color: '#EF4444', category: 'légumes' },
  { keywords: ['carotte', 'carottes'], icon: 'nutrition-outline', color: '#F97316', category: 'légumes' },
  { keywords: ['salade', 'laitue'], icon: 'leaf', color: '#22C55E', category: 'légumes' },
  { keywords: ['brocoli', 'brocolis'], icon: 'leaf', color: '#16A34A', category: 'légumes' },
  { keywords: ['courgette', 'courgettes'], icon: 'remove', color: '#84CC16', category: 'légumes' },
  { keywords: ['aubergine', 'aubergines'], icon: 'water', color: '#7C3AED', category: 'légumes' },
  { keywords: ['poivron', 'poivrons'], icon: 'flame', color: '#EF4444', category: 'légumes' },
  { keywords: ['concombre', 'concombres'], icon: 'ellipse-outline', color: '#22C55E', category: 'légumes' },
  { keywords: ['oignon', 'oignons', 'échalote'], icon: 'ellipse', color: '#A16207', category: 'légumes' },
  { keywords: ['ail'], icon: 'ellipse-outline', color: '#F3F4F6', category: 'légumes' },
  { keywords: ['pomme de terre', 'patate', 'patates'], icon: 'ellipse', color: '#D97706', category: 'légumes' },
  { keywords: ['champignon', 'champignons'], icon: 'umbrella', color: '#A8A29E', category: 'légumes' },
  { keywords: ['épinard', 'épinards'], icon: 'leaf', color: '#15803D', category: 'légumes' },
  { keywords: ['haricot', 'haricots'], icon: 'remove', color: '#16A34A', category: 'légumes' },
  { keywords: ['petit pois', 'petits pois', 'pois'], icon: 'ellipse', color: '#84CC16', category: 'légumes' },
  { keywords: ['maïs'], icon: 'apps', color: '#FCD34D', category: 'légumes' },
  { keywords: ['chou'], icon: 'leaf-outline', color: '#22C55E', category: 'légumes' },
  { keywords: ['radis'], icon: 'radio-button-on', color: '#F43F5E', category: 'légumes' },
  { keywords: ['navet', 'navets'], icon: 'ellipse', color: '#E9D5FF', category: 'légumes' },
  { keywords: ['poireau', 'poireaux'], icon: 'remove', color: '#A3E635', category: 'légumes' },
  { keywords: ['céleri'], icon: 'leaf', color: '#22C55E', category: 'légumes' },
  { keywords: ['asperge', 'asperges'], icon: 'trending-up', color: '#84CC16', category: 'légumes' },

  // Viandes & Poissons 🍖
  { keywords: ['poulet', 'volaille'], icon: 'restaurant', color: '#F59E0B', category: 'viande' },
  { keywords: ['boeuf', 'steak', 'viande'], icon: 'restaurant-outline', color: '#DC2626', category: 'viande' },
  { keywords: ['porc', 'jambon'], icon: 'restaurant', color: '#FB923C', category: 'viande' },
  { keywords: ['poisson', 'saumon', 'thon'], icon: 'fish', color: '#3B82F6', category: 'poisson' },
  { keywords: ['crevette', 'crevettes'], icon: 'bug', color: '#F472B6', category: 'poisson' },
  { keywords: ['moule', 'moules', 'fruits de mer'], icon: 'water', color: '#475569', category: 'poisson' },
  { keywords: ['saucisse', 'saucisses', 'merguez'], icon: 'remove', color: '#B91C1C', category: 'viande' },
  { keywords: ['bacon', 'lardons'], icon: 'remove-outline', color: '#DC2626', category: 'viande' },

  // Produits laitiers 🥛
  { keywords: ['lait'], icon: 'water', color: '#F3F4F6', category: 'produits laitiers' },
  { keywords: ['yaourt', 'yogurt', 'yogourt'], icon: 'cafe', color: '#F3F4F6', category: 'produits laitiers' },
  { keywords: ['fromage', 'gruyère', 'emmental', 'comté'], icon: 'stop', color: '#FBBF24', category: 'produits laitiers' },
  { keywords: ['beurre'], icon: 'square', color: '#FDE68A', category: 'produits laitiers' },
  { keywords: ['crème'], icon: 'water-outline', color: '#F9FAFB', category: 'produits laitiers' },
  { keywords: ['mozzarella'], icon: 'ellipse', color: '#F9FAFB', category: 'produits laitiers' },

  // Œufs 🥚
  { keywords: ['oeuf', 'oeufs', 'œuf', 'œufs'], icon: 'egg', color: '#FEF3C7', category: 'oeufs' },

  // Pain & Céréales 🍞
  { keywords: ['pain', 'baguette'], icon: 'remove', color: '#D97706', category: 'boulangerie' },
  { keywords: ['pâtes', 'spaghetti', 'penne'], icon: 'git-branch', color: '#FDE68A', category: 'épicerie' },
  { keywords: ['riz'], icon: 'apps', color: '#F9FAFB', category: 'épicerie' },
  { keywords: ['céréales'], icon: 'apps-outline', color: '#D97706', category: 'épicerie' },
  { keywords: ['farine'], icon: 'square-outline', color: '#F9FAFB', category: 'épicerie' },
  { keywords: ['croissant', 'viennoiserie'], icon: 'moon', color: '#F59E0B', category: 'boulangerie' },

  // Boissons 🥤
  { keywords: ['eau', 'bouteille'], icon: 'water', color: '#3B82F6', category: 'boissons' },
  { keywords: ['jus', 'juice'], icon: 'beer', color: '#FB923C', category: 'boissons' },
  { keywords: ['soda', 'coca'], icon: 'beer-outline', color: '#EF4444', category: 'boissons' },
  { keywords: ['café'], icon: 'cafe', color: '#78350F', category: 'boissons' },
  { keywords: ['thé'], icon: 'cafe-outline', color: '#16A34A', category: 'boissons' },
  { keywords: ['vin'], icon: 'wine', color: '#7C2D12', category: 'boissons' },
  { keywords: ['bière'], icon: 'beer', color: '#FBBF24', category: 'boissons' },

  // Snacks & Sucreries 🍫
  { keywords: ['chocolat'], icon: 'square', color: '#78350F', category: 'snacks' },
  { keywords: ['biscuit', 'biscuits', 'gâteau'], icon: 'ellipse', color: '#D97706', category: 'snacks' },
  { keywords: ['chips'], icon: 'layers', color: '#FBBF24', category: 'snacks' },
  { keywords: ['bonbon', 'bonbons'], icon: 'star', color: '#F472B6', category: 'snacks' },
  { keywords: ['glace', 'crème glacée'], icon: 'snow', color: '#FDE68A', category: 'snacks' },

  // Condiments & Épices 🧂
  { keywords: ['sel'], icon: 'apps', color: '#F3F4F6', category: 'épices' },
  { keywords: ['poivre'], icon: 'apps-outline', color: '#1F2937', category: 'épices' },
  { keywords: ['sucre'], icon: 'square-outline', color: '#F3F4F6', category: 'épices' },
  { keywords: ['huile'], icon: 'water', color: '#FDE68A', category: 'épices' },
  { keywords: ['vinaigre'], icon: 'water-outline', color: '#78350F', category: 'épices' },
  { keywords: ['moutarde'], icon: 'ellipse', color: '#FACC15', category: 'épices' },
  { keywords: ['ketchup'], icon: 'water', color: '#DC2626', category: 'épices' },
  { keywords: ['mayonnaise', 'mayo'], icon: 'water-outline', color: '#FEF3C7', category: 'épices' },

  // Autres
  { keywords: ['miel'], icon: 'water', color: '#FBBF24', category: 'épices' },
  { keywords: ['confiture'], icon: 'water', color: '#F43F5E', category: 'épices' },
  { keywords: ['nutella', 'pâte à tartiner'], icon: 'water', color: '#78350F', category: 'snacks' },
];

const DEFAULT_FOOD_ICON: IoniconsName = 'nutrition-outline';
const DEFAULT_FOOD_COLOR = '#3C6E47';

/**
 * Trouve l'icône appropriée pour un aliment
 */
export function getFoodIcon(foodName: string): {
  icon: IoniconsName;
  color: string;
  category?: string;
} {
  if (!foodName) {
    return { icon: DEFAULT_FOOD_ICON, color: DEFAULT_FOOD_COLOR };
  }

  const normalized = foodName.toLowerCase().trim();

  // Recherche exacte d'abord
  const exactMatch = FOOD_ICON_MAPPINGS.find(mapping =>
    mapping.keywords.some(keyword => normalized === keyword)
  );

  if (exactMatch) {
    return {
      icon: exactMatch.icon,
      color: exactMatch.color || DEFAULT_FOOD_COLOR,
      category: exactMatch.category,
    };
  }

  // Recherche de correspondance partielle (mot contenu)
  const partialMatch = FOOD_ICON_MAPPINGS.find(mapping =>
    mapping.keywords.some(keyword => normalized.includes(keyword))
  );

  if (partialMatch) {
    return {
      icon: partialMatch.icon,
      color: partialMatch.color || DEFAULT_FOOD_COLOR,
      category: partialMatch.category,
    };
  }

  // Icône par défaut
  return { icon: DEFAULT_FOOD_ICON, color: DEFAULT_FOOD_COLOR };
}

// ============================================
// ICÔNES POUR LES LISTES
// ============================================

interface ListIconMapping {
  keywords: string[];
  icon: IoniconsName;
  color?: string;
}

const LIST_ICON_MAPPINGS: ListIconMapping[] = [
  // Espaces de stockage
  { keywords: ['frigo', 'réfrigérateur', 'frigidaire'], icon: 'snow-outline', color: '#3B82F6' },
  { keywords: ['congélateur', 'congélo', 'freezer'], icon: 'thermometer-outline', color: '#06B6D4' },
  { keywords: ['placard', 'armoire', 'meuble'], icon: 'cube-outline', color: '#A16207' },
  { keywords: ['cave', 'cellier'], icon: 'home-outline', color: '#7C2D12' },
  { keywords: ['garde-manger', 'garde manger', 'réserve'], icon: 'apps-outline', color: '#78350F' },

  // Types de produits
  { keywords: ['fruits', 'fruit'], icon: 'leaf', color: '#FB923C' },
  { keywords: ['légumes', 'légume'], icon: 'leaf-outline', color: '#22C55E' },
  { keywords: ['viande', 'viandes'], icon: 'restaurant-outline', color: '#DC2626' },
  { keywords: ['poisson', 'poissons'], icon: 'fish-outline', color: '#3B82F6' },
  { keywords: ['laitier', 'laitiers', 'laitage'], icon: 'water-outline', color: '#F3F4F6' },
  { keywords: ['boisson', 'boissons'], icon: 'beer-outline', color: '#3B82F6' },
  { keywords: ['snack', 'snacks', 'grignotage'], icon: 'fast-food-outline', color: '#F59E0B' },

  // Occasions / Repas
  { keywords: ['courses'], icon: 'cart-outline', color: '#3C6E47' },
  { keywords: ['urgence', 'urgent'], icon: 'warning-outline', color: '#EF4444' },
  { keywords: ['semaine'], icon: 'calendar-outline', color: '#6366F1' },
  { keywords: ['mois'], icon: 'calendar-outline', color: '#8B5CF6' },
  { keywords: ['petitdéj', 'petit-déj', 'petit déjeuner'], icon: 'sunny-outline', color: '#FBBF24' },
  { keywords: ['déjeuner'], icon: 'restaurant-outline', color: '#F97316' },
  { keywords: ['dîner', 'diner'], icon: 'moon-outline', color: '#6366F1' },
  { keywords: ['apéro', 'apéritif'], icon: 'wine-outline', color: '#F43F5E' },

  // Événements
  { keywords: ['fête', 'party'], icon: 'gift-outline', color: '#F472B6' },
  { keywords: ['anniversaire'], icon: 'cake-outline', color: '#FB923C' },
  { keywords: ['pique-nique', 'pique nique'], icon: 'sunny-outline', color: '#84CC16' },
  { keywords: ['barbecue', 'bbq'], icon: 'flame-outline', color: '#EF4444' },

  // Personnes
  { keywords: ['enfant', 'enfants', 'kids'], icon: 'happy-outline', color: '#F472B6' },
  { keywords: ['bébé'], icon: 'heart-outline', color: '#FCA5A5' },
  { keywords: ['famille'], icon: 'people-outline', color: '#3C6E47' },

  // Spécial
  { keywords: ['bio', 'biologique'], icon: 'leaf-outline', color: '#16A34A' },
  { keywords: ['vegan', 'végétarien'], icon: 'leaf', color: '#84CC16' },
  { keywords: ['sans gluten', 'gluten-free'], icon: 'close-circle-outline', color: '#F59E0B' },
  { keywords: ['surgelé', 'surgelés'], icon: 'snow', color: '#3B82F6' },
  { keywords: ['frais'], icon: 'sparkles-outline', color: '#22C55E' },

  // Autres
  { keywords: ['travail', 'bureau'], icon: 'briefcase-outline', color: '#475569' },
  { keywords: ['sport'], icon: 'fitness-outline', color: '#EF4444' },
  { keywords: ['voyage'], icon: 'airplane-outline', color: '#0EA5E9' },
];

const DEFAULT_LIST_ICON: IoniconsName = 'list-outline';
const DEFAULT_LIST_COLOR = '#3C6E47';

/**
 * Trouve l'icône appropriée pour une liste
 */
export function getListIcon(listName: string): {
  icon: IoniconsName;
  color: string;
} {
  if (!listName) {
    return { icon: DEFAULT_LIST_ICON, color: DEFAULT_LIST_COLOR };
  }

  const normalized = listName.toLowerCase().trim();

  // Recherche exacte d'abord
  const exactMatch = LIST_ICON_MAPPINGS.find(mapping =>
    mapping.keywords.some(keyword => normalized === keyword)
  );

  if (exactMatch) {
    return {
      icon: exactMatch.icon,
      color: exactMatch.color || DEFAULT_LIST_COLOR,
    };
  }

  // Recherche de correspondance partielle (mot contenu)
  const partialMatch = LIST_ICON_MAPPINGS.find(mapping =>
    mapping.keywords.some(keyword => normalized.includes(keyword))
  );

  if (partialMatch) {
    return {
      icon: partialMatch.icon,
      color: partialMatch.color || DEFAULT_LIST_COLOR,
    };
  }

  // Icône par défaut
  return { icon: DEFAULT_LIST_ICON, color: DEFAULT_LIST_COLOR };
}

/**
 * Obtient une couleur basée sur la catégorie
 */
export function getCategoryColor(category?: string): string {
  const categoryColors: Record<string, string> = {
    fruits: '#FB923C',
    légumes: '#22C55E',
    viande: '#DC2626',
    poisson: '#3B82F6',
    'produits laitiers': '#F3F4F6',
    oeufs: '#FEF3C7',
    boulangerie: '#D97706',
    épicerie: '#78350F',
    boissons: '#3B82F6',
    snacks: '#F59E0B',
    épices: '#D97706',
  };

  return categoryColors[category || ''] || DEFAULT_FOOD_COLOR;
}

/**
 * Obtient toutes les catégories disponibles
 */
export function getAllCategories(): string[] {
  const categories = new Set<string>();

  FOOD_ICON_MAPPINGS.forEach(mapping => {
    if (mapping.category) {
      categories.add(mapping.category);
    }
  });

  return Array.from(categories).sort();
}

/**
 * Obtient les icônes suggérées pour un début de mot
 */
export function getSuggestedFoodIcons(prefix: string, limit: number = 5): Array<{
  name: string;
  icon: IoniconsName;
  color: string;
  category?: string;
}> {
  if (!prefix || prefix.length < 2) {
    return [];
  }

  const normalized = prefix.toLowerCase().trim();
  const suggestions: Array<{
    name: string;
    icon: IoniconsName;
    color: string;
    category?: string;
  }> = [];

  FOOD_ICON_MAPPINGS.forEach(mapping => {
    mapping.keywords.forEach(keyword => {
      if (keyword.startsWith(normalized) && suggestions.length < limit) {
        suggestions.push({
          name: keyword,
          icon: mapping.icon,
          color: mapping.color || DEFAULT_FOOD_COLOR,
          category: mapping.category,
        });
      }
    });
  });

  return suggestions;
}
