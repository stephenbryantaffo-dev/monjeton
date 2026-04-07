
-- Create receipt_scan_history audit trail table
CREATE TABLE public.receipt_scan_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scan_id UUID NOT NULL REFERENCES public.receipt_scans(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  changed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  changed_field TEXT NOT NULL,
  old_value TEXT,
  new_value TEXT,
  change_reason TEXT
);

ALTER TABLE public.receipt_scan_history ENABLE ROW LEVEL SECURITY;

-- Users can view their own history
CREATE POLICY "users_see_own_history"
ON public.receipt_scan_history FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Users can insert their own history
CREATE POLICY "users_insert_own_history"
ON public.receipt_scan_history FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Admin can view all history
CREATE POLICY "admin_view_all_history"
ON public.receipt_scan_history FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Nobody can delete or update history (no policies = denied)

-- Refine receipt_scans: drop the broad ALL policy and replace with granular ones
DROP POLICY IF EXISTS "Users CRUD own receipt_scans" ON public.receipt_scans;

-- SELECT own scans
CREATE POLICY "users_select_own_scans"
ON public.receipt_scans FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- INSERT own scans
CREATE POLICY "users_insert_own_scans"
ON public.receipt_scans FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- UPDATE own scans
CREATE POLICY "users_update_own_scans"
ON public.receipt_scans FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

-- DELETE only non-confirmed scans
CREATE POLICY "users_delete_non_confirmed_scans"
ON public.receipt_scans FOR DELETE
TO authenticated
USING (auth.uid() = user_id AND status != 'confirmed');
