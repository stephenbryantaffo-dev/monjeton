DO $$
DECLARE
  v_caisse uuid := '1e83288e-f5ea-4aa2-bf97-9c4a2d9ff26f'; -- THB SHOWW
  v_owner  uuid := '0e88962c-12f7-4915-ae19-26dff4c06911';
  v_joiner uuid := 'e4060b77-2198-4062-a681-a3878e4988e0'; -- demo@
  v_token  text := 'test_join_token_' || extract(epoch from now())::text;
  v_preview jsonb;
  v_join    jsonb;
  v_uses_before int;
  v_uses_after  int;
  v_collab_exists boolean;
BEGIN
  -- 1. Insérer une invitation (en tant qu'owner)
  INSERT INTO public.caisse_invites (caisse_id, role, created_by, token, expires_at)
  VALUES (v_caisse, 'viewer', v_owner, v_token, now() + interval '7 days');

  SELECT uses_count INTO v_uses_before FROM public.caisse_invites WHERE token = v_token;
  RAISE NOTICE '[INVITE] créée token=% uses_before=%', v_token, v_uses_before;

  -- 2. Preview (sécurité definer, pas besoin d'auth)
  v_preview := public.preview_caisse_invite(v_token);
  RAISE NOTICE '[PREVIEW] %', v_preview;

  -- 3. Simuler auth.uid() = v_joiner via jwt claims local
  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', v_joiner::text, 'role', 'authenticated')::text,
    true);

  v_join := public.join_caisse_via_token(v_token);
  RAISE NOTICE '[JOIN]    %', v_join;

  -- 4. Vérifications
  SELECT uses_count INTO v_uses_after FROM public.caisse_invites WHERE token = v_token;
  SELECT EXISTS(
    SELECT 1 FROM public.caisse_collaborators
    WHERE caisse_id = v_caisse AND user_id = v_joiner
  ) INTO v_collab_exists;

  RAISE NOTICE '[VERIF] uses_after=% (attendu %), collab_exists=% (attendu true)',
    v_uses_after, v_uses_before + 1, v_collab_exists;

  IF v_uses_after <> v_uses_before + 1 THEN
    RAISE EXCEPTION 'uses_count non incrémenté';
  END IF;
  IF NOT v_collab_exists THEN
    RAISE EXCEPTION 'collaborateur non ajouté';
  END IF;

  -- 5. Re-tester idempotence (2e appel ne doit pas dupliquer le collaborator)
  v_join := public.join_caisse_via_token(v_token);
  RAISE NOTICE '[JOIN x2] % (idempotent attendu)', v_join;

  -- 6. Cleanup
  DELETE FROM public.caisse_collaborators WHERE caisse_id = v_caisse AND user_id = v_joiner;
  DELETE FROM public.caisse_invites WHERE token = v_token;
  RAISE NOTICE '[CLEANUP] OK';
END $$;