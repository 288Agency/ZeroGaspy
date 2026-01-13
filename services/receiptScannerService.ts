/**
 * Service de scan de tickets de caisse
 * Utilise Google Cloud Vision API pour l'OCR
 * Parse le texte pour extraire les produits
 */

import * as FileSystem from 'expo-file-system/legacy';
import { sanitizeString } from '../utils/security';
import logger from '../utils/logger';

// Configuration
const API_TIMEOUT = 30000; // 30 secondes pour l'OCR

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
}

interface VisionAPIResponse {
  responses: Array<{
    textAnnotations?: Array<{
      description: string;
      boundingPoly?: {
        vertices: Array<{ x: number; y: number }>;
      };
    }>;
    fullTextAnnotation?: {
      text: string;
    };
    error?: {
      code: number;
      message: string;
    };
  }>;
}

// Mots-cles a ignorer (totaux, TVA, etc.)
const IGNORE_KEYWORDS = [
  'total',
  'sous-total',
  'sous total',
  'subtotal',
  'tva',
  't.v.a',
  'ttc',
  'ht',
  'especes',
  'espèces',
  'cb',
  'carte',
  'carte bancaire',
  'rendu',
  'monnaie',
  'paiement',
  'merci',
  'a bientot',
  'à bientôt',
  'ticket',
  'caisse',
  'vendeur',
  'heure',
  'date',
  'siret',
  'siren',
  'tél',
  'tel',
  'telephone',
  'adresse',
  'remise',
  'reduction',
  'réduction',
  'avoir',
  'solde',
  'fidélité',
  'fidelite',
  'points',
  'bon de',
  'reçu',
  'facture',
  'bienvenue',
  'operateur',
  'opérateur',
  'tpv',
  'nice',
  'paris',
  'lyon',
  'marseille',
  'nantes',
  'bordeaux',
  'lille',
  'strasbourg',
  'montpellier',
  'rennes',
  'test',
  '>>>>',
  '====',
  '----',
  'www.',
  'http',
  '@',
];

// Enseignes connues (pour détecter le nom du magasin)
const KNOWN_STORES = [
  'carrefour',
  'leclerc',
  'auchan',
  'intermarche',
  'intermarché',
  'lidl',
  'aldi',
  'monoprix',
  'franprix',
  'casino',
  'super u',
  'hyper u',
  'match',
  'cora',
  'picard',
  'biocoop',
  'naturalia',
  'day by day',
];

// Catégories automatiques basées sur les mots-clés
const CATEGORY_KEYWORDS: Record<string, string[]> = {
  'fruits': ['pomme', 'poire', 'banane', 'orange', 'citron', 'fraise', 'raisin', 'kiwi', 'mangue', 'ananas', 'cerise', 'abricot', 'pêche', 'peche', 'melon', 'pastèque', 'pasteque', 'fruit'],
  'légumes': ['tomate', 'carotte', 'salade', 'laitue', 'courgette', 'aubergine', 'poivron', 'oignon', 'ail', 'pomme de terre', 'pdt', 'haricot', 'petit pois', 'épinard', 'epinard', 'chou', 'brocoli', 'concombre', 'radis', 'légume', 'legume'],
  'viande': ['boeuf', 'bœuf', 'poulet', 'porc', 'agneau', 'veau', 'steak', 'escalope', 'côte', 'cote', 'saucisse', 'jambon', 'lard', 'bacon', 'viande', 'dinde', 'canard'],
  'poisson': ['saumon', 'thon', 'cabillaud', 'colin', 'sole', 'truite', 'crevette', 'moule', 'huitre', 'huître', 'poisson', 'sardine', 'maquereau'],
  'produits laitiers': ['lait', 'yaourt', 'yogourt', 'fromage', 'beurre', 'crème', 'creme', 'camembert', 'emmental', 'gruyère', 'gruyere', 'comté', 'comte', 'mozzarella', 'feta'],
  'boulangerie': ['pain', 'baguette', 'croissant', 'brioche', 'pain de mie', 'ficelle', 'boule', 'campagne'],
  'épicerie': ['pâtes', 'pates', 'riz', 'huile', 'vinaigre', 'sel', 'poivre', 'sucre', 'farine', 'café', 'cafe', 'thé', 'the', 'chocolat', 'biscuit', 'céréales', 'cereales', 'conserve', 'sauce'],
  'boissons': ['eau', 'jus', 'soda', 'coca', 'limonade', 'sirop', 'vin', 'bière', 'biere'],
  'surgelés': ['surgelé', 'surgele', 'glace', 'frozen', 'congelé', 'congele'],
};

