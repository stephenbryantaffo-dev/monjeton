
-- Drop the dangerous policy that exposes all invites publicly
DROP POLICY IF EXISTS "Anyone can read invite by token" ON public.workspace_invites;

-- Create a security definer function to look up invites by token safely
CREATE OR REPLACE FUNCTION public.get_invite_by_token(_token text)
RETURNS SETOF public.workspace_invites
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT * FROM public.workspace_invites
  WHERE invite_link_token = _token
    AND status = 'active'
    AND expires_at > now()
  LIMIT 1;
$$;
