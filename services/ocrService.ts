/**
 * Service OCR sécurisé utilisant l'Edge Function Supabase
 * Les clés API Mindee et Google Vision sont stockées côté serveur
 */

import * as FileSystem from 'expo-file-system/legacy';
import { supabase } from '../config/supabase';
import logger from '../utils/logger';

// Types (compatibles avec l'ancienne interface)
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
  provider?: 'mindee' | 'google-vision';
}

/**
 * Convertit l'image en base64
 */
async function imageToBase64(imageUri: string): Promise<string> {
  try {
    logger.info('📁 Conversion image en base64:', imageUri);
    let localUri = imageUri;

    // Si c'est une URL http, télécharger d'abord
    if (imageUri.startsWith('http')) {
      logger.info('⬇️ Téléchargement image HTTP...');
      const destUri = FileSystem.cacheDirectory + 'receipt_temp.jpg';
      const downloadResult = await FileSystem.downloadAsync(imageUri, destUri);
      localUri = downloadResult.uri;
      logger.info('✅ Image téléchargée:', localUri);
    }

    // Vérifier que le fichier existe
    const fileInfo = await FileSystem.getInfoAsync(localUri);
    logger.debug('📊 Info fichier:', JSON.stringify(fileInfo));

    if (!fileInfo.exists) {
      throw new Error('Fichier image introuvable');
    }

    if ('size' in fileInfo) {
      logger.info(`📏 Taille image: ${(fileInfo.size / 1024).toFixed(2)} KB`);
    }

    // Lire en base64
    logger.info('🔄 Lecture base64...');
    const base64 = await FileSystem.readAsStringAsync(localUri, {
      encoding: 'base64',
    });

    if (!base64 || base64.length < 100) {
      throw new Error('Image corrompue ou vide');
    }

    logger.info(`✅ Base64 créé: ${(base64.length / 1024).toFixed(2)} KB`);
    return base64;
  } catch (error: any) {
    logger.error('Erreur conversion base64:', error.message);
    throw new Error('Impossible de lire l\'image');
  }
}

/**
 * Scanne un ticket de caisse via l'Edge Function Supabase
 * @param imageUri URI de l'image du ticket
 * @param preferredProvider Provider OCR préféré ('mindee' | 'google-vision')
 */
export async function scanReceiptSecure(
  imageUri: string,
  preferredProvider?: 'mindee' | 'google-vision'
): Promise<ReceiptScanResult> {
  try {
    logger.info('🚀 Démarrage scan OCR sécurisé via Edge Function');

    // Valider l'URI
    if (!imageUri || typeof imageUri !== 'string') {
      return {
        success: false,
        items: [],
        error: 'URI de l\'image invalide',
      };
    }

    // Convertir l'image en base64
    const base64Image = await imageToBase64(imageUri);

    // Appeler l'Edge Function Supabase
    logger.info('🌐 Appel Edge Function ocr-scan...');
    const { data, error } = await supabase.functions.invoke('ocr-scan', {
      body: {
        imageBase64: base64Image,
        preferredProvider,
      },
    });

    if (error) {
      logger.error('❌ Erreur Edge Function:', error);
      return {
        success: false,
        items: [],
        error: error.message || 'Erreur lors du scan OCR',
      };
    }

    if (!data || !data.success) {
      logger.error('❌ Scan OCR échoué:', data?.error);
      return {
        success: false,
        items: [],
        error: data?.error || 'Le scan du ticket a échoué',
      };
    }

    logger.info(`✅ Scan réussi avec ${data.provider}:`, data.items.length, 'items trouvés');
    return data;

  } catch (error: any) {
    logger.error('❌ Erreur scan OCR:', error.message);
    return {
      success: false,
      items: [],
      error: error.message || 'Une erreur est survenue lors du scan',
    };
  }
}

/**
 * Alias pour compatibilité avec l'ancienne API
 * @deprecated Utiliser scanReceiptSecure() à la place
 */
export async function scanReceiptWithMindee(
  imageUri: string
): Promise<ReceiptScanResult> {
  logger.warn('⚠️ scanReceiptWithMindee() est deprecated, utilisez scanReceiptSecure()');
  return scanReceiptSecure(imageUri, 'mindee');
}

/**
 * Alias pour compatibilité avec l'ancienne API Google Vision
 * @deprecated Utiliser scanReceiptSecure() à la place
 */
export async function scanReceipt(
  imageUri: string,
  _apiKey?: string // Ignoré, la clé est maintenant côté serveur
): Promise<ReceiptScanResult> {
  logger.warn('⚠️ scanReceipt() est deprecated, utilisez scanReceiptSecure()');
  return scanReceiptSecure(imageUri, 'google-vision');
}
