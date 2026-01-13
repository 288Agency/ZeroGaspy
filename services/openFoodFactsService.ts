// Service pour l'API OpenFoodFacts
// Documentation: https://world.openfoodfacts.org/data

import { validateBarcode, sanitizeString } from '../utils/security';
import logger from '../utils/logger';

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

// Timeout pour les requêtes API (10 secondes)
const API_TIMEOUT = 10000;

/**
 * Récupère les informations d'un produit depuis OpenFoodFacts
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
    return {
      name: sanitizeString(product.product_name_fr || product.product_name || 'Produit inconnu', 200),
      brand: product.brands ? sanitizeString(product.brands, 100) : undefined,
      quantity: product.quantity ? sanitizeString(product.quantity, 50) : undefined,
      imageUrl: product.image_front_url || product.image_url || undefined,
      categories: product.categories ? sanitizeString(product.categories, 500) : undefined,
      nutriScore: product.nutriscore_grade?.toUpperCase() || undefined,
    };
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
