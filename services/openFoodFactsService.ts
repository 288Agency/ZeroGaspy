// Service pour l'API OpenFoodFacts
// Documentation: https://world.openfoodfacts.org/data

import AsyncStorage from '@react-native-async-storage/async-storage';
import { validateBarcode, sanitizeString } from '../utils/security';
import { canMakeRequest, recordRequest } from '../utils/rateLimiter';
import logger from '../utils/logger';

// Durée de validité du cache (30 jours en millisecondes)
const CACHE_TTL = 30 * 24 * 60 * 60 * 1000;
const CACHE_KEY_PREFIX = 'openfoodfacts_cache_';

export interface OpenFoodFactsProduct {
  name: string;
  brand?: string;
  quantity?: string;
  imageUrl?: string;
  categories?: string;
  nutriScore?: string;
}

export interface OpenFoodFactsResponse {
  status: number;
  status_verbose: string;
  product?: {
    product_name?: string;
    product_name_fr?: string;
    brands?: string;
    quantity?: string;
    image_url?: string;
    image_front_url?: string;
    image_front_small_url?: string;
    categories?: string;
    categories_tags?: string[];
    nutriscore_grade?: string;
  };
}

interface CachedProduct {
  data: OpenFoodFactsProduct;
  timestamp: number;
}

// Timeout pour les requêtes API (10 secondes)
const API_TIMEOUT = 10000;

/**
 * Récupère un produit depuis le cache
 */
async function getCachedProduct(barcode: string): Promise<OpenFoodFactsProduct | null> {
  try {
    const cacheKey = `${CACHE_KEY_PREFIX}${barcode}`;
    const cached = await AsyncStorage.getItem(cacheKey);

    if (!cached) return null;

    const cachedData: CachedProduct = JSON.parse(cached);
    const now = Date.now();

    // Vérifier si le cache est expiré
    if (now - cachedData.timestamp > CACHE_TTL) {
      await AsyncStorage.removeItem(cacheKey);
      return null;
    }

    logger.info('Produit trouvé dans le cache:', barcode);
    return cachedData.data;
  } catch (error: any) {
    logger.error('Erreur lecture cache:', error.message);
    return null;
  }
}

/**
 * Sauvegarde un produit dans le cache
 */
async function cacheProduct(barcode: string, product: OpenFoodFactsProduct): Promise<void> {
  try {
    const cacheKey = `${CACHE_KEY_PREFIX}${barcode}`;
    const cachedData: CachedProduct = {
      data: product,
      timestamp: Date.now(),
    };
    await AsyncStorage.setItem(cacheKey, JSON.stringify(cachedData));
    logger.info('Produit mis en cache:', barcode);
  } catch (error: any) {
    logger.error('Erreur sauvegarde cache:', error.message);
  }
}

/**
 * Nettoie le cache expiré (à appeler périodiquement)
 */
export async function cleanExpiredCache(): Promise<void> {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const cacheKeys = keys.filter((key) => key.startsWith(CACHE_KEY_PREFIX));
    const now = Date.now();
    let cleanedCount = 0;

    for (const key of cacheKeys) {
      const cached = await AsyncStorage.getItem(key);
      if (cached) {
        const cachedData: CachedProduct = JSON.parse(cached);
        if (now - cachedData.timestamp > CACHE_TTL) {
          await AsyncStorage.removeItem(key);
          cleanedCount++;
        }
      }
    }

    if (cleanedCount > 0) {
      logger.info(`${cleanedCount} entrées de cache nettoyées`);
    }
  } catch (error: any) {
    logger.error('Erreur nettoyage cache:', error.message);
  }
}

/**
 * Récupère les informations d'un produit depuis OpenFoodFacts (avec cache)
 * @param barcode Le code-barres du produit (EAN-13, EAN-8, UPC, etc.)
 * @returns Les informations du produit ou null si non trouvé
 */
export async function getProductByBarcode(barcode: string): Promise<OpenFoodFactsProduct | null> {
  // Valider le code-barres
  const validation = validateBarcode(barcode);
  if (!validation.valid) {
    logger.warn('Code-barres invalide:', validation.error);
    return null;
  }

  // Nettoyer le code-barres
  const cleanBarcode = sanitizeString(barcode, 14).replace(/\D/g, '');

  // Vérifier le cache d'abord
  const cachedProduct = await getCachedProduct(cleanBarcode);
  if (cachedProduct) {
    return cachedProduct;
  }

  try {
    // Vérifier le rate limiting
    if (!canMakeRequest('openfoodfacts')) {
      logger.warn('Rate limit atteint pour OpenFoodFacts');
      return null;
    }

    // Créer un controller pour le timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT);

    // Enregistrer la requête
    recordRequest('openfoodfacts');

    const response = await fetch(
      `https://world.openfoodfacts.org/api/v0/product/${cleanBarcode}.json`,
      {
        headers: {
          'User-Agent': 'ZeroGaspy - App anti-gaspillage - https://github.com/zerogaspy',
        },
        signal: controller.signal,
      }
    );

    clearTimeout(timeoutId);

    if (!response.ok) {
      logger.error('Erreur HTTP OpenFoodFacts:', response.status);
      return null;
    }

    const data: OpenFoodFactsResponse = await response.json();

    if (data.status !== 1 || !data.product) {
      logger.info('Produit non trouvé dans OpenFoodFacts');
      return null;
    }

    const product = data.product;

    // Sanitize les données retournées
    const productData: OpenFoodFactsProduct = {
      name: sanitizeString(product.product_name_fr || product.product_name || 'Produit inconnu', 200),
      brand: product.brands ? sanitizeString(product.brands, 100) : undefined,
      quantity: product.quantity ? sanitizeString(product.quantity, 50) : undefined,
      imageUrl: product.image_front_url || product.image_url || undefined,
      categories: product.categories ? sanitizeString(product.categories, 500) : undefined,
      nutriScore: product.nutriscore_grade?.toUpperCase() || undefined,
    };

    // Sauvegarder dans le cache
    await cacheProduct(cleanBarcode, productData);

    return productData;
  } catch (error: any) {
    if (error.name === 'AbortError') {
      logger.error('Timeout lors de la requête OpenFoodFacts');
    } else {
      logger.error('Erreur lors de la récupération du produit:', error.message);
    }
    return null;
  }
}

