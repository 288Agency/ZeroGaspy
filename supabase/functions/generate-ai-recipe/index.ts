import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RequestBody {
  ingredients: string[];
  language?: string;
}

interface AIRecipe {
  name: string;
  description: string;
  ingredients: string[];
  preparationTime: number;
  difficulty: 'facile' | 'moyen' | 'difficile';
  category: 'entrée' | 'plat' | 'dessert' | 'snack' | 'boisson' | 'petit-déjeuner';
  imageEmoji: string;
  instructions: string[];
  tips?: string;
  tags?: string[];
}

async function hashIngredients(ingredients: string[]): Promise<string> {
  const sorted = [...ingredients].sort().join('|').toLowerCase();
  const encoder = new TextEncoder();
  const data = encoder.encode(sorted);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

function buildPrompt(ingredients: string[], language: string): string {
  const lang = language === 'fr' ? 'français' : 'English';
  const isEn = language !== 'fr';

  if (isEn) {
    return `You are a creative chef. Given these ingredients that will expire soon: ${ingredients.join(', ')}.

Create ONE complete recipe that uses as many of these ingredients as possible.

Respond ONLY with a valid JSON object in this exact format:
{
  "name": "Recipe name",
  "description": "Brief appetizing description (1-2 sentences)",
  "ingredients": ["ingredient 1 with quantity", "ingredient 2 with quantity"],
  "preparationTime": 20,
  "difficulty": "facile",
  "category": "plat",
  "imageEmoji": "🍳",
  "instructions": ["Step 1...", "Step 2...", "Step 3..."],
  "tips": "Optional chef tip",
  "tags": ["quick", "healthy"]
}

Rules:
- difficulty: exactly "facile", "moyen", or "difficile"
- category: exactly one of "entrée", "plat", "dessert", "snack", "boisson", "petit-déjeuner"
- preparationTime: number in minutes
- instructions: 3-6 clear steps
- Only output the JSON, no explanation`;
  }

  return `Tu es un chef créatif. Voici des ingrédients qui expirent bientôt : ${ingredients.join(', ')}.

Crée UNE recette complète qui utilise le maximum de ces ingrédients.

Réponds UNIQUEMENT avec un objet JSON valide dans ce format exact :
{
  "name": "Nom de la recette",
  "description": "Courte description appétissante (1-2 phrases)",
  "ingredients": ["ingrédient 1 avec quantité", "ingrédient 2 avec quantité"],
  "preparationTime": 20,
  "difficulty": "facile",
  "category": "plat",
  "imageEmoji": "🍳",
  "instructions": ["Étape 1...", "Étape 2...", "Étape 3..."],
  "tips": "Conseil du chef optionnel",
  "tags": ["rapide", "healthy"]
}

Règles :
- difficulty : exactement "facile", "moyen", ou "difficile"
- category : exactement un parmi "entrée", "plat", "dessert", "snack", "boisson", "petit-déjeuner"
- preparationTime : nombre en minutes
- instructions : 3-6 étapes claires
- Réponds UNIQUEMENT le JSON, sans explication`;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // ── Auth check — empêche l'abus anonyme (OpenAI coûte) ───────
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseAnon = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user }, error: authError } = await supabaseAnon.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    // ─────────────────────────────────────────────────────────────

    const body: RequestBody = await req.json();
    const { ingredients, language = 'fr' } = body;

    if (!ingredients || ingredients.length === 0) {
      return new Response(JSON.stringify({ error: 'ingredients required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const openaiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiKey) {
      return new Response(JSON.stringify({ error: 'OPENAI_API_KEY not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Vérifier le cache
    const hash = await hashIngredients(ingredients);
    const { data: cached } = await supabase
      .from('ai_recipe_cache')
      .select('recipe_json')
      .eq('ingredient_hash', hash)
      .eq('language', language)
      .gt('expires_at', new Date().toISOString())
      .maybeSingle();

    if (cached) {
      return new Response(JSON.stringify({ recipe: cached.recipe_json, cached: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Appel OpenAI
    const prompt = buildPrompt(ingredients, language);
    const openaiRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${openaiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
        max_tokens: 800,
        response_format: { type: 'json_object' },
      }),
    });

    if (!openaiRes.ok) {
      const err = await openaiRes.text();
      console.error('OpenAI error:', err);
      return new Response(JSON.stringify({ error: 'AI generation failed' }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const openaiData = await openaiRes.json();
    const rawContent = openaiData.choices?.[0]?.message?.content;
    if (!rawContent) {
      return new Response(JSON.stringify({ error: 'Empty AI response' }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const recipe: AIRecipe = JSON.parse(rawContent);

    // Mettre en cache (nettoyage des entrées expirées au passage)
    await supabase.rpc('cleanup_expired_ai_recipe_cache');
    await supabase.from('ai_recipe_cache').upsert({
      ingredient_hash: hash,
      ingredients,
      recipe_json: recipe,
      language,
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    });

    return new Response(JSON.stringify({ recipe, cached: false }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('generate-ai-recipe error:', error);
    return new Response(JSON.stringify({ error: 'Internal error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
