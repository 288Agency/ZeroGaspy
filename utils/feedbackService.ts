// Service pour envoyer les feedbacks par email
import * as MailComposer from 'expo-mail-composer';
import { sanitizeString, validateEmail, escapeHtml } from './security';
import logger from './logger';

// Email de réception des feedbacks depuis variable d'environnement
const FEEDBACK_EMAIL = process.env.EXPO_PUBLIC_FEEDBACK_EMAIL || 'contact@288agency.com';

export interface FeedbackData {
  name: string;
  email: string;
  message: string;
  images?: string[]; // URIs des images
}

/**
 * Valide et sanitize les données de feedback
 */
function validateFeedbackData(data: FeedbackData): { valid: boolean; error?: string; sanitized?: FeedbackData } {
  // Valider le nom
  const name = sanitizeString(data.name, 100);
  if (!name || name.length < 2) {
    return { valid: false, error: 'Le nom doit contenir au moins 2 caractères' };
  }

  // Valider l'email
  const emailValidation = validateEmail(data.email);
  if (!emailValidation.valid) {
    return { valid: false, error: emailValidation.error };
  }

  // Valider le message
  const message = sanitizeString(data.message, 2000);
  if (!message || message.length < 10) {
    return { valid: false, error: 'Le message doit contenir au moins 10 caractères' };
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

export async function sendFeedback(data: FeedbackData): Promise<{ success: boolean; message?: string }> {
  try {
    // Valider les données
    const validation = validateFeedbackData(data);
    if (!validation.valid || !validation.sanitized) {
      throw new Error(validation.error || 'Données invalides');
    }

    const sanitizedData = validation.sanitized;

    // Vérifier si l'envoi d'email est disponible
    const isAvailable = await MailComposer.isAvailableAsync();
    
    if (!isAvailable) {
      throw new Error('Aucune application email configurée sur cet appareil');
    }

    // Préparer le contenu de l'email
    const subject = `[ZeroGaspy] Feedback de ${sanitizedData.name}`;
    
    const body = `
📧 Nouveau Feedback ZeroGaspy
━━━━━━━━━━━━━━━━━━━━━━━━━━━━

👤 Nom: ${sanitizedData.name}
📩 Email: ${sanitizedData.email}

💬 Message:
${sanitizedData.message}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Envoyé depuis l'application ZeroGaspy
    `.trim();

    // Ouvrir le compositeur d'email
    const result = await MailComposer.composeAsync({
      recipients: [FEEDBACK_EMAIL],
      subject: subject,
      body: body,
      attachments: sanitizedData.images || [],
    });

    if (result.status === MailComposer.MailComposerStatus.SENT) {
      logger.info('Feedback envoyé avec succès');
      return { success: true, message: 'Feedback envoyé avec succès' };
    } else if (result.status === MailComposer.MailComposerStatus.CANCELLED) {
      throw new Error('Envoi annulé');
    } else {
      // L'utilisateur a peut-être sauvegardé en brouillon ou autre
      return { success: true, message: 'Email préparé' };
    }
  } catch (error: any) {
    logger.error('Erreur lors de l\'envoi du feedback:', error.message);
    throw error;
  }
}
