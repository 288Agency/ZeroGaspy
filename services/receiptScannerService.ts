/**
 * Service de scan de tickets de caisse
 * Utilise Google Cloud Vision API pour l'OCR
 * Parse le texte pour extraire les produits
 */

import * as FileSystem from 'expo-file-system/legacy';
import { sanitizeString } from '../utils/security';
import { withRateLimit, RateLimitError } from '../utils/rateLimiter';
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
  // Rayons/catégories de magasins
  'liquides',
  'epicerie',
  'épicerie',
  'cremerie',
  'crémerie',
  'boucherie',
  'charcuterie',
  'poissonnerie',
  'boulangerie',
  'patisserie',
  'pâtisserie',
  'surgeles',
  'surgelés',
  'frais',
  'fruits et legumes',
  'fruits et légumes',
  'rayon',
  'l.s.',
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
  'systeme u',
  'système u',
  'u express',
  'marché u',
  'match',
  'cora',
  'picard',
  'biocoop',
  'naturalia',
  'day by day',
  'grand frais',
  'auchan',
  'géant',
  'geant',
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

// Extensions d'images autorisées
const ALLOWED_IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.heic', '.heif'];
const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10 MB max

/**
 * Valide l'URI d'une image
 */
function validateImageUri(uri: string): { valid: boolean; error?: string } {
  if (!uri || typeof uri !== 'string') {
    return { valid: false, error: 'URI d\'image invalide' };
  }

  // Vérifier la longueur de l'URI (protection contre les attaques)
  if (uri.length > 2000) {
    return { valid: false, error: 'URI d\'image trop longue' };
  }

  // Vérifier les protocoles autorisés
  const allowedProtocols = ['file://', 'content://', 'ph://', 'assets-library://', 'http://', 'https://'];
  const hasValidProtocol = allowedProtocols.some(protocol => uri.toLowerCase().startsWith(protocol));

  if (!hasValidProtocol && !uri.startsWith('/')) {
    return { valid: false, error: 'Protocole d\'image non autorisé' };
  }

  // Vérifier l'extension si visible dans l'URI
  const uriLower = uri.toLowerCase();
  const hasExtension = ALLOWED_IMAGE_EXTENSIONS.some(ext => uriLower.includes(ext));
  // Note: Certaines URIs (content://, ph://) n'ont pas d'extension visible, on les autorise quand même

  return { valid: true };
}

/**
 * Convertit une image en base64
 */
