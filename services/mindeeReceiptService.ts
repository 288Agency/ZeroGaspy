/**
 * Service de scan de tickets avec Mindee Receipt OCR
 * API professionnelle spécialisée dans les tickets de caisse
 * https://developers.mindee.com/docs/receipt-ocr
 */

import * as FileSystem from 'expo-file-system/legacy';
import Constants from 'expo-constants';
import { sanitizeString } from '../utils/security';
import { withRateLimit } from '../utils/rateLimiter';
import logger from '../utils/logger';

// Configuration
const MINDEE_API_URL = 'https://api.mindee.net/v1/products/mindee/expense_receipts/v5/predict';
const API_TIMEOUT = 15000; // 15 secondes

// Types
export interface ReceiptItem {
  id: string;
  name: string;
  quantity: number;
  price?: number;
  selected: boolean;
  category?: string;
  expirationDate?: string;
}

export interface ReceiptScanResult {
  success: boolean;
  items: ReceiptItem[];
  storeName?: string;
  date?: string;
  total?: number;
  rawText?: string;
  error?: string;
  confidence?: number;
}

// Interface Mindee API Response
interface MindeeLineItem {
  description: string;
  quantity?: number;
  total_amount?: number;
  unit_price?: number;
  confidence?: number;
}

interface MindeeResponse {
  api_request: {
    status: string;
    status_code: number;
  };
  document: {
    inference: {
      prediction: {
        supplier_name: {
          value: string;
          confidence: number;
        };
        date: {
          value: string;
          confidence: number;
        };
        time: {
          value: string;
          confidence: number;
        };
        total_amount: {
          value: number;
          confidence: number;
        };
        line_items: MindeeLineItem[];
        category: {
          value: string;
          confidence: number;
        };
      };
      pages: Array<{
        prediction: any;
      }>;
    };
    ocr: {
      mvision_v1: {
        pages: Array<{
          all_words: Array<{
            text: string;
            confidence: number;
          }>;
        }>;
      };
    };
  };
}

// Mapping catégories Mindee → catégories ZeroGaspy
const CATEGORY_MAPPING: Record<string, string> = {
  'food': 'épicerie',
  'groceries': 'épicerie',
  'restaurant': 'restaurant',
  'bar': 'boissons',
  'bakery': 'boulangerie',
  'butcher': 'viande',
  'supermarket': 'épicerie',
  'convenience store': 'épicerie',
};

// Détection de catégorie basée sur les mots-clés (fallback)
const CATEGORY_KEYWORDS: Record<string, string[]> = {
  'fruits': ['pomme', 'poire', 'banane', 'orange', 'citron', 'fraise', 'raisin', 'kiwi', 'mangue', 'fruit'],
  'légumes': ['tomate', 'carotte', 'salade', 'laitue', 'courgette', 'poivron', 'oignon', 'légume', 'legume'],
  'viande': ['boeuf', 'bœuf', 'poulet', 'porc', 'agneau', 'steak', 'viande', 'jambon'],
  'poisson': ['saumon', 'thon', 'cabillaud', 'poisson', 'crevette'],
  'produits laitiers': ['lait', 'yaourt', 'fromage', 'beurre', 'crème', 'creme'],
  'boulangerie': ['pain', 'baguette', 'croissant', 'brioche'],
  'épicerie': ['pâtes', 'pates', 'riz', 'huile', 'sucre', 'farine', 'café', 'cafe'],
  'boissons': ['eau', 'jus', 'soda', 'coca', 'vin', 'bière', 'biere'],
  'surgelés': ['surgelé', 'surgele', 'glace', 'frozen'],
};

/**
 * Détecte la catégorie d'un produit basé sur son nom
 */
function detectCategory(productName: string): string | undefined {
  const lowerName = productName.toLowerCase();

  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    for (const keyword of keywords) {
      if (lowerName.includes(keyword)) {
        return category;
      }
    }
  }

  return 'épicerie'; // Catégorie par défaut
}

/**
 * Formate le nom d'un produit
 */
