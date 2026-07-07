-- Table de configuration système (service_role only, aucune RLS pour authenticated/anon)
CREATE TABLE IF NOT EXISTS public.system_config (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

REVOKE ALL ON public.system_config FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.system_config TO service_role;
ALTER TABLE public.system_config ENABLE ROW LEVEL SECURITY;
-- Aucune policy => authenticated/anon ne peuvent rien. service_role bypasse RLS.

-- Génère un token si absent
INSERT INTO public.system_config (key, value)
VALUES ('reminders_cron_token', replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', ''))
ON CONFLICT (key) DO NOTHING;

-- Nettoie d'éventuels jobs existants
DO $$
BEGIN
  PERFORM cron.unschedule('reminders-morning') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname='reminders-morning');
  PERFORM cron.unschedule('reminders-evening') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname='reminders-evening');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- Planification : 8h UTC (matin) et 20h UTC (soir)
SELECT cron.schedule(
  'reminders-morning',
  '0 8 * * *',
  $$
  SELECT net.http_post(
    url := 'https://xmganxsmfvcbuffeelej.supabase.co/functions/v1/send-daily-reminders?slot=morning',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-token', (SELECT value FROM public.system_config WHERE key = 'reminders_cron_token')
    ),
    body := '{}'::jsonb
  );
  $$
);

SELECT cron.schedule(
  'reminders-evening',
  '0 20 * * *',
  $$
  SELECT net.http_post(
    url := 'https://xmganxsmfvcbuffeelej.supabase.co/functions/v1/send-daily-reminders?slot=evening',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-token', (SELECT value FROM public.system_config WHERE key = 'reminders_cron_token')
    ),
    body := '{}'::jsonb
  );
  $$
);