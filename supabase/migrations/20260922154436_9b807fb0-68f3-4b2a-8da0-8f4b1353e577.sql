CREATE OR REPLACE FUNCTION public.has_active_pro(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.subscriptions s
    WHERE s.user_id = _user_id
      AND s.status = 'active'
      AND COALESCE(s.grace_until, s.expires_at) > now()
  );
$$;

GRANT EXECUTE ON FUNCTION public.has_active_pro(uuid) TO authenticated, service_role;