/**
 * Convertit une image en base64
 */
async function imageToBase64(imageUri: string): Promise<string> {
  try {
    let localUri = imageUri;

    // Si c'est deja une URL http, on telecharge d'abord
    if (imageUri.startsWith('http')) {
      const destUri = FileSystem.cacheDirectory + 'receipt_temp.jpg';
      const downloadResult = await FileSystem.downloadAsync(imageUri, destUri);
      localUri = downloadResult.uri;
    }

    // Lire le fichier en base64
    const base64 = await FileSystem.readAsStringAsync(localUri, {
      encoding: 'base64' as any,
    });

    return base64;
  } catch (error: any) {
    logger.error('Erreur conversion base64:', error.message);
    throw new Error('Impossible de lire l\'image');
  }
}

/**
 * Appelle Google Cloud Vision API pour l'OCR
 */
async function callVisionAPI(base64Image: string, apiKey: string): Promise<string> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT);

  try {
    const response = await fetch(
      `https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          requests: [
            {
              image: {
                content: base64Image,
              },
              features: [
                {
                  type: 'TEXT_DETECTION',
                  maxResults: 1,
                },
              ],
              imageContext: {
                languageHints: ['fr', 'en'],
              },
            },
          ],
        }),
        signal: controller.signal,
      }
    );

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      logger.error('Erreur Vision API:', response.status, errorText);
      throw new Error(`Erreur API: ${response.status}`);
    }

    const data: VisionAPIResponse = await response.json();

    if (data.responses[0].error) {
      throw new Error(data.responses[0].error.message);
    }

    const fullText = data.responses[0].fullTextAnnotation?.text || '';

    if (!fullText) {
      throw new Error('Aucun texte detecte sur le document');
    }

    return fullText;
  } catch (error: any) {
    clearTimeout(timeoutId);

    if (error.name === 'AbortError') {
      throw new Error('Timeout - l\'analyse a pris trop de temps');
    }
    throw error;
  }
}

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

  return undefined;
}

/**
 * Verifie si une ligne doit etre ignoree
 */
function shouldIgnoreLine(line: string): boolean {
  const lowerLine = line.toLowerCase().trim();

  // Ignorer les lignes trop courtes
  if (line.length < 4) return true;

  // Ignorer les lignes avec seulement des chiffres, symboles ou espaces
  if (/^[\d\s.,€$%\-+/*=:]+$/.test(line)) return true;

  // Ignorer les lignes qui sont juste un nombre (codes internes)
  if (/^\d+$/.test(line.trim())) return true;

  // Ignorer les numeros de telephone
  if (/^\d{2}[.\s]?\d{2}[.\s]?\d{2}[.\s]?\d{2}[.\s]?\d{2}$/.test(line.replace(/\D/g, '').length >= 10 ? line : '')) return true;
  if (/tel|telephone|phone/i.test(line)) return true;

  // Ignorer les dates et heures seules
  if (/^\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}$/.test(line.trim())) return true;
  if (/^\d{1,2}:\d{2}(:\d{2})?$/.test(line.trim())) return true;

  // Ignorer les lignes de categories (>>>> ou ==== ou ----)
  if (/^[>\-=]{3,}/.test(line.trim())) return true;

  // Ignorer les mots-cles
  for (const keyword of IGNORE_KEYWORDS) {
    if (lowerLine.includes(keyword)) return true;
  }

  // Ignorer si c'est un numero SIRET/SIREN
  if (/\d{9,14}/.test(line) && !/\d+[.,]\d{2}\s*€?/.test(line)) return true;

  return false;
}

/**
 * Verifie si une ligne ressemble a un produit (contient un prix)
 */
function looksLikeProduct(line: string): boolean {
  // Un produit a generalement un prix (X,XX ou X.XX) suivi optionnellement de €
  const hasPrice = /\d+[.,]\d{2}\s*€?\s*$/.test(line.trim());

  // Ou contient des mots-cles de produits alimentaires
  const foodKeywords = /lait|eau|jus|pain|beurre|fromage|yaourt|viande|poulet|porc|boeuf|poisson|legume|fruit|pate|riz|huile|sucre|sel|cafe|the|biscuit|chocolat|nugget|cordon|filet|escalope|pom|flageolet|risot|cristaline|dodu|casseg/i;
  const hasFoodKeyword = foodKeywords.test(line);

  return hasPrice || hasFoodKeyword;
}

/**
 * Extrait le nom du magasin du texte
 */
function extractStoreName(text: string): string | undefined {
  const lines = text.split('\n').slice(0, 10); // Chercher dans les 10 premières lignes

  for (const line of lines) {
    const lowerLine = line.toLowerCase();
    for (const store of KNOWN_STORES) {
      if (lowerLine.includes(store)) {
        return sanitizeString(line.trim(), 50);
      }
    }
  }

  return undefined;
}

/**
 * Extrait la date du ticket
 */
function extractDate(text: string): string | undefined {
  // Patterns de date courants
  const datePatterns = [
    /(\d{2})\/(\d{2})\/(\d{4})/,  // DD/MM/YYYY
    /(\d{2})-(\d{2})-(\d{4})/,    // DD-MM-YYYY
    /(\d{2})\.(\d{2})\.(\d{4})/,  // DD.MM.YYYY
  ];

  for (const pattern of datePatterns) {
    const match = text.match(pattern);
    if (match) {
      return `${match[1]}/${match[2]}/${match[3]}`;
    }
  }

  return undefined;
}

/**
 * Parse une ligne de ticket pour extraire produit, quantite et prix
 */
function parseReceiptLine(line: string): ReceiptItem | null {
  // Nettoyer la ligne
  let cleanLine = line.trim();

  // Verifier si c'est une ligne a ignorer
  if (shouldIgnoreLine(cleanLine)) {
    return null;
  }

  // Verifier si ca ressemble a un produit
  if (!looksLikeProduct(cleanLine)) {
    return null;
  }

  let quantity = 1;
  let price: number | undefined;
  let productName = cleanLine;

  // Extraire le prix (generalement a la fin: X,XX € ou X.XX)
  const priceMatch = cleanLine.match(/(\d+[.,]\d{2})\s*€?\s*$/);
  if (priceMatch) {
    price = parseFloat(priceMatch[1].replace(',', '.'));
    productName = cleanLine.replace(priceMatch[0], '').trim();
  }

  // Extraire la quantite - plusieurs patterns possibles
  // Pattern 1: "X2" ou "x2" a la fin du nom (ex: "CORDON BLEU X2")
  const qtyEndMatch = productName.match(/[xX](\d+)\s*$/);
  if (qtyEndMatch) {
    quantity = parseInt(qtyEndMatch[1], 10);
    productName = productName.replace(/[xX]\d+\s*$/, '').trim();
  }

  // Pattern 2: "2x" ou "2 x" au debut (ex: "2x YAOURT")
  const qtyStartMatch = productName.match(/^(\d+)\s*[xX]\s*/);
  if (qtyStartMatch && quantity === 1) {
    quantity = parseInt(qtyStartMatch[1], 10);
    productName = productName.replace(/^\d+\s*[xX]\s*/, '').trim();
  }

  // Pattern 3: nombre au debut suivi d'un espace (ex: "2 TOMATES")
  const qtySpaceMatch = productName.match(/^(\d+)\s+(?=[A-Za-zÀ-ÿ])/);
  if (qtySpaceMatch && quantity === 1) {
    const potentialQty = parseInt(qtySpaceMatch[1], 10);
    // Seulement si c'est un petit nombre (1-20), sinon c'est probablement un code
    if (potentialQty <= 20) {
      quantity = potentialQty;
      productName = productName.replace(/^\d+\s+/, '').trim();
    }
  }

  // Pattern 4: contient une info de pack (ex: "12X50CL", "20X90G")
  const packMatch = productName.match(/(\d+)\s*[xX]\s*\d+\s*(CL|ML|L|G|KG|GR)/i);
  if (packMatch && quantity === 1) {
    // C'est un pack, on peut extraire la quantite du pack si > 1
    const packQty = parseInt(packMatch[1], 10);
    if (packQty > 1 && packQty <= 50) {
      quantity = packQty;
    }
  }

  // Nettoyer le nom du produit
  // Supprimer les codes produit au debut (ex: "11" seul)
  productName = productName.replace(/^\d+\s+/, '').trim();

  // Supprimer les infos de poids/volume a la fin si deja traitees
  productName = sanitizeString(productName, 100);

  // Ignorer si le nom est trop court ou vide
  if (!productName || productName.length < 3) {
    return null;
  }

  // Ignorer si le nom ne contient que des chiffres
  if (/^\d+$/.test(productName)) {
    return null;
  }

  // Formater le nom (premiere lettre majuscule, reste en minuscule)
  productName = productName
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');

  return {
    id: `receipt-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    name: productName,
    quantity: Math.max(1, Math.min(quantity, 99)),
    price,
    selected: true,
    category: detectCategory(productName),
  };
}

