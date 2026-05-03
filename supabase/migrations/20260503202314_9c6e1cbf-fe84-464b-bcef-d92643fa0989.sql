
-- 1) Restrict workspace_invites SELECT to owner/admin only
DROP POLICY IF EXISTS "Members can view invites" ON public.workspace_invites;

CREATE POLICY "Owner/admin can view invites"
ON public.workspace_invites
FOR SELECT
TO authenticated
USING (
  public.has_workspace_role(auth.uid(), workspace_id, ARRAY['owner'::workspace_role, 'admin'::workspace_role])
);

-- 2) Restrict workspace-logos uploads/updates/deletes to owner/admin of the workspace
-- Path convention: <workspace_id>/...
DROP POLICY IF EXISTS "Anyone can upload workspace logos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated can upload workspace logos" ON storage.objects;
DROP POLICY IF EXISTS "workspace_logos_insert" ON storage.objects;
DROP POLICY IF EXISTS "workspace_logos_update" ON storage.objects;
DROP POLICY IF EXISTS "workspace_logos_delete" ON storage.objects;

CREATE POLICY "workspace_logos_insert_owner_admin"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'workspace-logos'
  AND public.has_workspace_role(
    auth.uid(),
    ((storage.foldername(name))[1])::uuid,
    ARRAY['owner'::workspace_role, 'admin'::workspace_role]
  )
);

CREATE POLICY "workspace_logos_update_owner_admin"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'workspace-logos'
  AND public.has_workspace_role(
    auth.uid(),
    ((storage.foldername(name))[1])::uuid,
    ARRAY['owner'::workspace_role, 'admin'::workspace_role]
  )
);

CREATE POLICY "workspace_logos_delete_owner_admin"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'workspace-logos'
  AND public.has_workspace_role(
    auth.uid(),
    ((storage.foldername(name))[1])::uuid,
    ARRAY['owner'::workspace_role, 'admin'::workspace_role]
  )
);
