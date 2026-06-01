import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const JEKO_PRO_URL = 'https://pay.jeko.africa/pl/d616710c-47fb-4afc-b0e2-e9fe3e0b29ab';
const JEKO_MAX_URL = 'https://pay.jeko.africa/pl/e7715547-b693-40dd-b06e-9bbb63a90961';

type Stage = 'j7' | 'j3' | 'j1' | 'j0';

function buildMessage(stage: Stage, planName: string, url: string): { title: string; body: string; wa: string } {
  const plan = planName || 'Pro';
  if (stage === 'j7') {
    return {
      title: `Ton accès ${plan} expire dans 7 jours`,
      body: `Pense à renouveler ton abonnement pour ne rien perdre.`,
      wa:
        `👋 *Mon Jeton* — Ton accès ${plan} expire *dans 7 jours*.\n\n` +
        `Pour continuer à profiter de tes scans illimités et de l'assistant IA, ` +
        `renouvelle dès maintenant 👉 ${url}\n\n🪙 monjeton.app`,
    };
  }
  if (stage === 'j3') {
    return {
      title: `Plus que 3 jours sur ton plan ${plan}`,
      body: `Garde tes scans, ton coach IA et tes alertes WhatsApp actifs.`,
      wa:
        `⏳ *Plus que 3 jours* sur ton abonnement ${plan}.\n\n` +
        `Évite la coupure : renouvelle en 1 clic 👉 ${url}\n\n🪙 Mon Jeton — monjeton.app`,
    };
  }
  if (stage === 'j1') {
    return {
      title: `Dernier jour avant l'expiration`,
      body: `Ton plan ${plan} expire demain. Renouvelle maintenant.`,
      wa:
        `🚨 *Dernier jour !* Ton plan ${plan} expire *demain*.\n\n` +
        `Renouvelle maintenant pour garder ton accès complet 👉 ${url}\n\n🪙 Mon Jeton`,
    };
  }
  return {
    title: `Ton abonnement expire aujourd'hui`,
    body: `Renouvelle ton plan ${plan} pour ne pas perdre tes avantages.`,
    wa:
      `⚠️ *Aujourd'hui*, ton abonnement ${plan} expire.\n\n` +
      `Renouvelle dès maintenant pour rester Pro 👉 ${url}\n\n🪙 Mon Jeton`,
  };
}

function getStage(daysLeft: number): Stage | null {
  if (daysLeft <= 0) return 'j0';
  if (daysLeft === 1) return 'j1';
  if (daysLeft <= 3) return 'j3';
  if (daysLeft <= 7) return 'j7';
  return null;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  const now = new Date();
  const stats = { processed: 0, reminded: 0, expired: 0, errors: 0 };

  try {
    const { data: subs, error } = await supabase
      .from('subscriptions')
      .select('id, user_id, status, plan_name, expires_at, grace_until, last_reminder_sent')
      .eq('status', 'active')
      .not('expires_at', 'is', null);

    if (error) throw error;

    for (const sub of subs || []) {
      stats.processed++;
      try {
        const expiresAt = new Date(sub.expires_at as string);
        const graceUntil = sub.grace_until
          ? new Date(sub.grace_until as string)
          : new Date(expiresAt.getTime() + 3 * 24 * 60 * 60 * 1000);

        // Expired past grace -> downgrade
        if (now > graceUntil) {
          await supabase
            .from('subscriptions')
            .update({
              status: 'expired',
              plan_name: 'Gratuit',
              price_xof: 0,
              last_reminder_sent: 'expired',
              updated_at: now.toISOString(),
            })
            .eq('id', sub.id);

          await supabase.from('notifications').insert({
            user_id: sub.user_id,
            type: 'subscription_expired',
            title: 'Abonnement expiré',
            message: `Ton abonnement ${sub.plan_name || 'Pro'} a expiré. Tu es repassé en plan Gratuit. Renouvelle quand tu veux.`,
          });

          stats.expired++;
          continue;
        }

        const msLeft = expiresAt.getTime() - now.getTime();
        const daysLeft = Math.ceil(msLeft / (24 * 60 * 60 * 1000));
        const stage = getStage(daysLeft);
        if (!stage) continue;
        if (sub.last_reminder_sent === stage) continue;

        const url = (sub.plan_name || '').toLowerCase().includes('ultra') ? JEKO_MAX_URL : JEKO_PRO_URL;
        const { title, body } = buildMessage(stage, sub.plan_name || 'Pro', url);

        // In-app notification
        await supabase.from('notifications').insert({
          user_id: sub.user_id,
          type: 'subscription_reminder',
          title,
          message: body,
        });

        await supabase
          .from('subscriptions')
          .update({ last_reminder_sent: stage, updated_at: now.toISOString() })
          .eq('id', sub.id);

        stats.reminded++;
      } catch (e) {
        console.error('sub error', sub.id, e);
        stats.errors++;
      }
    }

    return new Response(JSON.stringify({ ok: true, ...stats }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('fatal', e);
    return new Response(JSON.stringify({ error: String(e), ...stats }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
