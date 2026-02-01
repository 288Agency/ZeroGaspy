import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
const RECIPIENT_EMAIL = Deno.env.get('FEEDBACK_RECIPIENT_EMAIL') || 'feedback@zerogaspy.com'
const FROM_EMAIL = Deno.env.get('RESEND_FROM_EMAIL') || 'ZeroGaspy <onboarding@resend.dev>'

interface FeedbackRequest {
  name: string
  email: string
  message: string
  images?: Array<{
    filename: string
    content: string // base64
    type: string
  }>
}

// Validation des donnees
function validateFeedback(data: unknown): { valid: boolean; error?: string } {
  const feedback = data as FeedbackRequest

  if (!feedback.name || typeof feedback.name !== 'string' || feedback.name.trim().length === 0) {
    return { valid: false, error: 'Le nom est requis' }
  }

  if (!feedback.email || typeof feedback.email !== 'string') {
    return { valid: false, error: "L'email est requis" }
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(feedback.email)) {
    return { valid: false, error: "Format d'email invalide" }
  }

  if (!feedback.message || typeof feedback.message !== 'string' || feedback.message.trim().length === 0) {
    return { valid: false, error: 'Le message est requis' }
  }

  if (feedback.message.length < 5) {
    return { valid: false, error: 'Le message doit contenir au moins 5 caracteres' }
  }

  if (feedback.message.length > 5000) {
    return { valid: false, error: 'Le message est trop long (max 5000 caracteres)' }
  }

  if (feedback.images && Array.isArray(feedback.images)) {
    if (feedback.images.length > 5) {
      return { valid: false, error: 'Maximum 5 images autorisees' }
    }

    for (const img of feedback.images) {
      if (!img.filename || !img.content || !img.type) {
        return { valid: false, error: "Format d'image invalide" }
      }

      if (img.content.length > 15 * 1024 * 1024) {
        return { valid: false, error: 'Une ou plusieurs images sont trop volumineuses' }
      }
    }
  }

  return { valid: true }
}

// Echapper les caracteres HTML
function escapeHtml(text: string): string {
  const map: { [key: string]: string } = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  }
  return text.replace(/[&<>"']/g, (m) => map[m])
}

// Generer le HTML de l'email
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
          <h1 style="margin: 0;">Nouveau Feedback - ZeroGaspy</h1>
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
              <div class="label">Pieces jointes:</div>
              <div class="value">${imageCount} image(s) jointe(s)</div>
            </div>
          ` : ''}
        </div>

        <div class="footer">
          <p>Ce feedback a ete envoye depuis l'application ZeroGaspy</p>
          <p>Vous pouvez repondre directement a cet email</p>
        </div>
      </body>
    </html>
  `
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  // Only allow POST
  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ success: false, error: 'Method not allowed. Use POST.' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  // Check API key
  if (!RESEND_API_KEY) {
    console.error('RESEND_API_KEY is not configured')
    return new Response(
      JSON.stringify({ success: false, error: 'Server configuration error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  try {
    const data: FeedbackRequest = await req.json()

    // Validate data
    const validation = validateFeedback(data)
    if (!validation.valid) {
      return new Response(
        JSON.stringify({ success: false, error: validation.error }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Prepare attachments for Resend API
    const attachments = data.images
      ? data.images.map((img) => ({
          filename: img.filename,
          content: img.content, // Resend accepte le base64 directement
        }))
      : undefined

    // Send email via Resend API
    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: RECIPIENT_EMAIL,
        reply_to: data.email,
        subject: `Feedback - ZeroGaspy de ${data.name}`,
        html: generateEmailHTML(
          data.name,
          data.email,
          data.message,
          data.images?.length || 0
        ),
        attachments: attachments,
      }),
    })

    const resendData = await resendResponse.json()

    if (!resendResponse.ok) {
      console.error('Erreur Resend:', resendData)
      return new Response(
        JSON.stringify({
          success: false,
          error: "Erreur lors de l'envoi de l'email"
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Success
    return new Response(
      JSON.stringify({
        success: true,
        message: 'Feedback envoye avec succes',
        id: resendData.id
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Erreur inattendue:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Erreur serveur lors du traitement du feedback'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
