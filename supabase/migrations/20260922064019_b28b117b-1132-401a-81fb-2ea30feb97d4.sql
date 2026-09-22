DROP POLICY IF EXISTS "Owner/admin can update members" ON public.workspace_members;

CREATE POLICY "Owner/admin can update members"
ON public.workspace_members
FOR UPDATE
TO authenticated
USING (public.has_workspace_role(auth.uid(), workspace_id, ARRAY['owner'::workspace_role, 'admin'::workspace_role]))
WITH CHECK (
  public.has_workspace_role(auth.uid(), workspace_id, ARRAY['owner'::workspace_role, 'admin'::workspace_role])
  AND (role <> 'owner'::workspace_role OR public.has_workspace_role(auth.uid(), workspace_id, ARRAY['owner'::workspace_role]))
);