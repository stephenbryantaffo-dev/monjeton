CREATE POLICY "Block client inserts on jeko_payments"
  ON public.jeko_payments
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (false);

CREATE POLICY "Block client updates on jeko_payments"
  ON public.jeko_payments
  FOR UPDATE
  TO anon, authenticated
  USING (false)
  WITH CHECK (false);

CREATE POLICY "Block client deletes on jeko_payments"
  ON public.jeko_payments
  FOR DELETE
  TO anon, authenticated
  USING (false);