DROP POLICY IF EXISTS "Users can join workspace" ON public.workspace_members;

CREATE POLICY "Users can join workspace with valid invite"
ON public.workspace_members
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND role = 'member'::workspace_role
  AND EXISTS (
    SELECT 1 FROM public.workspace_invites wi
    WHERE wi.workspace_id = workspace_members.workspace_id
      AND wi.status = 'active'
      AND wi.expires_at > now()
      AND (
        wi.email IS NULL
        OR lower(wi.email) = lower(COALESCE((SELECT p.email FROM public.profiles p WHERE p.user_id = auth.uid()), ''))
      )
  )
);