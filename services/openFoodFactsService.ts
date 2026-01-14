// Service pour l'API OpenFoodFacts
// Documentation: https://world.openfoodfacts.org/data

import AsyncStorage from '@react-native-async-storage/async-storage';
import { validateBarcode, sanitizeString } from '../utils/security';
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
    // Créer un controller pour le timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT);

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
 */
export function extractMainCategory(categories?: string): string | undefined {
  if (!categories) return undefined;
  
  const categoryList = categories.split(',').map(c => c.trim());
  
  // Mapping vers les catégories de l'app
  const categoryMapping: Record<string, string> = {
    'fruits': 'fruits',
    'légumes': 'légumes',
    'viandes': 'viande',
    'viande': 'viande',
    'poissons': 'poisson',
    'poisson': 'poisson',
    'produits laitiers': 'produits laitiers',
    'lait': 'produits laitiers',
    'fromages': 'produits laitiers',
    'yaourts': 'produits laitiers',
    'boissons': 'boissons',
    'surgelés': 'surgelés',
    'conserves': 'conserves',
    'épicerie': 'épicerie',
    'boulangerie': 'boulangerie',
    'pain': 'boulangerie',
  };

  for (const cat of categoryList) {
    const lowerCat = cat.toLowerCase();
    for (const [key, value] of Object.entries(categoryMapping)) {
      if (lowerCat.includes(key)) {
        return value;
      }
    }
  }

  return undefined;
}
