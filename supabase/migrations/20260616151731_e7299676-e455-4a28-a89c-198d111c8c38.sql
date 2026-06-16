
-- Table d'attente : emails Chariow non encore matchés à un compte
CREATE TABLE public.pending_pro_emails (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  plan_name text NOT NULL DEFAULT 'Pro',
  source text DEFAULT 'chariow',
  chariow_sale_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  applied_at timestamptz
);

GRANT ALL ON public.pending_pro_emails TO service_role;

ALTER TABLE public.pending_pro_emails ENABLE ROW LEVEL SECURITY;

CREATE POLICY "block_all_anon_pending_pro_emails" ON public.pending_pro_emails
  FOR ALL TO anon USING (false) WITH CHECK (false);
CREATE POLICY "block_all_auth_pending_pro_emails" ON public.pending_pro_emails
  FOR ALL TO authenticated USING (false) WITH CHECK (false);

-- Table d'idempotence : sale.id Chariow déjà traités
CREATE TABLE public.chariow_processed_sales (
  sale_id text PRIMARY KEY,
  processed_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.chariow_processed_sales TO service_role;

ALTER TABLE public.chariow_processed_sales ENABLE ROW LEVEL SECURITY;

CREATE POLICY "block_all_anon_chariow_processed_sales" ON public.chariow_processed_sales
  FOR ALL TO anon USING (false) WITH CHECK (false);
CREATE POLICY "block_all_auth_chariow_processed_sales" ON public.chariow_processed_sales
  FOR ALL TO authenticated USING (false) WITH CHECK (false);

-- Trigger : appliquer Pro en attente à l'inscription
CREATE OR REPLACE FUNCTION public.apply_pending_pro_on_signup()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pending public.pending_pro_emails%ROWTYPE;
  v_now timestamptz := now();
BEGIN
  SELECT * INTO v_pending
  FROM public.pending_pro_emails
  WHERE email = lower(NEW.email)
    AND applied_at IS NULL
  LIMIT 1;

  IF FOUND THEN
    INSERT INTO public.subscriptions (
      user_id, status, plan_name, price_xof,
      activated_at, expires_at, grace_until, updated_at
    )
    VALUES (
      NEW.user_id, 'active', COALESCE(v_pending.plan_name, 'Pro'), 2000,
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

    UPDATE public.pending_pro_emails
    SET applied_at = v_now
    WHERE id = v_pending.id;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER apply_pending_pro_after_profile_insert
AFTER INSERT ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.apply_pending_pro_on_signup();
