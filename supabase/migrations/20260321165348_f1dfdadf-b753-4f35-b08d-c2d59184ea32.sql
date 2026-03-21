
-- Ensure RLS is enabled
ALTER TABLE public.transaction_attachments ENABLE ROW LEVEL SECURITY;

-- Drop existing permissive policies
DROP POLICY IF EXISTS "Members can view attachments" ON public.transaction_attachments;
DROP POLICY IF EXISTS "Members can add attachments" ON public.transaction_attachments;

-- SELECT: own personal attachments OR workspace member
CREATE POLICY "Users can view own attachments"
ON public.transaction_attachments
FOR SELECT
TO authenticated
USING (
  (workspace_id IS NULL AND created_by = auth.uid())
  OR (workspace_id IS NOT NULL AND is_workspace_member(auth.uid(), workspace_id))
);

-- INSERT: must be the creator
CREATE POLICY "Users can add own attachments"
ON public.transaction_attachments
FOR INSERT
TO authenticated
WITH CHECK (
  created_by = auth.uid()
  AND (
    workspace_id IS NULL
    OR is_workspace_member(auth.uid(), workspace_id)
  )
);

-- DELETE: only own attachments
CREATE POLICY "Users can delete own attachments"
ON public.transaction_attachments
FOR DELETE
TO authenticated
USING (created_by = auth.uid());
