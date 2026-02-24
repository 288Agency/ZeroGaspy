// Service pour envoyer les feedbacks par email via Supabase Edge Function + Resend
import * as FileSystem from 'expo-file-system';
import Constants from 'expo-constants';
import { sanitizeString, validateEmail, escapeHtml } from './security';
import logger from './logger';

const SUPABASE_URL = Constants.expoConfig?.extra?.supabaseUrl || '';
const SUPABASE_ANON_KEY = Constants.expoConfig?.extra?.supabaseAnonKey || '';

export interface FeedbackData {
  name: string;
  email: string;
  message: string;
  images?: string[]; // URIs des images
}

interface ImageAttachment {
  filename: string;
  content: string; // base64
  type: string;
}

/**
 * Valide et sanitize les donnees de feedback
 */
function validateFeedbackData(data: FeedbackData): { valid: boolean; error?: string; sanitized?: FeedbackData } {
  // Valider le nom
  const name = sanitizeString(data.name, 100);
  if (!name || name.length < 2) {
    return { valid: false, error: 'Le nom doit contenir au moins 2 caracteres' };
  }

  // Valider l'email
  const emailValidation = validateEmail(data.email);
  if (!emailValidation.valid) {
    return { valid: false, error: emailValidation.error };
  }

  // Valider le message
  const message = sanitizeString(data.message, 2000);
  if (!message || message.length < 5) {
    return { valid: false, error: 'Le message doit contenir au moins 5 caracteres' };
  }

  // Valider les images (max 5)
  const images = data.images?.slice(0, 5);

  return {
    valid: true,
    sanitized: {
      name: escapeHtml(name),
      email: sanitizeString(data.email, 254),
      message: escapeHtml(message),
      images,
    },
  };
}

/**
 * Convertit les URIs d'images en base64 pour l'envoi
 */
async function convertImagesToBase64(imageUris: string[]): Promise<ImageAttachment[]> {
  const attachments: ImageAttachment[] = [];

  for (let i = 0; i < imageUris.length; i++) {
    try {
      const uri = imageUris[i];
      const base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: 'base64',
      });

      // Determiner le type MIME
      const extension = uri.split('.').pop()?.toLowerCase() || 'jpg';
      const mimeTypes: Record<string, string> = {
        jpg: 'image/jpeg',
        jpeg: 'image/jpeg',
        png: 'image/png',
        gif: 'image/gif',
        webp: 'image/webp',
      };

      attachments.push({
        filename: `image_${i + 1}.${extension}`,
        content: base64,
        type: mimeTypes[extension] || 'image/jpeg',
      });
    } catch (error) {
      logger.warn(`Impossible de lire l'image ${i + 1}:`, error);
    }
  }

  return attachments;
}

export async function sendFeedback(data: FeedbackData): Promise<{ success: boolean; message?: string }> {
  try {
    // Verifier la configuration Supabase
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      throw new Error('Configuration Supabase manquante');
    }

    // Valider les donnees
    const validation = validateFeedbackData(data);
    if (!validation.valid || !validation.sanitized) {
      throw new Error(validation.error || 'Donnees invalides');
    }

    const sanitizedData = validation.sanitized;

    // Convertir les images en base64 si presentes
    let images: ImageAttachment[] | undefined;
    if (sanitizedData.images && sanitizedData.images.length > 0) {
      images = await convertImagesToBase64(sanitizedData.images);
    }

    // Appeler la Edge Function Supabase
    const response = await fetch(`${SUPABASE_URL}/functions/v1/feedback`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({
        name: sanitizedData.name,
        email: sanitizedData.email,
        message: sanitizedData.message,
        images: images,
      }),
    });

    let result;
    try {
      result = await response.json();
    } catch {
      throw new Error('Erreur de connexion au serveur. Verifiez votre connexion internet.');
    }

    if (!response.ok) {
      const errorMsg = result?.error || `Erreur serveur (${response.status})`;
      throw new Error(errorMsg);
    }

    logger.info('Feedback envoye avec succes');
    return { success: true, message: result.message || 'Feedback envoye avec succes' };

  } catch (error: any) {
    logger.error("Erreur lors de l'envoi du feedback:", error.message);
    throw error;
  }
}
