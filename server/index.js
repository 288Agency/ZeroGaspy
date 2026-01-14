// Serveur Express simple pour Resend
// Déployable sur Railway, Render, Heroku, ou votre propre serveur

const express = require('express');
const { Resend } = require('resend');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// Initialiser Resend
const resend = new Resend(process.env.RESEND_API_KEY);

// Email de réception - à configurer dans les variables d'environnement
const RECIPIENT_EMAIL = process.env.FEEDBACK_RECIPIENT_EMAIL || 'feedback@zerogaspy.com';
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'ZeroGaspy <onboarding@resend.dev>';

// Liste des origines autorisées
const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',')
  : [
      'exp://localhost:8081',
      'exp://192.168.*:8081',
      'https://zerogaspy.com',
      'https://*.zerogaspy.com',
    ];

// Middleware CORS sécurisé
app.use(
  cors({
    origin: function (origin, callback) {
      // Autoriser les requêtes sans origin (app mobile native)
      if (!origin) return callback(null, true);

      // Vérifier si l'origine est autorisée
      const isAllowed = ALLOWED_ORIGINS.some((allowed) => {
        if (allowed.includes('*')) {
          const regex = new RegExp(allowed.replace(/\*/g, '.*'));
          return regex.test(origin);
        }
        return allowed === origin;
      });

      if (isAllowed) {
        callback(null, true);
      } else {
        console.warn(`Origin non autorisée: ${origin}`);
        callback(new Error('Non autorisé par CORS'));
      }
    },
    methods: ['POST', 'GET'],
    credentials: true,
    maxAge: 86400, // 24h de cache pour les preflight
  })
);

app.use(express.json({ limit: '20mb' })); // Limite pour les images en base64

// Rate limiting simple (en mémoire)
const rateLimitMap = new Map();
const RATE_LIMIT_WINDOW = 15 * 60 * 1000; // 15 minutes
const RATE_LIMIT_MAX_REQUESTS = 5; // Maximum 5 feedbacks par 15min par IP

function checkRateLimit(ip) {
  const now = Date.now();
  const userRequests = rateLimitMap.get(ip) || [];

  // Nettoyer les anciennes requêtes
  const recentRequests = userRequests.filter(
    (timestamp) => now - timestamp < RATE_LIMIT_WINDOW
  );

  if (recentRequests.length >= RATE_LIMIT_MAX_REQUESTS) {
    return false;
  }

  recentRequests.push(now);
  rateLimitMap.set(ip, recentRequests);
  return true;
}

// Nettoyer la map régulièrement
setInterval(() => {
  const now = Date.now();
  for (const [ip, timestamps] of rateLimitMap.entries()) {
    const recentRequests = timestamps.filter(
      (timestamp) => now - timestamp < RATE_LIMIT_WINDOW
    );
    if (recentRequests.length === 0) {
      rateLimitMap.delete(ip);
    } else {
      rateLimitMap.set(ip, recentRequests);
    }
  }
}, 60000); // Nettoyer toutes les minutes

// Validation des données
function validateFeedback(data) {
  if (!data.name || typeof data.name !== 'string' || data.name.trim().length === 0) {
    return { valid: false, error: 'Le nom est requis' };
  }

  if (!data.email || typeof data.email !== 'string') {
    return { valid: false, error: 'L\'email est requis' };
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(data.email)) {
    return { valid: false, error: 'Format d\'email invalide' };
  }

  if (!data.message || typeof data.message !== 'string' || data.message.trim().length === 0) {
    return { valid: false, error: 'Le message est requis' };
  }

  if (data.message.length > 5000) {
    return { valid: false, error: 'Le message est trop long (max 5000 caractères)' };
  }

  if (data.images && Array.isArray(data.images)) {
    if (data.images.length > 5) {
      return { valid: false, error: 'Maximum 5 images autorisées' };
    }

    for (const img of data.images) {
      if (!img.filename || !img.content || !img.type) {
        return { valid: false, error: 'Format d\'image invalide' };
      }

      if (img.content.length > 15 * 1024 * 1024) {
        return { valid: false, error: 'Une ou plusieurs images sont trop volumineuses' };
      }
    }
  }

  return { valid: true };
}

// Échapper HTML pour la sécurité
function escapeHtml(text) {
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };
  return text.replace(/[&<>"']/g, (m) => map[m]);
}

// Générer le HTML de l'email
function generateEmailHTML(name, email, message, imageCount) {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
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

// Route de santé
app.get('/', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'ZeroGaspy Feedback API',
    version: '1.0.0'
  });
});

// Route pour envoyer le feedback
app.post('/api/feedback', async (req, res) => {
  try {
    // Rate limiting
    const clientIp = req.ip || req.connection.remoteAddress || 'unknown';
    if (!checkRateLimit(clientIp)) {
      return res.status(429).json({
        success: false,
        error: 'Trop de requêtes. Veuillez réessayer dans 15 minutes.',
      });
    }

    // Vérifier que la clé API est configurée
    if (!process.env.RESEND_API_KEY) {
      console.error('RESEND_API_KEY is not configured');
      return res.status(500).json({
        success: false,
        error: 'Server configuration error'
      });
    }

    const data = req.body;

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

  } catch (error) {
    console.error('Erreur inattendue:', error);
    return res.status(500).json({ 
      success: false,
      error: 'Erreur serveur lors du traitement du feedback',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Démarrer le serveur
app.listen(PORT, () => {
  console.log(`🚀 Serveur démarré sur le port ${PORT}`);
  console.log(`📧 Email de réception: ${RECIPIENT_EMAIL}`);
  console.log(`📤 Email d'envoi: ${FROM_EMAIL}`);
});

