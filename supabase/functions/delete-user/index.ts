import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

// Liste des origines autorisees (app mobile + localhost pour dev)
const ALLOWED_ORIGINS = [
  'http://localhost:8081',
  'http://localhost:19006',
  'exp://localhost:8081',
  'capacitor://localhost',
  'ionic://localhost',
]

function getCorsHeaders(origin: string | null): Record<string, string> {
  // Pour les apps mobiles natives, l'origin peut etre null ou non standard
  // On autorise dans ce cas car la verification JWT protege l'endpoint
  const allowedOrigin = !origin || ALLOWED_ORIGINS.includes(origin) ? (origin || '*') : ALLOWED_ORIGINS[0]

  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Max-Age': '86400',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
  }
}

serve(async (req) => {
  const origin = req.headers.get('Origin')
  const corsHeaders = getCorsHeaders(origin)

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  // Only allow POST
  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  try {
    // Verifier l'authentification de l'utilisateur
    const authHeader = req.headers.get('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Missing or invalid authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Creer un client Supabase avec le token de l'utilisateur pour verifier son identite
    const userClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } },
    })

    // Recuperer l'utilisateur authentifie
    const { data: { user }, error: userError } = await userClient.auth.getUser()

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid or expired token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Recuperer le userId du body et verifier qu'il correspond
    const { userId } = await req.json()

    if (userId !== user.id) {
      return new Response(
        JSON.stringify({ error: 'User ID mismatch - cannot delete another user account' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Creer un client admin pour supprimer l'utilisateur
    const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })

    // Supprimer les donnees de l'utilisateur dans les tables
    // Ordre important: d'abord les tables enfants, puis profiles (parent)

    // 1. Supprimer food_items (utilise user_id)
    const { error: foodError } = await adminClient
      .from('food_items')
      .delete()
      .eq('user_id', user.id)
    if (foodError) {
      console.warn('Erreur suppression food_items:', foodError)
    }

    // 2. Supprimer lists (utilise user_id)
    const { error: listsError } = await adminClient
      .from('lists')
      .delete()
      .eq('user_id', user.id)
    if (listsError) {
      console.warn('Erreur suppression lists:', listsError)
    }

    // 3. Supprimer profiles (utilise id, pas user_id!)
    const { error: profileError } = await adminClient
      .from('profiles')
      .delete()
      .eq('id', user.id)
    if (profileError) {
      console.warn('Erreur suppression profiles:', profileError)
    }

    // Supprimer l'utilisateur de auth.users
    const { error: deleteUserError } = await adminClient.auth.admin.deleteUser(user.id)

    if (deleteUserError) {
      console.error('Erreur suppression utilisateur:', deleteUserError)
      return new Response(
        JSON.stringify({ error: 'Erreur lors de la suppression du compte' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Compte supprime avec succes' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Erreur inattendue:', error)
    return new Response(
      JSON.stringify({ error: 'Erreur serveur' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
