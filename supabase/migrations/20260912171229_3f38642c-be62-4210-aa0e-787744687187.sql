GRANT SELECT ON public.payments TO authenticated;
GRANT ALL ON public.payments TO service_role;

DROP POLICY IF EXISTS "Admins can view all payments" ON public.payments;
CREATE POLICY "Admins can view all payments"
ON public.payments FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.admin_activate_payment(_txn_id text, _email text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid;
  _plan text;
  _now timestamptz := now();
  _expires timestamptz;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  SELECT id INTO _uid FROM auth.users WHERE lower(email) = lower(trim(_email)) LIMIT 1;
  IF _uid IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'no_account');
  END IF;

  SELECT plan_name INTO _plan FROM public.payments WHERE txn_id = _txn_id;
  IF _plan IS NULL THEN
    SELECT plan_name INTO _plan FROM public.jeko_payments WHERE txn_id = _txn_id;
  END IF;
  _plan := COALESCE(_plan, 'Pro');
  _expires := _now + interval '30 days';

  INSERT INTO public.subscriptions (user_id, status, plan_name, price_xof, activated_at, expires_at, grace_until, updated_at)
  VALUES (_uid, 'active', _plan, CASE WHEN _plan ILIKE '%ultra%' THEN 5000 ELSE 2000 END, _now, _expires, _expires + interval '3 days', _now)
  ON CONFLICT (user_id) DO UPDATE SET
    status = 'active', plan_name = EXCLUDED.plan_name, price_xof = EXCLUDED.price_xof,
    activated_at = EXCLUDED.activated_at, expires_at = EXCLUDED.expires_at,
    grace_until = EXCLUDED.grace_until, last_reminder_sent = NULL, updated_at = _now;

  UPDATE public.payments
     SET user_id = _uid, payer_email = COALESCE(payer_email, lower(trim(_email))),
         status = 'claimed', claimed_at = _now
   WHERE txn_id = _txn_id;

  UPDATE public.jeko_payments
     SET matched_user_id = _uid, activated = true
   WHERE txn_id = _txn_id;

  RETURN jsonb_build_object('success', true, 'user_id', _uid, 'plan', _plan, 'expires_at', _expires);
END;
$$;

REVOKE ALL ON FUNCTION public.admin_activate_payment(text, text) FROM public;
GRANT EXECUTE ON FUNCTION public.admin_activate_payment(text, text) TO authenticated;