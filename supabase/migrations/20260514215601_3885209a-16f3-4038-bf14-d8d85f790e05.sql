-- Rate limits table
CREATE TABLE IF NOT EXISTS public.rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint text NOT NULL,
  called_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rate_limits_user_endpoint_time
  ON public.rate_limits(user_id, endpoint, called_at DESC);

ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users see own limits" ON public.rate_limits;
CREATE POLICY "users see own limits"
  ON public.rate_limits FOR SELECT
  USING (auth.uid() = user_id);

-- INSERT is performed by edge functions via service role; no client INSERT policy needed.

-- Daily cleanup function
CREATE OR REPLACE FUNCTION public.cleanup_rate_limits()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.rate_limits
  WHERE called_at < now() - INTERVAL '24 hours';
END;
$$;