function formatProductName(name: string): string {
  if (!name) return '';

  // Nettoyer et formater (première lettre majuscule)
  return name
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

/**
 * Convertit une image en base64
 */
async function imageToBase64(imageUri: string): Promise<string> {
  try {
    let localUri = imageUri;

    // Si c'est une URL http, télécharger d'abord
    if (imageUri.startsWith('http')) {
      const destUri = FileSystem.cacheDirectory + 'receipt_temp.jpg';
      const downloadResult = await FileSystem.downloadAsync(imageUri, destUri);
      localUri = downloadResult.uri;
    }

    // Lire le fichier en base64
    const base64 = await FileSystem.readAsStringAsync(localUri, {
      encoding: 'base64',
    });

    if (!base64 || base64.length < 100) {
      throw new Error('Image corrompue ou vide');
    }

    return base64;
  } catch (error: any) {
    logger.error('Erreur conversion base64:', error.message);
    throw new Error('Impossible de lire l\'image');
  }
}

/**
 * Appelle Mindee Receipt OCR API
 */
async function callMindeeAPI(base64Image: string, apiKey: string): Promise<MindeeResponse> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT);

  try {
    // Créer FormData pour l'upload
    const formData = new FormData();

    // Convertir base64 en Blob
    const byteCharacters = atob(base64Image);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: 'image/jpeg' });

    formData.append('document', blob, 'receipt.jpg');

    const response = await fetch(MINDEE_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Token ${apiKey}`,
      },
      body: formData,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      logger.error('Erreur Mindee API:', response.status, errorText);

      if (response.status === 401) {
        throw new Error('Clé API Mindee invalide');
      } else if (response.status === 429) {
        throw new Error('Limite de scans atteinte. Réessayez plus tard.');
      }

      throw new Error(`Erreur API: ${response.status}`);
    }

    const data: MindeeResponse = await response.json();

    if (data.api_request.status !== 'success') {
      throw new Error('Erreur lors du traitement du document');
    }

    return data;
  } catch (error: any) {
    clearTimeout(timeoutId);

    if (error.name === 'AbortError') {
      throw new Error('Timeout - l\'analyse a pris trop de temps');
    }
    throw error;
  }
}

/**
 * Parse la réponse Mindee et extrait les produits
 */
function parseMindeeResponse(data: MindeeResponse): ReceiptScanResult {
  const prediction = data.document.inference.prediction;

  // Informations du ticket
  const storeName = prediction.supplier_name?.value
    ? sanitizeString(prediction.supplier_name.value, 50)
    : undefined;

  const date = prediction.date?.value;
  const total = prediction.total_amount?.value;

  // Extraire les produits
  const items: ReceiptItem[] = [];
  const seenNames = new Set<string>();

  if (prediction.line_items && prediction.line_items.length > 0) {
    for (const lineItem of prediction.line_items) {
      if (!lineItem.description || lineItem.description.trim().length < 2) {
        continue;
      }

      const productName = formatProductName(lineItem.description);
      const normalizedName = productName.toLowerCase();

      // Éviter les doublons
      if (seenNames.has(normalizedName)) {
        continue;
      }
      seenNames.add(normalizedName);

      const quantity = lineItem.quantity || 1;
      const price = lineItem.total_amount;

      items.push({
        id: `mindee-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        name: productName,
        quantity: Math.max(1, Math.min(Math.round(quantity), 99)),
        price: price,
        selected: true,
        category: detectCategory(productName),
      });
    }
  }

  // Calculer la confiance moyenne
  const confidences = [
    prediction.supplier_name?.confidence,
    prediction.date?.confidence,
    prediction.total_amount?.confidence,
  ].filter(c => c !== undefined && c !== null) as number[];

  const avgConfidence = confidences.length > 0
    ? confidences.reduce((sum, c) => sum + c, 0) / confidences.length
    : 0;

  logger.info(`Mindee: ${items.length} produits détectés avec ${(avgConfidence * 100).toFixed(1)}% de confiance`);

  return {
    success: true,
    items,
    storeName,
    date,
    total,
    confidence: avgConfidence,
  };
}

/**
 * Scanne un ticket de caisse avec Mindee
 * @param imageUri URI de l'image du ticket
 * @param apiKey Clé API Mindee (optionnelle, récupérée depuis config si non fournie)
 */
export async function scanReceiptWithMindee(
  imageUri: string,
  apiKey?: string
): Promise<ReceiptScanResult> {
  try {
    logger.info('🚀 Démarrage scan Mindee');

    // Récupérer la clé API depuis la config si non fournie
    const mindeeApiKey = apiKey || Constants.expoConfig?.extra?.mindeeApiKey || '';

    if (!mindeeApiKey || mindeeApiKey.length < 10) {
      return {
        success: false,
        items: [],
        error: 'Clé API Mindee non configurée',
      };
    }

    if (!imageUri || typeof imageUri !== 'string') {
      return {
        success: false,
        items: [],
        error: 'Image invalide',
      };
    }

    // Convertir l'image en base64
    logger.info('📸 Conversion de l\'image en base64');
    const base64 = await imageToBase64(imageUri);

    // Appeler l'API Mindee avec rate limiting
    logger.info('🔍 Appel de Mindee Receipt OCR API');
    const mindeeData = await withRateLimit('mindee-receipt', () =>
      callMindeeAPI(base64, mindeeApiKey)
    );

    // Parser la réponse
    const result = parseMindeeResponse(mindeeData);

    if (result.items.length === 0) {
      return {
        ...result,
        error: 'Aucun produit détecté sur le ticket',
      };
    }

    logger.info(`✅ Scan réussi: ${result.items.length} produits, confiance ${(result.confidence! * 100).toFixed(1)}%`);

    return result;
  } catch (error: any) {
    logger.error('❌ Erreur scan Mindee:', error.message);
    return {
      success: false,
      items: [],
      error: error.message || 'Erreur lors du scan du ticket',
    };
  }
}

/**
 * Teste si la clé API Mindee est valide
 */
export async function testMindeeAPIKey(apiKey: string): Promise<boolean> {
  try {
    // Image test minimaliste (1x1 pixel blanc en PNG base64)
    const testImage = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const formData = new FormData();
    const byteCharacters = atob(testImage);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: 'image/png' });
    formData.append('document', blob, 'test.png');

    const response = await fetch(MINDEE_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Token ${apiKey}`,
      },
      body: formData,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    return response.ok || response.status === 400; // 400 = image invalide mais API key valide
  } catch {
    return false;
  }
}
