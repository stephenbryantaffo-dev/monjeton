
DROP POLICY IF EXISTS "Managers add collaborators" ON public.caisse_collaborators;

CREATE POLICY "Managers add non-owner collaborators"
ON public.caisse_collaborators
FOR INSERT
TO authenticated
WITH CHECK (
  is_caisse_collaborator(caisse_id, 'manager'::text)
  AND role <> 'owner'
);
