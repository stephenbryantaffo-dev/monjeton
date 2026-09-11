CREATE TABLE IF NOT EXISTS public.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  txn_id text NOT NULL UNIQUE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  payer_email text,
  payer_phone text,
  amount integer NOT NULL DEFAULT 0,
  plan_name text NOT NULL DEFAULT 'Pro',
  status text NOT NULL DEFAULT 'paid',
  created_at timestamptz NOT NULL DEFAULT now(),
  claimed_at timestamptz
);

GRANT ALL ON public.payments TO service_role;

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role manages payments"
  ON public.payments FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS payments_pending_email_idx
  ON public.payments (lower(payer_email))
  WHERE user_id IS NULL AND status = 'paid';

CREATE OR REPLACE FUNCTION public.claim_pending_payment()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_email text;
  v_pay public.payments%ROWTYPE;
  v_plan text;
  v_price integer;
  v_now timestamptz := now();
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_authenticated');
  END IF;

  SELECT lower(email) INTO v_email FROM auth.users WHERE id = v_uid;
  IF v_email IS NULL OR v_email = '' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'no_email');
  END IF;

  -- Le plus récent seulement : les doublons restent en 'paid' pour le support
  SELECT * INTO v_pay
  FROM public.payments
  WHERE user_id IS NULL
    AND status = 'paid'
    AND lower(payer_email) = v_email
  ORDER BY created_at DESC
  LIMIT 1
  FOR UPDATE SKIP LOCKED;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', true, 'claimed', false);
  END IF;

  v_plan := COALESCE(NULLIF(v_pay.plan_name, ''), 'Pro');
  v_price := CASE WHEN v_plan = 'Ultra Pro' THEN 5000 ELSE 2000 END;

  UPDATE public.payments
  SET user_id = v_uid, status = 'claimed', claimed_at = v_now
  WHERE id = v_pay.id;

  INSERT INTO public.subscriptions (
    user_id, status, plan_name, price_xof,
    activated_at, expires_at, grace_until, updated_at
  ) VALUES (
    v_uid, 'active', v_plan, v_price,
    v_now, v_now + INTERVAL '30 days', v_now + INTERVAL '33 days', v_now
  )
  ON CONFLICT (user_id) DO UPDATE SET
    status = 'active',
    plan_name = EXCLUDED.plan_name,
    price_xof = EXCLUDED.price_xof,
    activated_at = EXCLUDED.activated_at,
    expires_at = EXCLUDED.expires_at,
    grace_until = EXCLUDED.grace_until,
    updated_at = EXCLUDED.updated_at;

  RETURN jsonb_build_object('ok', true, 'claimed', true, 'plan', v_plan);
END;
$$;

REVOKE ALL ON FUNCTION public.claim_pending_payment() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.claim_pending_payment() TO authenticated;