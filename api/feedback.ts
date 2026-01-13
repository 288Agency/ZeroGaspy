import { VercelRequest, VercelResponse } from '@vercel/node';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

// Email de réception - à configurer dans les variables d'environnement
const RECIPIENT_EMAIL = process.env.FEEDBACK_RECIPIENT_EMAIL || 'feedback@zerogaspy.com';
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'ZeroGaspy <onboarding@resend.dev>';

interface FeedbackRequest {
  name: string;
  email: string;
  message: string;
  images?: Array<{
    filename: string;
    content: string; // base64
    type: string;
  }>;
}

// Validation des données
function validateFeedback(data: any): { valid: boolean; error?: string } {
  if (!data.name || typeof data.name !== 'string' || data.name.trim().length === 0) {
    return { valid: false, error: 'Le nom est requis' };
  }

  if (!data.email || typeof data.email !== 'string') {
    return { valid: false, error: 'L\'email est requis' };
  }

  // Validation basique de l'email
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(data.email)) {
    return { valid: false, error: 'Format d\'email invalide' };
  }

  if (!data.message || typeof data.message !== 'string' || data.message.trim().length === 0) {
    return { valid: false, error: 'Le message est requis' };
  }

  // Limiter la longueur du message
  if (data.message.length > 5000) {
    return { valid: false, error: 'Le message est trop long (max 5000 caractères)' };
  }

  // Valider les images si présentes
  if (data.images && Array.isArray(data.images)) {
    if (data.images.length > 5) {
      return { valid: false, error: 'Maximum 5 images autorisées' };
    }

    for (const img of data.images) {
      if (!img.filename || !img.content || !img.type) {
        return { valid: false, error: 'Format d\'image invalide' };
      }

      // Limiter la taille de chaque image (base64, environ 10MB max)
      if (img.content.length > 15 * 1024 * 1024) {
        return { valid: false, error: 'Une ou plusieurs images sont trop volumineuses' };
      }
    }
  }

  return { valid: true };
}

// Générer le HTML de l'email
function generateEmailHTML(name: string, email: string, message: string, imageCount: number): string {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
          }
          .header {
            background-color: #3C6E47;
            color: white;
            padding: 20px;
            border-radius: 8px 8px 0 0;
          }
          .content {
            background-color: #F7F5E6;
            padding: 20px;
            border: 2px solid #3C6E47;
            border-top: none;
            border-radius: 0 0 8px 8px;
          }
          .field {
            margin-bottom: 15px;
          }
          .label {
            font-weight: bold;
            color: #3C6E47;
            margin-bottom: 5px;
          }
          .value {
            color: #333;
          }
          .message {
            background-color: white;
            padding: 15px;
            border-radius: 4px;
            border-left: 4px solid #A3C9A8;
            margin-top: 10px;
            white-space: pre-wrap;
          }
          .footer {
            margin-top: 20px;
            padding-top: 20px;
            border-top: 1px solid #A3C9A8;
            font-size: 12px;
            color: #6A8A6E;
            text-align: center;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1 style="margin: 0;">📧 Nouveau Feedback - ZeroGaspy</h1>
        </div>
        <div class="content">
          <div class="field">
            <div class="label">Nom:</div>
            <div class="value">${escapeHtml(name)}</div>
          </div>
          
          <div class="field">
            <div class="label">Email:</div>
            <div class="value">
              <a href="mailto:${escapeHtml(email)}" style="color: #3C6E47;">${escapeHtml(email)}</a>
            </div>
          </div>
          
          <div class="field">
            <div class="label">Message:</div>
            <div class="message">${escapeHtml(message)}</div>
          </div>
          
          ${imageCount > 0 ? `
            <div class="field">
              <div class="label">Pièces jointes:</div>
              <div class="value">${imageCount} image(s) jointe(s)</div>
            </div>
          ` : ''}
        </div>
        
        <div class="footer">
          <p>Ce feedback a été envoyé depuis l'application ZeroGaspy</p>
          <p>Vous pouvez répondre directement à cet email</p>
        </div>
      </body>
    </html>
  `;
}

// Échapper les caractères HTML pour la sécurité
function escapeHtml(text: string): string {
  const map: { [key: string]: string } = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };
  return text.replace(/[&<>"']/g, (m) => map[m]);
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // CORS headers pour permettre les requêtes depuis l'app mobile
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Gérer les requêtes OPTIONS (preflight)
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Vérifier que la méthode est POST
  if (req.method !== 'POST') {
    return res.status(405).json({ 
      success: false,
      error: 'Method not allowed. Use POST.' 
    });
  }

  // Vérifier que la clé API Resend est configurée
  if (!process.env.RESEND_API_KEY) {
    console.error('RESEND_API_KEY is not configured');
    return res.status(500).json({ 
      success: false,
      error: 'Server configuration error' 
    });
  }

  try {
    const data: FeedbackRequest = req.body;

    // Valider les données
    const validation = validateFeedback(data);
    if (!validation.valid) {
      return res.status(400).json({ 
        success: false,
        error: validation.error 
      });
    }

    // Préparer les pièces jointes
    const attachments = data.images
      ? data.images.map((img) => ({
          filename: img.filename,
          content: Buffer.from(img.content, 'base64'),
          type: img.type,
        }))
      : undefined;

    // Envoyer l'email via Resend
    const { data: emailData, error: resendError } = await resend.emails.send({
      from: FROM_EMAIL,
      to: RECIPIENT_EMAIL,
      replyTo: data.email,
      subject: `Feedback - ZeroGaspy de ${data.name}`,
      html: generateEmailHTML(
        data.name,
        data.email,
        data.message,
        data.images?.length || 0
      ),
      attachments: attachments,
    });

    if (resendError) {
      console.error('Erreur Resend:', resendError);
      return res.status(500).json({ 
        success: false,
        error: 'Erreur lors de l\'envoi de l\'email',
        details: process.env.NODE_ENV === 'development' ? resendError : undefined
      });
    }

    // Succès
    return res.status(200).json({ 
      success: true, 
      message: 'Feedback envoyé avec succès',
      id: emailData?.id
    });

  } catch (error: any) {
    console.error('Erreur inattendue:', error);
    return res.status(500).json({ 
      success: false,
      error: 'Erreur serveur lors du traitement du feedback',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}