/**
 * Extrait la catégorie principale d'un produit
 * Catégories alignées sur la taxonomie OpenFoodFacts
 */
export function extractMainCategory(categories?: string): string | undefined {
  if (!categories) return undefined;

  // OpenFoodFacts renvoie les catégories du général au spécifique, séparées par des virgules
  // Ex: "Aliments et boissons à base de végétaux, Condiments, Sauces, Sauces tomates"
  const categoryList = categories.split(',').map(c => c.trim().toLowerCase());
  // On joint aussi pour chercher dans la chaîne complète
  const fullString = categoryList.join(' ');

  // Mapping vers les catégories de l'app (par ordre de priorité)
  // Les catégories plus spécifiques sont en premier pour être matchées en priorité
  const categoryMappings = [
    // Charcuterie - avant Viande pour éviter que "jambon" soit classé en Viande
    {
      keywords: ['charcuterie', 'jambon', 'saucisson', 'pâté', 'rillettes', 'salami', 'chorizo', 'mortadelle', 'rosette', 'coppa', 'bresaola', 'lardons', 'bacon', 'knack', 'saucisse sèche', 'terrine'],
      category: 'Charcuterie',
    },

    // Fromages - avant Produits laitiers pour plus de précision
    {
      keywords: ['fromage', 'fromages', 'camembert', 'brie', 'comté', 'emmental', 'gruyère', 'roquefort', 'chèvre', 'mozzarella', 'parmesan', 'raclette', 'reblochon', 'munster', 'cheddar', 'feta', 'gouda', 'beaufort', 'cantal', 'saint-nectaire', 'maroilles', 'pont-l\'évêque', 'bleu'],
      category: 'Fromages',
    },

    // Confiseries - avant Snacks
    {
      keywords: ['confiserie', 'bonbon', 'bonbons', 'chocolat', 'chocolats', 'praline', 'caramel', 'nougat', 'réglisse', 'guimauve', 'marshmallow', 'dragée', 'sucette', 'chewing-gum', 'pâte de fruits', 'tablette de chocolat', 'barre chocolatée', 'confiseries'],
      category: 'Confiseries',
    },

    // Snacks & Biscuits
    {
      keywords: ['snack', 'biscuit', 'biscuits', 'chips', 'crackers', 'gâteau apéritif', 'bretzel', 'pop-corn', 'galette de riz', 'biscuits apéritifs', 'tuiles', 'soufflés', 'extrudés', 'tortilla', 'nachos', 'snacks salés', 'biscuits sucrés', 'cookies', 'madeleines', 'barres de céréales'],
      category: 'Snacks & Biscuits',
    },

    // Condiments & Sauces - avant Épicerie
    {
      keywords: ['sauce', 'sauces', 'condiment', 'condiments', 'ketchup', 'mayonnaise', 'moutarde', 'vinaigre', 'vinaigrette', 'pesto', 'harissa', 'tabasco', 'sriracha', 'soja', 'worcestershire', 'aïoli', 'tartare', 'béarnaise', 'barbecue'],
      category: 'Condiments & Sauces',
    },

    // Petit-déjeuner & Céréales
    {
      keywords: ['petit-déjeuner', 'petit déjeuner', 'céréales petit', 'muesli', 'granola', 'corn flakes', 'flocons', 'porridge', 'confiture', 'confitures', 'marmelade', 'miel', 'pâte à tartiner', 'nutella', 'sirop', 'céréales pour'],
      category: 'Petit-déjeuner & Céréales',
    },

    // Plats préparés
    {
      keywords: ['plat préparé', 'plats préparés', 'plat cuisiné', 'plats cuisinés', 'pizza', 'pizzas', 'quiche', 'lasagne', 'lasagnes', 'ravioli', 'raviolis', 'hachis', 'gratin', 'couscous', 'taboulé', 'sushi', 'nems', 'samoussa', 'wrap', 'sandwich', 'sandwiches', 'burrito', 'kebab', 'croque-monsieur', 'plats traiteur'],
      category: 'Plats préparés',
    },

    // Oeufs
    {
      keywords: ['oeuf', 'oeufs', 'œuf', 'œufs'],
      category: 'Oeufs',
    },

    // Fruits & Légumes
    {
      keywords: ['légume', 'légumes', 'vegetables', 'salade', 'carotte', 'tomate', 'courgette', 'poivron', 'aubergine', 'brocoli', 'épinard', 'haricot vert', 'petit pois', 'radis', 'navet', 'poireau', 'céleri', 'artichaut', 'asperge', 'chou', 'fenouil', 'endive', 'concombre', 'betterave', 'champignon', 'pomme de terre', 'oignon'],
      category: 'Légumes',
      mustNotContain: ['jus de'],
    },
    {
      keywords: ['fruit', 'fruits', 'pomme', 'banane', 'orange', 'fraise', 'raisin', 'poire', 'kiwi', 'mangue', 'ananas', 'melon', 'pastèque', 'cerise', 'pêche', 'abricot', 'prune', 'clémentine', 'mandarine', 'pamplemousse', 'myrtille', 'framboise', 'mûre', 'grenade', 'litchi', 'figue', 'datte'],
      category: 'Fruits',
      mustNotContain: ['jus de', 'boisson', 'confiture', 'compote', 'fruits de mer'],
    },

    // Viande (après Charcuterie)
    {
      keywords: ['viande', 'viandes', 'bœuf', 'boeuf', 'porc', 'poulet', 'volaille', 'agneau', 'veau', 'dinde', 'canard', 'lapin', 'steak', 'escalope', 'côtelette', 'filet', 'rôti', 'saucisse', 'merguez', 'boudin', 'andouillette'],
      category: 'Viande',
      mustNotContain: ['charcuterie'],
    },

    // Poisson & Fruits de mer
    {
      keywords: ['poisson', 'poissons', 'saumon', 'thon', 'cabillaud', 'merlu', 'colin', 'sole', 'bar', 'loup', 'dorade', 'sardine', 'maquereau', 'truite', 'lieu', 'anchois', 'fruits de mer', 'crevette', 'crevettes', 'moule', 'moules', 'huître', 'langouste', 'homard', 'crabe', 'calamar', 'poulpe', 'Saint-Jacques'],
      category: 'Poisson & Fruits de mer',
    },

    // Produits laitiers (après Fromages)
    {
      keywords: ['lait', 'yaourt', 'yogourt', 'crème fraîche', 'crème', 'beurre', 'produits laitiers', 'laitier', 'laitiers', 'fromage blanc', 'faisselle', 'petit-suisse', 'kéfir', 'skyr', 'dessert lacté'],
      category: 'Produits laitiers',
      mustNotContain: ['fromage', 'lait de coco', 'lait d\'amande', 'lait de soja'],
    },

    // Boulangerie (ex-Pain)
    {
      keywords: ['pain', 'pains', 'baguette', 'boulangerie', 'viennoiserie', 'croissant', 'brioche', 'pain de mie', 'pain complet', 'pain de seigle', 'pain aux céréales', 'focaccia', 'ciabatta', 'naan', 'pita', 'bagel', 'pain au chocolat', 'chausson'],
      category: 'Boulangerie',
    },

    // Surgelés
    {
      keywords: ['surgelé', 'surgelés', 'congelé', 'congelés', 'frozen'],
      category: 'Surgelés',
    },

    // Boissons
    {
      keywords: ['boisson', 'boissons', 'eau', 'jus', 'soda', 'cola', 'limonade', 'thé glacé', 'thé', 'café', 'bière', 'bières', 'vin', 'vins', 'cidre', 'champagne', 'apéritif', 'spiritueux', 'whisky', 'rhum', 'vodka', 'gin', 'cocktail', 'sirop', 'nectar', 'smoothie', 'energy drink', 'kombucha', 'lait végétal'],
      category: 'Boissons',
    },

    // Épicerie - catégorie fourre-tout pour le reste
    {
      keywords: ['épicerie', 'conserve', 'en conserve', 'appertisé', 'pâte', 'pâtes', 'riz', 'céréale', 'céréales', 'farine', 'huile', 'épice', 'épices', 'sucre', 'sel', 'légumineuse', 'lentille', 'pois chiche', 'haricot sec', 'semoule', 'quinoa', 'boulgour', 'tomate pelée', 'concentré', 'bouillon', 'herbe', 'herbes'],
      category: 'Épicerie',
    },
  ];

  // Inverser la liste des catégories OFF pour chercher d'abord dans les plus spécifiques
  const reversedList = [...categoryList].reverse();

  for (const catString of reversedList) {
    for (const mapping of categoryMappings) {
      const hasKeyword = mapping.keywords.some(keyword => catString.includes(keyword));

      if (hasKeyword) {
        if (mapping.mustNotContain) {
          const hasExclusion = mapping.mustNotContain.some(exclude =>
            catString.includes(exclude) || fullString.includes(exclude)
          );
          if (hasExclusion) continue;
        }
        return mapping.category;
      }
    }
  }

  return undefined;
}
