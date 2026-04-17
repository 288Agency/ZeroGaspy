import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const REFERRALS_NEEDED = 3;
const GRANT_DURATION_MONTHS = 1;
const ENTITLEMENT_ID = 'Zerogaspy Pro';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // ── Auth check ────────────────────────────────────────────
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

    // ─────────────────────────────────────────────────────────
    // referrer_id est dérivé côté serveur depuis la table referrals —
    // jamais du body. Le filleul (user.id) a forcément un referral completed;
    // c'est le referrer_id de ce referral qui reçoit le premium.
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { data: referralRow, error: refError } = await supabase
      .from('referrals')
      .select('referrer_id')
      .eq('referee_id', user.id)
      .eq('status', 'completed')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (refError || !referralRow) {
      return new Response(JSON.stringify({ error: 'No completed referral found for this user' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const referrer_id: string = referralRow.referrer_id;

    // Compter les referrals complétés
    const { count } = await supabase
      .from('referrals')
      .select('*', { count: 'exact', head: true })
      .eq('referrer_id', referrer_id)
      .eq('status', 'completed');

    if ((count ?? 0) < REFERRALS_NEEDED) {
      return new Response(JSON.stringify({
        success: false,
        reason: 'not_enough_referrals',
        current: count ?? 0,
        needed: REFERRALS_NEEDED,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Vérifier si on a déjà accordé le bonus pour ce jalon
    const milestone = Math.floor((count ?? 0) / REFERRALS_NEEDED);
    const { data: alreadyGranted } = await supabase
      .from('referral_premium_grants')
      .select('id')
      .eq('user_id', referrer_id)
      .eq('milestone', milestone)
      .maybeSingle();

    if (alreadyGranted) {
      return new Response(JSON.stringify({ success: false, reason: 'already_granted' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const rcApiKey = Deno.env.get('REVENUECAT_SECRET_KEY');
    if (!rcApiKey) {
      return new Response(JSON.stringify({ error: 'REVENUECAT_SECRET_KEY not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const expiresDate = new Date();
    expiresDate.setMonth(expiresDate.getMonth() + GRANT_DURATION_MONTHS);

    const rcRes = await fetch(
      `https://api.revenuecat.com/v1/subscribers/${referrer_id}/entitlements/${ENTITLEMENT_ID}/promotional`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${rcApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          duration: 'monthly',
          start_time_ms: Date.now(),
        }),
      }
    );

    if (!rcRes.ok) {
      const err = await rcRes.text();
      console.error('RevenueCat grant error:', err);
      return new Response(JSON.stringify({ error: 'RevenueCat grant failed', detail: err }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    await supabase.from('referral_premium_grants').insert({
      user_id: referrer_id,
      milestone,
      granted_at: new Date().toISOString(),
      expires_at: expiresDate.toISOString(),
    });

    return new Response(JSON.stringify({ success: true, expires_at: expiresDate.toISOString() }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('grant-referral-premium error:', error);
    return new Response(JSON.stringify({ error: 'Internal error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
