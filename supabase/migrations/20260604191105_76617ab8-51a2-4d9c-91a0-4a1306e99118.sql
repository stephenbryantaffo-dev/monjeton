-- Restrict writes on rate_limits to service_role only (server-side rate limiting).
-- Without this, any authenticated user could insert fake rows or delete their own
-- entries to reset counters and bypass rate limiting.

-- Defensive: drop any pre-existing equivalent policies
DROP POLICY IF EXISTS "Block client inserts on rate_limits" ON public.rate_limits;
DROP POLICY IF EXISTS "Block client updates on rate_limits" ON public.rate_limits;
DROP POLICY IF EXISTS "Block client deletes on rate_limits" ON public.rate_limits;

-- No-op policies => denies INSERT/UPDATE/DELETE to anon and authenticated
CREATE POLICY "Block client inserts on rate_limits"
  ON public.rate_limits FOR INSERT TO anon, authenticated
  WITH CHECK (false);

CREATE POLICY "Block client updates on rate_limits"
  ON public.rate_limits FOR UPDATE TO anon, authenticated
  USING (false) WITH CHECK (false);

CREATE POLICY "Block client deletes on rate_limits"
  ON public.rate_limits FOR DELETE TO anon, authenticated
  USING (false);

-- service_role bypasses RLS, so edge functions using the service role key
-- continue to insert / update / delete normally.
