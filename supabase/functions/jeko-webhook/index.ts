import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'content-type, jeko-signature',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// ─── IP rate limit (in-memory): 30 req/min par IP ───
const ipHits = new Map<string, number[]>();
const IP_WINDOW_MS = 60_000;
const IP_MAX = 30;
function checkIpRateLimit(ip: string): { allowed: boolean; retryAfter: number } {
  const now = Date.now();
  const arr = (ipHits.get(ip) ?? []).filter((t) => now - t < IP_WINDOW_MS);
  if (arr.length >= IP_MAX) {
    const retryAfter = Math.ceil((IP_WINDOW_MS - (now - arr[0])) / 1000);
    ipHits.set(ip, arr);
    return { allowed: false, retryAfter };
  }
  arr.push(now);
  ipHits.set(ip, arr);
  // Cleanup occasionnel pour éviter la croissance mémoire
  if (ipHits.size > 1000) {
    for (const [k, v] of ipHits) {
      const fresh = v.filter((t) => now - t < IP_WINDOW_MS);
      if (fresh.length === 0) ipHits.delete(k);
      else ipHits.set(k, fresh);
    }
  }
  return { allowed: true, retryAfter: 0 };
}

async function verifyHmac(rawBody: string, signature: string, secret: string): Promise<boolean> {
  try {
    const key = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    const sigBuf = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(rawBody));
    const expected = Array.from(new Uint8Array(sigBuf))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
    if (expected.length !== signature.length) return false;
    let r = 0;
    for (let i = 0; i < expected.length; i++) r |= expected.charCodeAt(i) ^ signature.charCodeAt(i);
    return r === 0;
  } catch (e) {
    console.error('HMAC error', e);
    return false;
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  try {
    // Rate limit par IP AVANT calcul HMAC pour économiser du CPU contre le spam
    const xff = req.headers.get('x-forwarded-for') ?? '';
    const ip = (xff.split(',')[0]?.trim()) || 'unknown';
    const ipRl = checkIpRateLimit(ip);
    if (!ipRl.allowed) {
      return new Response(
        JSON.stringify({ error: 'Too many requests' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Retry-After': String(ipRl.retryAfter) } }
      );
    }

    const WEBHOOK_SECRET = Deno.env.get('JEKO_WEBHOOK_SECRET');
    const rawBody = await req.text();
    const signature =
      req.headers.get('jeko-signature') || req.headers.get('Jeko-Signature') || '';

    // Signature HMAC OBLIGATOIRE pour éviter les fraudes
    if (!WEBHOOK_SECRET) {
      console.error('JEKO_WEBHOOK_SECRET not configured — rejecting request');
      return json({ error: 'Server misconfiguration' }, 500);
    }
    if (!signature) {
      return json({ error: 'Missing signature' }, 401);
    }
    const ok = await verifyHmac(rawBody, signature, WEBHOOK_SECRET);
    if (!ok) {
      console.error('Bad signature');
      return json({ error: 'Invalid signature' }, 401);
    }

    const parsed = JSON.parse(rawBody);
    console.log('Jèko webhook RAW:', rawBody);

    // La doc se contredit : tantôt champs à la racine, tantôt sous .data.
    const tx = parsed?.data ?? parsed;

    const status = String(tx?.status ?? '').toLowerCase();
    const txType = String(tx?.transactionType ?? '');
    const isPayment = txType === 'PaymentRequest' || txType.toLowerCase() === 'payment';

    const phoneRaw = tx?.counterpartIdentifier ?? '';
    const txnId = tx?.id ?? '';
    const paymentLinkId = tx?.transactionDetails?.paymentLinkId ?? '';
    const reference = tx?.transactionDetails?.reference ?? '';

    // MONTANT : centimes vs XOF direct
    const rawAmount = Number(tx?.amount?.amount ?? 0);
    const amountXof = rawAmount >= 100000 ? Math.round(rawAmount / 100) : rawAmount;

    console.log('Parsed →', { status, txType, phoneRaw, rawAmount, amountXof, paymentLinkId });

    if (!isPayment || status !== 'success') {
      return json({ received: true, action: 'ignored', status, txType });
    }

    const PRO_ID = 'd616710c-47fb-4afc-b0e2-e9fe3e0b29ab';
    const MAX_ID = 'e7715547-b693-40dd-b06e-9bbb63a90961';
    let planName = 'Pro';
    let priceXof = 2000;
    if (String(paymentLinkId).includes(MAX_ID) || amountXof >= 5000) {
      planName = 'Ultra Pro';
      priceXof = 5000;
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // MATCHING USER par téléphone
    const digits = String(phoneRaw).replace(/[^0-9]/g, '');
    const variants = new Set([
      digits,
      digits.replace(/^225/, ''),
      '225' + digits.replace(/^225/, ''),
    ]);

    let userId: string | null = null;
    const { data: profiles } = await supabase
      .from('profiles')
      .select('user_id, phone')
      .not('phone', 'is', null);
    const match = profiles?.find((p) => {
      const pd = String(p.phone ?? '').replace(/[^0-9]/g, '');
      if (!pd) return false;
      for (const v of variants) {
        if (v && (pd === v || pd.endsWith(v) || v.endsWith(pd))) return true;
      }
      return false;
    });
    if (match?.user_id) userId = match.user_id;

    // LOG TOUJOURS (réconciliation manuelle si non matché)
    await supabase.from('jeko_payments').insert({
      txn_id: txnId,
      phone: phoneRaw,
      amount: amountXof,
      raw_amount: rawAmount,
      plan_name: planName,
      payment_link_id: paymentLinkId,
      reference,
      matched_user_id: userId,
      raw_payload: parsed,
    });

    if (!userId) {
      console.error('User NOT matched, phone:', phoneRaw);
      return json({ received: true, note: 'logged, user unmatched: ' + phoneRaw });
    }

    const now = new Date();
    const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const graceUntil = new Date(expiresAt.getTime() + 3 * 24 * 60 * 60 * 1000);

    const { error: upErr } = await supabase.from('subscriptions').upsert(
      {
        user_id: userId,
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

    console.log(`✅ Activated ${planName} for user ${userId} (${phoneRaw})`);
    return json({ success: true, plan: planName, userId });
  } catch (e) {
    console.error('Webhook fatal:', e);
    return json({ error: String(e) }, 500);
  }
});
