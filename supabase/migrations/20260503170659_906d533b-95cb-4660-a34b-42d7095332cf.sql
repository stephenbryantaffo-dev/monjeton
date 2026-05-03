
-- 1) Restrict public bucket listing on workspace-logos
-- Public buckets still allow direct URL access without RLS, so we can drop the broad SELECT.
DROP POLICY IF EXISTS "Anyone can view workspace logos" ON storage.objects;

-- 2) Lock down SECURITY DEFINER functions: revoke from PUBLIC/anon, grant only to authenticated where needed.
DO $$
DECLARE
  fn record;
BEGIN
  FOR fn IN
    SELECT n.nspname, p.proname, pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.prosecdef = true
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %I.%I(%s) FROM PUBLIC, anon;', fn.nspname, fn.proname, fn.args);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %I.%I(%s) TO authenticated, service_role;', fn.nspname, fn.proname, fn.args);
  END LOOP;
END $$;

-- get_invite_by_token must remain callable by anon (used to validate invite link before signin)
GRANT EXECUTE ON FUNCTION public.get_invite_by_token(text) TO anon;
