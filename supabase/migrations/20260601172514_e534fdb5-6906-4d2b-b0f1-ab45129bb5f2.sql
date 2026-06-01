ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS activated_at timestamptz DEFAULT now(),
  ADD COLUMN IF NOT EXISTS expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_reminder_sent text,
  ADD COLUMN IF NOT EXISTS grace_until timestamptz;

-- Backfill for existing active subscriptions
UPDATE public.subscriptions
SET activated_at = COALESCE(activated_at, updated_at, created_at, now()),
    expires_at = COALESCE(expires_at, COALESCE(updated_at, created_at, now()) + interval '30 days'),
    grace_until = COALESCE(grace_until, COALESCE(updated_at, created_at, now()) + interval '33 days')
WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_subscriptions_expires_at ON public.subscriptions(expires_at) WHERE status = 'active';