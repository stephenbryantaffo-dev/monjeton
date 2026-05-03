DROP POLICY IF EXISTS users_delete_non_confirmed_scans ON public.receipt_scans;
CREATE POLICY users_delete_own_scans ON public.receipt_scans FOR DELETE TO authenticated USING (auth.uid() = user_id);