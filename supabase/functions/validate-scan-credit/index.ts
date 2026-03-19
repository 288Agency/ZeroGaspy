import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ allowed: false, reason: 'unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ allowed: false, reason: 'unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json();
    const action: 'check' | 'consume' = body.action ?? 'check';
    const currentMonth = new Date().toISOString().slice(0, 7);

    const { data: existing } = await supabase
      .from('scan_credits')
      .select('month')
      .eq('user_id', user.id)
      .eq('month', currentMonth)
      .maybeSingle();

    const hasUsed = existing !== null;

    if (action === 'check') {
      return new Response(JSON.stringify({ allowed: !hasUsed }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!hasUsed) {
      await supabase.from('scan_credits').upsert({
        user_id: user.id,
        month: currentMonth,
      }, { onConflict: 'user_id,month', ignoreDuplicates: true });
    }

    return new Response(JSON.stringify({ consumed: !hasUsed }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('validate-scan-credit error:', error);
    return new Response(JSON.stringify({ allowed: false, reason: 'server_error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
