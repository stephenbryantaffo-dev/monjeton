CREATE POLICY "Users can view own jeko_payments"
ON public.jeko_payments
FOR SELECT
TO authenticated
USING (matched_user_id = auth.uid());

GRANT SELECT ON public.jeko_payments TO authenticated;