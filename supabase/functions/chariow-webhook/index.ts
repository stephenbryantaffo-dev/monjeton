import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  try {
    // ── Auth par token URL (Chariow ne signe pas les Pulses) ──
    const url = new URL(req.url);
    const token = url.searchParams.get('token') ?? '';
    const expected = Deno.env.get('CHARIOW_WEBHOOK_TOKEN');
    if (!expected) {
      console.error('CHARIOW_WEBHOOK_TOKEN not configured');
      return json({ error: 'Server misconfiguration' }, 500);
    }
    if (!token || token !== expected) {
      return json({ error: 'Unauthorized' }, 401);
    }

    const rawBody = await req.text();
    console.log('Chariow webhook RAW:', rawBody);

    let payload: any;
    try {
      payload = JSON.parse(rawBody);
    } catch {
      return json({ error: 'Invalid JSON' }, 400);
    }

    // Ignorer poliment les autres events
    if (payload?.event !== 'successful.sale') {
      return json({ received: true, action: 'ignored_event', event: payload?.event });
    }

    const sale = payload?.sale ?? {};
    const customer = payload?.customer ?? {};
    const saleStatus = String(sale?.status ?? '').toLowerCase();
    if (saleStatus !== 'completed') {
      return json({ received: true, action: 'ignored_status', status: saleStatus });
    }

    const saleId: string = String(sale?.id ?? '').trim();
    const email: string = String(customer?.email ?? '').trim().toLowerCase();

    if (!saleId || !email) {
      console.error('Missing saleId or email', { saleId, email });
      return json({ error: 'Missing saleId or email' }, 400);
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // ── Idempotence ──
    const { data: already } = await supabase
      .from('chariow_processed_sales')
      .select('sale_id')
      .eq('sale_id', saleId)
      .maybeSingle();
    if (already) {
      console.log(`↩️ Chariow: sale ${saleId} already processed`);
      return json({ received: true, action: 'already_processed', sale_id: saleId });
    }
    const { error: idemErr } = await supabase
      .from('chariow_processed_sales')
      .insert({ sale_id: saleId });
    if (idemErr) {
      // En cas de course : un autre worker a inséré entre-temps
      console.warn('Idempotency insert race, treating as processed:', idemErr.message);
      return json({ received: true, action: 'already_processed_race', sale_id: saleId });
    }

    const planName = 'Pro';
    const priceXof = 2000;

    // ── Chercher l'email dans profiles ──
    const { data: profile } = await supabase
      .from('profiles')
      .select('user_id')
      .ilike('email', email)
      .limit(1)
      .maybeSingle();

    if (profile?.user_id) {
      const now = new Date();
      const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      const graceUntil = new Date(expiresAt.getTime() + 3 * 24 * 60 * 60 * 1000);

      const { error: upErr } = await supabase.from('subscriptions').upsert(
        {
          user_id: profile.user_id,
          status: 'active',
          plan_name: planName,
          price_xof: priceXof,
          activated_at: now.toISOString(),
          expires_at: expiresAt.toISOString(),
          grace_until: graceUntil.toISOString(),
          last_reminder_sent: null,
          updated_at: now.toISOString(),
        },
        { onConflict: 'user_id' }
      );
      if (upErr) throw upErr;

      console.log(`✅ Chariow: Pro activé pour ${email} (user ${profile.user_id}, sale ${saleId})`);
      return json({ success: true, action: 'activated', email, plan: planName });
    }

    // ── Cas B : email inconnu → file d'attente ──
    const { error: pendErr } = await supabase.from('pending_pro_emails').upsert(
      {
        email,
        plan_name: planName,
        source: 'chariow',
        chariow_sale_id: saleId,
      },
      { onConflict: 'email' }
    );
    if (pendErr) throw pendErr;

    console.log(`📥 Chariow: ${email} mis en attente (sale ${saleId})`);
    return json({ success: true, action: 'pending', email, plan: planName });
  } catch (e) {
    console.error('Chariow webhook fatal:', e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
