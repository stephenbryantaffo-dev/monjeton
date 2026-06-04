
-- Drop the old owner-only management policy
DROP POLICY IF EXISTS "Owner manages collaborators" ON public.caisse_collaborators;

-- SELECT: all collaborators can view the collaborator list
CREATE POLICY "Collaborators view collaborators"
  ON public.caisse_collaborators FOR SELECT TO authenticated
  USING (public.is_caisse_collaborator(caisse_id, 'viewer'));

-- INSERT: owners and managers can add new collaborators
CREATE POLICY "Managers add collaborators"
  ON public.caisse_collaborators FOR INSERT TO authenticated
  WITH CHECK (public.is_caisse_collaborator(caisse_id, 'manager'));

-- UPDATE: owners and managers can change roles, but never touch an owner row
CREATE POLICY "Managers update non-owner collaborators"
  ON public.caisse_collaborators FOR UPDATE TO authenticated
  USING (
    public.is_caisse_collaborator(caisse_id, 'manager')
    AND role <> 'owner'
  )
  WITH CHECK (
    public.is_caisse_collaborator(caisse_id, 'manager')
    AND role <> 'owner'
  );

-- DELETE: owners and managers can remove collaborators, but never an owner
CREATE POLICY "Managers remove non-owner collaborators"
  ON public.caisse_collaborators FOR DELETE TO authenticated
  USING (
    public.is_caisse_collaborator(caisse_id, 'manager')
    AND role <> 'owner'
  );
