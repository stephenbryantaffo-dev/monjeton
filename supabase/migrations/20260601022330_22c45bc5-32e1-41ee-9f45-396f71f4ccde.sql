CREATE TABLE IF NOT EXISTS public.jeko_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  txn_id text,
  phone text,
  amount numeric,
  raw_amount numeric,
  plan_name text,
  payment_link_id text,
  reference text,
  matched_user_id uuid,
  raw_payload jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.jeko_payments TO service_role;

ALTER TABLE public.jeko_payments ENABLE ROW LEVEL SECURITY;

-- Service-role only access (edge functions). No public/user policy.
CREATE POLICY "Admins can view jeko_payments"
ON public.jeko_payments
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));