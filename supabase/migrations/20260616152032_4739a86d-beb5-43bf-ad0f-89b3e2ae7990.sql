
-- Retirer le trigger séparé pour éviter la concurrence avec handle_new_user
DROP TRIGGER IF EXISTS apply_pending_pro_after_profile_insert ON public.profiles;
DROP FUNCTION IF EXISTS public.apply_pending_pro_on_signup();

-- Étendre handle_new_user : crée profile + role + active Pro si email en attente
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pending public.pending_pro_emails%ROWTYPE;
  v_now timestamptz := now();
  v_email text := lower(COALESCE(NEW.email, ''));
BEGIN
  INSERT INTO public.profiles (user_id, email, full_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', ''));

  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user');

  -- Activation Pro en attente (NON BLOQUANT : toute erreur est avalée)
  IF v_email <> '' THEN
    BEGIN
      SELECT * INTO v_pending
      FROM public.pending_pro_emails
      WHERE email = v_email AND applied_at IS NULL
      LIMIT 1;

      IF FOUND THEN
        INSERT INTO public.subscriptions (
          user_id, status, plan_name, price_xof,
          activated_at, expires_at, grace_until, updated_at
        )
        VALUES (
          NEW.id, 'active', COALESCE(v_pending.plan_name, 'Pro'), 2000,
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

        RAISE NOTICE 'Chariow: Pro auto-activated for % at signup', v_email;
      END IF;
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'Chariow pending-Pro activation failed for % : %', v_email, SQLERRM;
    END;
  END IF;

  RETURN NEW;
END;
$$;
