import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'content-type, x-jeko-signature, x-webhook-secret, authorization',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS')
    return new Response(null, { headers: corsHeaders });

  try {
    const JEKO_API_KEY = Deno.env.get('JEKO_API_KEY') || Deno.env.get('Jeko_pay');

    // Vérifier signature Jèko
    const sig =
      req.headers.get('x-jeko-signature') ||
      req.headers.get('x-webhook-secret') ||
      req.headers.get('authorization')?.replace('Bearer ', '');

    if (JEKO_API_KEY && sig !== JEKO_API_KEY) {
      console.error('Invalid signature:', sig);
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json();
    console.log('Jèko payload:', JSON.stringify(body));

    const status =
      body?.status || body?.payment_status || body?.data?.status;
    const email =
      body?.customer?.email ||
      body?.payer_email ||
      body?.email ||
      body?.data?.customer?.email;
    const amount = Number(
      body?.amount || body?.payment?.amount || body?.data?.amount || 0
    );
    const paymentLinkId =
      body?.payment_link_id ||
      body?.link_id ||
      body?.data?.payment_link_id ||
      '';

    console.log('Status:', status, 'Email:', email, 'Amount:', amount);

    const successStatuses = [
      'success',
      'paid',
      'completed',
      'successful',
      'approved',
    ];
    if (!successStatuses.includes(String(status).toLowerCase())) {
      return new Response(
        JSON.stringify({ received: true, action: 'ignored', status }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!email) {
      console.error('No email in payload:', body);
      return new Response(JSON.stringify({ error: 'No email' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const PRO_ID = 'd616710c-47fb-4afc-b0e2-e9fe3e0b29ab';
    const MAX_ID = 'e7715547-b693-40dd-b06e-9bbb63a90961';

    let planName = 'Pro';
    let priceXof = 2000;

    if (String(paymentLinkId).includes(MAX_ID) || amount >= 5000) {
      planName = 'Ultra Pro';
      priceXof = 5000;
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Trouver le user par email (paginé)
    let user: { id: string; email?: string } | undefined;
    let page = 1;
    const perPage = 1000;
    const target = String(email).toLowerCase();
    while (!user) {
      const { data, error } = await supabase.auth.admin.listUsers({
        page,
        perPage,
      });
      if (error) throw error;
      user = data?.users?.find((u) => u.email?.toLowerCase() === target);
      if (user || !data?.users?.length || data.users.length < perPage) break;
      page++;
    }

    if (!user) {
      console.error('User not found:', email);
      return new Response(
        JSON.stringify({
          received: true,
          note: 'User not found for: ' + email,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { error } = await supabase
      .from('subscriptions')
      .upsert(
        {
          user_id: user.id,
          status: 'active',
          plan_name: planName,
          price_xof: priceXof,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' }
      );

    if (error) throw error;

    console.log(`✅ Activated ${planName} for ${email}`);

    return new Response(
      JSON.stringify({ success: true, plan: planName, email }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (e) {
    console.error('Webhook error:', e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