/**
 * Parse le texte OCR pour extraire les produits
 */
function parseReceiptText(text: string): ReceiptItem[] {
  const lines = text.split('\n');
  const items: ReceiptItem[] = [];
  const seenNames = new Set<string>();

  for (const line of lines) {
    const item = parseReceiptLine(line);

    if (item) {
      // Éviter les doublons
      const normalizedName = item.name.toLowerCase();
      if (!seenNames.has(normalizedName)) {
        seenNames.add(normalizedName);
        items.push(item);
      }
    }
  }

  return items;
}

/**
 * Scanne un ticket de caisse et extrait les produits
 * @param imageUri URI de l'image du ticket
 * @param apiKey Cle API Google Cloud Vision
 */
export async function scanReceipt(imageUri: string, apiKey: string): Promise<ReceiptScanResult> {
  try {
    logger.info('Debut du scan du ticket');

    // Valider l'URI de l'image
    if (!imageUri || typeof imageUri !== 'string') {
      return {
        success: false,
        items: [],
        error: 'Image invalide',
      };
    }

    // Valider la cle API
    if (!apiKey || apiKey.length < 10) {
      return {
        success: false,
        items: [],
        error: 'Cle API Google Cloud Vision non configuree',
      };
    }

    // Convertir l'image en base64
    logger.info('Conversion de l\'image en base64');
    const base64 = await imageToBase64(imageUri);

    // Appeler l'API Vision
    logger.info('Appel de Google Cloud Vision API');
    const rawText = await callVisionAPI(base64, apiKey);

    logger.debug('Texte OCR brut:', rawText.substring(0, 500));

    // Extraire les informations
    const storeName = extractStoreName(rawText);
    const date = extractDate(rawText);
    const items = parseReceiptText(rawText);

    logger.info(`${items.length} produits detectes`);

    if (items.length === 0) {
      return {
        success: true,
        items: [],
        storeName,
        date,
        rawText,
        error: 'Aucun produit detecte sur le ticket',
      };
    }

    return {
      success: true,
      items,
      storeName,
      date,
      rawText,
    };
  } catch (error: any) {
    logger.error('Erreur scan ticket:', error.message);
    return {
      success: false,
      items: [],
      error: error.message || 'Erreur lors du scan du ticket',
    };
  }
}

/**
 * Teste si la clé API Google Vision est valide
 */
export async function testVisionAPIKey(apiKey: string): Promise<boolean> {
  try {
    // Image test minimaliste (1x1 pixel blanc en base64)
    const testImage = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

    const response = await fetch(
      `https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requests: [{ image: { content: testImage }, features: [{ type: 'TEXT_DETECTION' }] }],
        }),
      }
    );

    return response.ok;
  } catch {
    return false;
  }
}
