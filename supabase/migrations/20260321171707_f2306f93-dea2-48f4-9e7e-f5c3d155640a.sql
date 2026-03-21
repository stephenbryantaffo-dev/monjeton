-- Block UPDATE on user_roles to prevent role escalation
CREATE POLICY "Block direct role updates"
ON public.user_roles
FOR UPDATE
TO authenticated
USING (false);