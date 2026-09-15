-- Support pour le job de réconciliation Jèko (filet de sécurité en plus du
-- webhook) : on doit pouvoir dédupliquer une transaction vue plusieurs fois
-- (webhook + polling) et savoir d'où vient chaque ligne.

ALTER TABLE public.jeko_payments
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'webhook';

-- Empêche le double-traitement d'une même transaction (webhook reçu deux
-- fois, ou webhook + réconciliation sur le même txn_id).
CREATE UNIQUE INDEX IF NOT EXISTS jeko_payments_txn_id_unique
  ON public.jeko_payments (txn_id)
  WHERE txn_id IS NOT NULL AND txn_id <> '';

-- Nettoie un éventuel job existant du même nom (ré-application de la migration).
DO $$
BEGIN
  PERFORM cron.unschedule('jeko-reconcile') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname='jeko-reconcile');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- Planifie le job de réconciliation toutes les 15 minutes, sur le même
-- principe (token partagé) que les jobs de rappel existants.
SELECT cron.schedule(
  'jeko-reconcile',
  '*/15 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://xmganxsmfvcbuffeelej.supabase.co/functions/v1/jeko-reconcile',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-token', (SELECT value FROM public.system_config WHERE key = 'reminders_cron_token')
    ),
    body := '{}'::jsonb
  );
  $$
);
