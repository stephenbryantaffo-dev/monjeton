-- Add RESTRICTIVE policies for public (anon) role on user_roles
CREATE POLICY "Restrict anon role inserts"
ON public.user_roles
AS RESTRICTIVE
FOR INSERT
TO public
WITH CHECK (false);

CREATE POLICY "Restrict anon role updates"
ON public.user_roles
AS RESTRICTIVE
FOR UPDATE
TO public
USING (false);

CREATE POLICY "Restrict anon role deletes"
ON public.user_roles
AS RESTRICTIVE
FOR DELETE
TO public
USING (false);