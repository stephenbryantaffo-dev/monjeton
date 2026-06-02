-- 1. Invites table
CREATE TABLE IF NOT EXISTS public.caisse_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  caisse_id uuid NOT NULL REFERENCES public.caisses(id) ON DELETE CASCADE,
  token text NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex'),
  role text NOT NULL DEFAULT 'viewer',
  created_by uuid NOT NULL,
  expires_at timestamptz,
  max_uses integer,
  uses_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.caisse_invites TO authenticated;
GRANT ALL ON public.caisse_invites TO service_role;

ALTER TABLE public.caisse_invites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner manages invites"
  ON public.caisse_invites FOR ALL TO authenticated
  USING (public.is_caisse_collaborator(caisse_id, 'owner'))
  WITH CHECK (public.is_caisse_collaborator(caisse_id, 'owner'));

CREATE INDEX IF NOT EXISTS idx_caisse_invites_token ON public.caisse_invites(token);
CREATE INDEX IF NOT EXISTS idx_caisse_invites_caisse ON public.caisse_invites(caisse_id);

-- 2. Preview function (returns caisse name + role without exposing invites table)
CREATE OR REPLACE FUNCTION public.preview_caisse_invite(_token text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invite public.caisse_invites%ROWTYPE;
  v_name text;
BEGIN
  SELECT * INTO v_invite FROM public.caisse_invites WHERE token = _token;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_token');
  END IF;
  IF v_invite.expires_at IS NOT NULL AND v_invite.expires_at < now() THEN
    RETURN jsonb_build_object('ok', false, 'error', 'expired');
  END IF;
  IF v_invite.max_uses IS NOT NULL AND v_invite.uses_count >= v_invite.max_uses THEN
    RETURN jsonb_build_object('ok', false, 'error', 'max_uses_reached');
  END IF;
  SELECT name INTO v_name FROM public.caisses WHERE id = v_invite.caisse_id;
  RETURN jsonb_build_object('ok', true, 'caisse_name', v_name, 'role', v_invite.role);
END;
$$;

-- 3. Join function (validates token + adds user as collaborator)
CREATE OR REPLACE FUNCTION public.join_caisse_via_token(_token text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invite public.caisse_invites%ROWTYPE;
  v_caisse_name text;
  v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_authenticated');
  END IF;

  SELECT * INTO v_invite FROM public.caisse_invites WHERE token = _token;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_token');
  END IF;

  IF v_invite.expires_at IS NOT NULL AND v_invite.expires_at < now() THEN
    RETURN jsonb_build_object('ok', false, 'error', 'expired');
  END IF;

  IF v_invite.max_uses IS NOT NULL AND v_invite.uses_count >= v_invite.max_uses THEN
    RETURN jsonb_build_object('ok', false, 'error', 'max_uses_reached');
  END IF;

  INSERT INTO public.caisse_collaborators (caisse_id, user_id, role)
  VALUES (v_invite.caisse_id, v_uid, v_invite.role)
  ON CONFLICT (caisse_id, user_id) DO NOTHING;

  UPDATE public.caisse_invites
    SET uses_count = uses_count + 1
    WHERE id = v_invite.id;

  SELECT name INTO v_caisse_name FROM public.caisses WHERE id = v_invite.caisse_id;

  RETURN jsonb_build_object(
    'ok', true,
    'caisse_id', v_invite.caisse_id,
    'caisse_name', v_caisse_name,
    'role', v_invite.role
  );
END;
$$;