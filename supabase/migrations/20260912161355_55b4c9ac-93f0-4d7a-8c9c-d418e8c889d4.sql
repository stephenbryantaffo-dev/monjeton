CREATE OR REPLACE FUNCTION public.claim_pending_payment()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_email text;
  v_phone text;
  v_pay public.payments%ROWTYPE;
  v_plan text;
  v_price integer;
  v_now timestamptz := now();
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_authenticated');
  END IF;

  SELECT lower(email) INTO v_email FROM auth.users WHERE id = v_uid;
  SELECT regexp_replace(coalesce(phone, ''), '[^0-9]', '', 'g') INTO v_phone
  FROM public.profiles WHERE user_id = v_uid LIMIT 1;
  IF v_phone IS NOT NULL AND length(v_phone) < 8 THEN
    v_phone := NULL;
  END IF;

  IF (v_email IS NULL OR v_email = '') AND v_phone IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'no_identity');
  END IF;

  SELECT * INTO v_pay
  FROM public.payments p
  WHERE p.user_id IS NULL
    AND p.status = 'paid'
    AND (
      (v_email IS NOT NULL AND lower(p.payer_email) = v_email)
      OR (
        v_phone IS NOT NULL
        AND p.payer_phone IS NOT NULL
        AND right(regexp_replace(p.payer_phone, '[^0-9]', '', 'g'), 8) = right(v_phone, 8)
      )
    )
  ORDER BY p.created_at DESC
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

INSERT INTO public.payments (txn_id, user_id, payer_phone, amount, plan_name, status)
SELECT j.txn_id, NULL, j.phone, j.raw_amount, j.plan_name, 'paid'
FROM public.jeko_payments j
WHERE j.activated = false
  AND j.matched_user_id IS NULL
ON CONFLICT (txn_id) DO NOTHING;