CREATE TABLE public.push_notifications_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  notification_type TEXT NOT NULL,
  dedup_key TEXT NOT NULL,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX push_notifications_log_dedup_idx
  ON public.push_notifications_log (user_id, notification_type, dedup_key);

CREATE INDEX push_notifications_log_sent_at_idx
  ON public.push_notifications_log (sent_at);

GRANT SELECT ON public.push_notifications_log TO authenticated;
GRANT ALL ON public.push_notifications_log TO service_role;

ALTER TABLE public.push_notifications_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own push log"
  ON public.push_notifications_log
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);