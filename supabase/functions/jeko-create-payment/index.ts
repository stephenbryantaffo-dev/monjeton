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

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

// Limite mémoire pour les paiements invités (non authentifiés) : 5 / 10 min / IP
const guestHits = new Map<string, number[]>();
function guestRateLimited(ip: string): boolean {
  const now = Date.now();
  const arr = (guestHits.get(ip) ?? []).filter((t) => now - t < 600_000);
  if (arr.length >= 5) {
    guestHits.set(ip, arr);
    return true;
  }
  arr.push(now);
  guestHits.set(ip, arr);
  return false;
}

// Repli : storeId réel dérivé du lien de paiement existant (mis en cache en mémoire)
let cachedStoreId: string | null = null;
async function fetchRealStoreId(): Promise<string> {
  if (cachedStoreId) return cachedStoreId;
  const link = await jekoFetch(`/payment_links/${PRO_LINK_ID}`);
  if (!link?.storeId) throw new Error('Jèko: storeId introuvable sur le lien de paiement');
  cachedStoreId = String(link.storeId);
  return cachedStoreId;
}

// Création de la demande de paiement — le storeId est passé en paramètre
async function createPaymentRequest(storeId: string, payload: Record<string, unknown>) {
  return jekoFetch('/payment_requests', {
    method: 'POST',
    body: JSON.stringify({ ...payload, storeId }),
  });
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
    // ─── Validation de l'entrée ───
    let body: { plan?: unknown; paymentMethod?: unknown; email?: unknown } = {};
    try {
      body = await req.json();
    } catch {
      return json({ error: 'Invalid JSON body' }, 400);
    }

    // ─── Référence de paiement : user_id si connecté, "guest:<email>" sinon ───
    const authHeader = req.headers.get('Authorization');
    let reference: string;

    if (authHeader?.startsWith('Bearer ')) {
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
      reference = userId;
    } else {
      // Visiteur non connecté : l'e-mail est obligatoire, il servira à
      // rattacher le paiement au compte créé ensuite.
      const email = String(body.email ?? '').trim().toLowerCase();
      if (!EMAIL_RE.test(email) || email.length > 120) {
        return json({ error: 'Email invalide' }, 400);
      }
      const ip = (req.headers.get('x-forwarded-for') ?? '').split(',')[0]?.trim() || 'unknown';
      if (guestRateLimited(ip)) {
        return json({ error: 'Trop de tentatives, réessaie dans quelques minutes.' }, 429);
      }
      reference = `guest:${email}`;
    }

    const planKey = String(body.plan ?? 'pro').toLowerCase();
    const plan = PLANS[planKey];
    if (!plan) return json({ error: 'Plan invalide (pro | ultra)' }, 400);
    // Jèko EXIGE paymentMethod sur les demandes de type "redirect"
    const paymentMethod =
      typeof body.paymentMethod === 'string' && ALLOWED_METHODS.has(body.paymentMethod)
        ? body.paymentMethod
        : null;
    if (!paymentMethod) {
      return json({ error: 'paymentMethod requis (wave | orange | mtn | moov | djamo)' }, 400);
    }

    // Jèko exige des URLs de retour HTTPS absolues : on ignore les origines
    // non-HTTPS (localhost, capacitor://, file://) au profit du domaine prod.
    const rawOrigin = req.headers.get('origin') ?? '';
    const origin = rawOrigin.startsWith('https://') ? rawOrigin : 'https://monjeton.app';

    // ─── Création de la demande de paiement Jèko ───
    const storeId = await getStoreId();
    const paymentRequest = await jekoFetch('/payment_requests', {
      method: 'POST',
      body: JSON.stringify({
        storeId,
        amountCents: plan.amountCents,
        currency: 'XOF',
        // La référence porte l'user_id, ou "guest:<email>" si l'acheteur
        // n'a pas encore de compte (le paiement sera réclamé à l'inscription)
        // Suffixe d'unicité : Jèko renvoie 409 si la référence a déjà servi
        reference: `${reference}|${Date.now()}`,
        paymentDetails: {
          type: 'redirect',
          data: {
            paymentMethod,
            successUrl: reference.startsWith('guest:')
              ? `${origin}/signup?paid=1&plan=${planKey}`
              : `${origin}/payment-pending?payment=success&plan=${planKey}`,
            errorUrl: `${origin}/pricing?payment=error`,
          },
        },
      }),
    });

    if (!paymentRequest?.redirectUrl) {
      throw new Error('Jèko: redirectUrl manquante dans la réponse');
    }

    console.log(`Payment request created for plan ${planKey}`);
    return json({ redirectUrl: paymentRequest.redirectUrl });
  } catch (e) {
    // On logue le message exact renvoyé par Jèko (sans données personnelles)
    console.error('jeko-create-payment fatal:', e instanceof Error ? e.message : String(e));
    return json({ error: 'Payment creation failed' }, 500);
  }
});
