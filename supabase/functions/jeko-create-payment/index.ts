import { createClient } from 'npm:@supabase/supabase-js@2';
import { jekoFetch } from '../_shared/jeko-client.ts';
import { getCorsHeaders } from '../_shared/cors.ts';
import { checkRateLimit, rateLimitResponse } from '../_shared/rate-limit.ts';

const PRO_LINK_ID = 'd616710c-47fb-4afc-b0e2-e9fe3e0b29ab';

const PLANS: Record<string, { amountCents: number; label: string }> = {
  pro: { amountCents: 200000, label: 'Mon Jeton Pro (30 jours)' },       // 2 000 XOF
  ultra: { amountCents: 500000, label: 'Mon Jeton Ultra Pro (30 jours)' }, // 5 000 XOF
};

const ALLOWED_METHODS = new Set(['wave', 'orange', 'mtn', 'moov', 'djamo']);

// storeId dérivé du lien de paiement existant (mis en cache en mémoire)
let cachedStoreId: string | null = null;
async function getStoreId(): Promise<string> {
  if (cachedStoreId) return cachedStoreId;
  const link = await jekoFetch(`/payment_links/${PRO_LINK_ID}`);
  if (!link?.storeId) throw new Error('Jèko: storeId introuvable sur le lien de paiement');
  cachedStoreId = String(link.storeId);
  return cachedStoreId;
}

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  try {
    // ─── Auth JWT obligatoire : la référence de paiement = user_id ───
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return json({ error: 'Unauthorized' }, 401);
    }
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims?.sub) {
      return json({ error: 'Unauthorized' }, 401);
    }
    const userId = String(claimsData.claims.sub);

    // 10 demandes de paiement / heure / utilisateur
    const rl = await checkRateLimit(userId, 'jeko-create-payment', 10, 3600);
    if (!rl.allowed) return rateLimitResponse('jeko-create-payment', rl.retryAfter, corsHeaders);

    // ─── Validation de l'entrée ───
    let body: { plan?: unknown; paymentMethod?: unknown } = {};
    try {
      body = await req.json();
    } catch {
      return json({ error: 'Invalid JSON body' }, 400);
    }
    const planKey = String(body.plan ?? 'pro').toLowerCase();
    const plan = PLANS[planKey];
    if (!plan) return json({ error: 'Plan invalide (pro | ultra)' }, 400);
    const paymentMethod =
      typeof body.paymentMethod === 'string' && ALLOWED_METHODS.has(body.paymentMethod)
        ? body.paymentMethod
        : undefined;

    const origin = req.headers.get('origin') || 'https://monjeton.app';

    // ─── Création de la demande de paiement Jèko ───
    const storeId = await getStoreId();
    const paymentRequest = await jekoFetch('/payment_requests', {
      method: 'POST',
      body: JSON.stringify({
        storeId,
        amountCents: plan.amountCents,
        currency: 'XOF',
        // La référence porte l'user_id : le webhook l'utilise pour activer le bon compte
        reference: userId,
        paymentDetails: {
          type: 'redirect',
          data: {
            ...(paymentMethod ? { paymentMethod } : {}),
            successUrl: `${origin}/payment-pending?payment=success&plan=${planKey}`,
            errorUrl: `${origin}/subscribe?payment=error`,
          },
        },
      }),
    });

    if (!paymentRequest?.redirectUrl) {
      throw new Error('Jèko: redirectUrl manquante dans la réponse');
    }

    console.log(`Payment request created for plan ${planKey}`);
    return json({ redirectUrl: paymentRequest.redirectUrl, reference: userId });
  } catch (e) {
    console.error('jeko-create-payment fatal:', e);
    return json({ error: 'Payment creation failed' }, 500);
  }
});