async function imageToBase64(imageUri: string): Promise<string> {
  try {
    // Valider l'URI
    const validation = validateImageUri(imageUri);
    if (!validation.valid) {
      throw new Error(validation.error || 'Image invalide');
    }

    let localUri = imageUri;

    // Si c'est deja une URL http, on telecharge d'abord
    if (imageUri.startsWith('http')) {
      // Vérifier que c'est HTTPS pour les URLs externes (sauf localhost)
      if (imageUri.startsWith('http://') && !imageUri.includes('localhost') && !imageUri.includes('127.0.0.1')) {
        logger.warn('URL HTTP non sécurisée détectée, conversion en HTTPS');
        imageUri = imageUri.replace('http://', 'https://');
      }

      const destUri = FileSystem.cacheDirectory + 'receipt_temp.jpg';
      const downloadResult = await FileSystem.downloadAsync(imageUri, destUri);
      localUri = downloadResult.uri;
    }

    // Vérifier la taille du fichier avant lecture
    const fileInfo = await FileSystem.getInfoAsync(localUri);
    if (fileInfo.exists && 'size' in fileInfo && fileInfo.size > MAX_IMAGE_SIZE) {
      throw new Error('Image trop volumineuse (max 10 MB)');
    }

    // Lire le fichier en base64
    const base64 = await FileSystem.readAsStringAsync(localUri, {
      encoding: 'base64' as any,
    });

    // Vérifier que le base64 n'est pas vide
    if (!base64 || base64.length < 100) {
      throw new Error('Image corrompue ou vide');
    }

    return base64;
  } catch (error: any) {
    logger.error('Erreur conversion base64:', error.message);
    throw new Error(error.message || 'Impossible de lire l\'image');
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
 * Verifie si une ligne ressemble a un produit
 */
function looksLikeProduct(line: string): boolean {
  // Contient des mots-cles de produits alimentaires
  const foodKeywords = /lait|eau|jus|pain|beurre|fromage|yaourt|yogourt|viande|poulet|porc|boeuf|bœuf|poisson|legume|légume|fruit|pate|pâte|riz|huile|sucre|sel|cafe|café|the|thé|biscuit|chocolat|nugget|cordon|filet|escalope|pom|flageolet|risot|cristaline|dodu|casseg|jambon|saucisse|oeuf|œuf|creme|crème|salade|tomate|carotte|oignon|banane|pomme|orange|citron|sauce|veloute|puree|purée|galet|mais|maïs|noodle|pois|vermicelle|mayonnaise|aioli|penne|coude|raclette|sojasun|delice|kefir|mozzarella|emmental|padano|galbani|activia|andros|lactel|barilla|panzani|bjorg/i;
  const hasFoodKeyword = foodKeywords.test(line);

  // Ressemble à un code produit de supermarché (contient des lettres ET des chiffres avec format type "U 400G", "4X100G")
  const hasProductCode = /\d+[xX]?\d*\s*(G|KG|CL|ML|L)\b/i.test(line) && /[A-Za-z]{2,}/.test(line);

  // Contient au moins 2 lettres consécutives (nom de produit)
  const hasLetters = /[A-Za-zÀ-ÿ]{2,}/.test(line);

  return hasFoodKeyword || hasProductCode || hasLetters;
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
 * Parse une ligne de ticket pour extraire produit et quantite
 * Note: La detection des prix a ete desactivee car peu fiable
 */
function parseReceiptLine(line: string): ReceiptItem | null {
  // Nettoyer la ligne
  let cleanLine = line.trim();

  // Log pour debug - voir le contenu brut
  if (cleanLine.length > 5) {
    logger.debug(`LIGNE BRUTE: "${cleanLine}"`);
  }

  // Verifier si c'est une ligne a ignorer
  if (shouldIgnoreLine(cleanLine)) {
    logger.debug(`  -> Ignorée (mot-clé bloquant)`);
    return null;
  }

  // Verifier si ca ressemble a un produit
  if (!looksLikeProduct(cleanLine)) {
    logger.debug(`  -> Ignorée (ne ressemble pas à un produit)`);
    return null;
  }

  let quantity = 1;
  let productName = cleanLine;

  // Supprimer les prix de la ligne (on ne les detecte plus mais on les nettoie)
  // Format: "PRODUIT 3,95 €" ou "PRODUIT 3.95€" ou "PRODUIT 3,95"
  productName = productName.replace(/\s+\d+[.,]\d{2}\s*[€E]?\s*$/i, '').trim();
  productName = productName.replace(/\s+\d+[.,]\d{2}\s*[€E]\s*\d{0,2}\s*$/i, '').trim();

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
    selected: true,
    category: detectCategory(productName),
  };
}

/**
 * Vérifie si une ligne ressemble à un nom de produit
 */
function isProductNameLine(line: string): boolean {
  const trimmed = line.trim();
  // Doit contenir des lettres (au moins 2 consécutives)
  if (!/[A-Za-zÀ-ÿ]{2,}/.test(trimmed)) return false;
  // Ne doit pas être juste un prix
  if (/^\d+[.,]\d{2}\s*[€E]?\s*\d{0,2}\s*$/.test(trimmed)) return false;
  // Longueur minimale
  if (trimmed.length < 5) return false;
  // Ne doit pas contenir certains mots-clés d'en-tête
  const headerKeywords = /^(>>>>|total|sous-total|tva|paiement|carte|especes|rendu|merci|ticket|caisse)/i;
  if (headerKeywords.test(trimmed)) return false;
  return true;
}

/**
 * Parse le texte OCR pour extraire les produits
 * Note: La detection des prix a ete desactivee car peu fiable
 */
function parseReceiptText(text: string): ReceiptItem[] {
  const lines = text.split('\n');
  const items: ReceiptItem[] = [];
  const seenNames = new Set<string>();

  logger.info(`=== DEBUT PARSING ${lines.length} lignes ===`);

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.length < 3) continue;

    // Ignorer les lignes qui sont juste des prix
    if (/^\d+[.,]\d{2}\s*[€E]?\s*\d{0,2}\s*$/.test(trimmed)) {
      continue;
    }

    // Verifier si c'est un nom de produit valide
    if (isProductNameLine(trimmed)) {
      const item = createItemFromName(trimmed);
      if (item) {
        const normalizedName = item.name.toLowerCase();
        if (!seenNames.has(normalizedName)) {
          seenNames.add(normalizedName);
          items.push(item);
          logger.info(`✓ PRODUIT: "${item.name}" | Qté: ${item.quantity}`);
        }
      }
    }
  }

  logger.info(`=== FIN PARSING: ${items.length} produits trouvés ===`);
  return items;
}

/**
 * Crée un item à partir d'un nom de produit
 */
function createItemFromName(name: string): ReceiptItem | null {
  let productName = name.trim();
  let quantity = 1;

  // Supprimer les prix eventuels de la ligne
  productName = productName.replace(/\s+\d+[.,]\d{2}\s*[€E]?\s*\d{0,2}\s*$/i, '').trim();

  // Extraire la quantité du nom
  // Pattern 1: "X2" ou "x2" à la fin
  const qtyEndMatch = productName.match(/[xX](\d+)\s*$/);
  if (qtyEndMatch) {
    quantity = parseInt(qtyEndMatch[1], 10);
    productName = productName.replace(/[xX]\d+\s*$/, '').trim();
  }

  // Pattern 2: "2x" au début
  const qtyStartMatch = productName.match(/^(\d+)\s*[xX]\s*/);
  if (qtyStartMatch && quantity === 1) {
    quantity = parseInt(qtyStartMatch[1], 10);
    productName = productName.replace(/^\d+\s*[xX]\s*/, '').trim();
  }

  // Pattern 3: Pack "12X50CL", "4X100G"
  const packMatch = productName.match(/(\d+)\s*[xX]\s*\d+\s*(CL|ML|L|G|KG)/i);
  if (packMatch && quantity === 1) {
    const packQty = parseInt(packMatch[1], 10);
    if (packQty > 1 && packQty <= 50) {
      quantity = packQty;
    }
  }

  // Nettoyer et formater le nom
  productName = productName.replace(/^\d+\s+/, '').trim();
  if (!productName || productName.length < 3) return null;

  // Formater (première lettre majuscule)
  productName = productName
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');

  return {
    id: `receipt-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    name: productName,
    quantity: Math.max(1, Math.min(quantity, 99)),
    selected: true,
    category: detectCategory(productName),
  };
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

    // Appeler l'API Vision avec rate limiting
    logger.info('Appel de Google Cloud Vision API');
    const rawText = await withRateLimit('google-vision', () =>
      callVisionAPI(base64, apiKey)
    );

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
