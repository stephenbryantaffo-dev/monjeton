-- Drop permissive block policies and replace with RESTRICTIVE ones
DROP POLICY IF EXISTS "Block direct role inserts" ON public.user_roles;
DROP POLICY IF EXISTS "Block direct role updates" ON public.user_roles;
DROP POLICY IF EXISTS "Block direct role deletes" ON public.user_roles;

-- RESTRICTIVE policies: these MUST pass in addition to any permissive policy
CREATE POLICY "Restrict role inserts"
ON public.user_roles
AS RESTRICTIVE
FOR INSERT
TO authenticated
WITH CHECK (false);

CREATE POLICY "Restrict role updates"
ON public.user_roles
AS RESTRICTIVE
FOR UPDATE
TO authenticated
USING (false);

CREATE POLICY "Restrict role deletes"
ON public.user_roles
AS RESTRICTIVE
FOR DELETE
TO authenticated
USING (false);