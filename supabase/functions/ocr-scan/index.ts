import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

// Configuration des clés API (stockées en tant que secrets Supabase)
const MINDEE_API_KEY = Deno.env.get('MINDEE_API_KEY')
const GOOGLE_VISION_API_KEY = Deno.env.get('GOOGLE_VISION_API_KEY')

// Configuration Mindee
const MINDEE_API_URL = 'https://api.mindee.com/v1/products/mindee/expense_receipts/v5/predict'
const API_TIMEOUT = 15000 // 15 secondes

// Types
interface OCRRequest {
  imageBase64: string
  preferredProvider?: 'mindee' | 'google-vision'
}

interface ReceiptItem {
  id: string
  name: string
  quantity: number
  price?: number
  selected: boolean
  category?: string
  expirationDate?: string
}

interface OCRResponse {
  success: boolean
  items: ReceiptItem[]
  storeName?: string
  date?: string
  total?: number
  rawText?: string
  error?: string
  confidence?: number
  provider?: 'mindee' | 'google-vision'
}

// Interface Mindee API Response
interface MindeeLineItem {
  description: string
  quantity?: number
  total_amount?: number
  unit_price?: number
  confidence?: number
}

interface MindeeResponse {
  api_request: {
    status: string
    status_code: number
  }
  document: {
    inference: {
      prediction: {
        supplier_name: {
          value: string
          confidence: number
        }
        date: {
          value: string
          confidence: number
        }
        total_amount: {
          value: number
          confidence: number
        }
        line_items: MindeeLineItem[]
      }
    }
  }
}

// Mapping catégories
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
}

/**
 * Détecte la catégorie d'un produit basé sur son nom
 */
function detectCategory(productName: string): string {
  const lowerName = productName.toLowerCase()

  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    for (const keyword of keywords) {
      if (lowerName.includes(keyword)) {
        return category
      }
    }
  }

  return 'épicerie' // Catégorie par défaut
}

/**
 * Formate le nom d'un produit
 */
function formatProductName(name: string): string {
  if (!name) return ''

  return name
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ')
}

/**
 * Génère un ID unique pour un item
 */
function generateId(): string {
  return `item_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

/**
 * Appelle Mindee Receipt OCR API
 */
async function callMindeeAPI(base64Image: string): Promise<OCRResponse> {
  if (!MINDEE_API_KEY) {
    throw new Error('MINDEE_API_KEY not configured')
  }

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT)

  try {
    console.log('📤 Calling Mindee API...')

    const response = await fetch(MINDEE_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Token ${MINDEE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        document: base64Image,
      }),
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Mindee API error:', response.status, errorText)

      if (response.status === 401) {
        throw new Error('Invalid Mindee API key')
      } else if (response.status === 429) {
        throw new Error('Mindee rate limit reached')
      }

      throw new Error(`Mindee API error: ${response.status}`)
    }

    const data: MindeeResponse = await response.json()

    if (data.api_request.status !== 'success') {
      throw new Error('Mindee processing failed')
    }

    // Parser les items
    const prediction = data.document.inference.prediction
    const items: ReceiptItem[] = prediction.line_items
      .filter(item => item.description && item.description.trim().length > 0)
      .map(item => ({
        id: generateId(),
        name: formatProductName(item.description),
        quantity: item.quantity || 1,
        price: item.total_amount || item.unit_price,
        selected: true,
        category: detectCategory(item.description),
      }))

    return {
      success: true,
      items,
      storeName: prediction.supplier_name?.value,
      date: prediction.date?.value,
      total: prediction.total_amount?.value,
      provider: 'mindee',
    }
  } catch (error: any) {
    console.error('Mindee error:', error.message)
    throw error
  }
}

/**
 * Appelle Google Vision API
 */
async function callGoogleVisionAPI(base64Image: string): Promise<OCRResponse> {
  if (!GOOGLE_VISION_API_KEY) {
    throw new Error('GOOGLE_VISION_API_KEY not configured')
  }

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT)

  try {
    console.log('📤 Calling Google Vision API...')

    const response = await fetch(
      `https://vision.googleapis.com/v1/images:annotate?key=${GOOGLE_VISION_API_KEY}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          requests: [
            {
              image: { content: base64Image },
              features: [{ type: 'TEXT_DETECTION' }],
            },
          ],
        }),
        signal: controller.signal,
      }
    )

    clearTimeout(timeoutId)

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Google Vision error:', response.status, errorText)
      throw new Error(`Google Vision API error: ${response.status}`)
    }

    const data = await response.json()

    if (!data.responses || !data.responses[0]) {
      throw new Error('Invalid Google Vision response')
    }

    const textAnnotations = data.responses[0].textAnnotations
    if (!textAnnotations || textAnnotations.length === 0) {
      throw new Error('No text detected')
    }

    const rawText = textAnnotations[0].description

    // Parser basique du texte (simplifié)
    // Dans un cas réel, il faudrait une logique de parsing plus sophistiquée
    const lines = rawText.split('\n').filter((line: string) => line.trim())
    const items: ReceiptItem[] = lines
      .slice(0, Math.min(10, lines.length)) // Limiter à 10 items
      .map((line: string) => ({
        id: generateId(),
        name: formatProductName(line),
        quantity: 1,
        selected: true,
        category: detectCategory(line),
      }))

    return {
      success: true,
      items,
      rawText,
      provider: 'google-vision',
    }
  } catch (error: any) {
    console.error('Google Vision error:', error.message)
    throw error
  }
}

// CORS headers
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

  try {
    const { imageBase64, preferredProvider }: OCRRequest = await req.json()

    // Validation
    if (!imageBase64 || typeof imageBase64 !== 'string') {
      return new Response(
        JSON.stringify({ success: false, error: 'imageBase64 is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (imageBase64.length < 100) {
      return new Response(
        JSON.stringify({ success: false, error: 'Image appears to be empty or corrupted' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    let result: OCRResponse

    // Stratégie : Mindee en priorité, fallback sur Google Vision
    const hasMindeeKey = !!MINDEE_API_KEY
    const hasGoogleVisionKey = !!GOOGLE_VISION_API_KEY

    if (preferredProvider === 'google-vision' && hasGoogleVisionKey) {
      // Utiliser Google Vision si explicitement demandé
      result = await callGoogleVisionAPI(imageBase64)
    } else if (hasMindeeKey) {
      // Tenter Mindee d'abord
      try {
        result = await callMindeeAPI(imageBase64)
      } catch (mindeeError: any) {
        console.warn('Mindee failed, fallback to Google Vision:', mindeeError.message)

        if (hasGoogleVisionKey) {
          result = await callGoogleVisionAPI(imageBase64)
        } else {
          throw new Error('Mindee failed and Google Vision not configured')
        }
      }
    } else if (hasGoogleVisionKey) {
      // Pas de clé Mindee, utiliser Google Vision
      result = await callGoogleVisionAPI(imageBase64)
    } else {
      // Aucune clé configurée
      return new Response(
        JSON.stringify({
          success: false,
          error: 'No OCR provider configured. Please configure MINDEE_API_KEY or GOOGLE_VISION_API_KEY.'
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Success
    return new Response(
      JSON.stringify(result),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: any) {
    console.error('OCR scan error:', error.message)
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Internal server error',
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
