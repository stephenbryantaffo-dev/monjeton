
CREATE OR REPLACE FUNCTION public.preview_caisse_invite(_token text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
  -- NULL max_uses = illimité (lien de groupe)
  IF v_invite.max_uses IS NOT NULL AND v_invite.uses_count >= v_invite.max_uses THEN
    RETURN jsonb_build_object('ok', false, 'error', 'max_uses_reached');
  END IF;
  SELECT name INTO v_name FROM public.tontines WHERE id = v_invite.caisse_id;
  RETURN jsonb_build_object('ok', true, 'caisse_name', v_name, 'role', v_invite.role);
END;
$function$;

CREATE OR REPLACE FUNCTION public.join_caisse_via_token(_token text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_invite public.caisse_invites%ROWTYPE;
  v_caisse_name text;
  v_uid uuid := auth.uid();
  v_updated int;
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

  -- Incrément atomique : NULL max_uses = illimité (lien de groupe)
  UPDATE public.caisse_invites
    SET uses_count = uses_count + 1
    WHERE id = v_invite.id
      AND (max_uses IS NULL OR uses_count < max_uses)
      AND (expires_at IS NULL OR expires_at > now());
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  IF v_updated = 0 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'max_uses_reached');
  END IF;

  INSERT INTO public.caisse_collaborators (caisse_id, user_id, role)
  VALUES (v_invite.caisse_id, v_uid, v_invite.role)
  ON CONFLICT (caisse_id, user_id) DO NOTHING;

  SELECT name INTO v_caisse_name FROM public.tontines WHERE id = v_invite.caisse_id;
  RETURN jsonb_build_object('ok', true, 'caisse_id', v_invite.caisse_id, 'caisse_name', v_caisse_name, 'role', v_invite.role);
END;
$function$;
