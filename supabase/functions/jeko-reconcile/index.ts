// Filet de sécurité : interroge l'API Jèko toutes les 15 min (voir migration
// jeko_payments_reconcile) pour rattraper les paiements dont le webhook
// jeko-webhook n'aurait pas été reçu (webhook non configuré côté Jèko, panne
// réseau, etc.). Utilise la même logique de matching/activation que le
// webhook (_shared/jeko-payment-processor.ts), avec dédup sur txn_id.
//
// Déclenché par pg_cron via net.http_post, authentifié par le même token
// que les autres jobs planifiés (public.system_config.reminders_cron_token).
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { listRecentTransactions } from '../_shared/jeko-client.ts';
import { parseJekoTransaction } from '../_shared/jeko-parse.ts';
import { processJekoTransaction } from '../_shared/jeko-payment-processor.ts';

Deno.serve(async (req) => {
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { 'Content-Type': 'application/json' },
    });

  if (req.method === 'OPTIONS') return new Response('ok');

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  const url = new URL(req.url);
  const token = url.searchParams.get('token') || req.headers.get('x-cron-token') || '';
  const { data: cfg } = await supabase
    .from('system_config')
    .select('value')
    .eq('key', 'reminders_cron_token')
    .maybeSingle();
  const expected = cfg?.value || Deno.env.get('REMINDERS_CRON_TOKEN') || '';

  if (!expected || token !== expected) {
    return json({ error: 'unauthorized' }, 401);
  }

  const stats = { seen: 0, activated: 0, unmatched: 0, duplicate: 0, ignored: 0, errors: 0 };

  try {
    const list = await listRecentTransactions();
    // Format non confirmé côté doc Jèko — on tente les formes les plus probables.
    const rawList = list?.data ?? list?.transactions ?? (Array.isArray(list) ? list : []);

    for (const rawTx of rawList) {
      stats.seen++;
      try {
        const parsed = parseJekoTransaction(rawTx);
        const outcome = await processJekoTransaction(supabase, parsed, rawTx, 'reconcile');
        if (outcome.action === 'activated') stats.activated++;
        else if (outcome.action === 'unmatched') stats.unmatched++;
        else if (outcome.action === 'duplicate') stats.duplicate++;
        else stats.ignored++;
      } catch (e) {
        console.error('jeko-reconcile: error processing transaction', e);
        stats.errors++;
      }
    }

    return json({ ok: true, ...stats });
  } catch (e) {
    console.error('jeko-reconcile fatal:', e);
    return json({ error: String(e), ...stats }, 500);
  }
});
