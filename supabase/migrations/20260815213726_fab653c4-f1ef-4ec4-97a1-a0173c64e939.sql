-- Table volontairement SANS politique RLS : ni lecture ni écriture directe
-- via l'API, y compris par le propriétaire de la ligne. Le hachage ne doit
-- jamais pouvoir être extrait pour une attaque hors ligne. Tous les accès
-- passent par les fonctions SECURITY DEFINER définies plus bas.
CREATE TABLE IF NOT EXISTS public.user_pins (
  user_id         uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  pin_hash        text NOT NULL,
  failed_attempts integer NOT NULL DEFAULT 0,
  locked_until    timestamptz,
  updated_at      timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.user_pins ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.user_pins FROM anon, authenticated;
-- Indique si un PIN existe, sans jamais révéler le hachage.
CREATE OR REPLACE FUNCTION public.user_pin_status()
RETURNS TABLE (has_pin boolean, locked_seconds integer)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    EXISTS (SELECT 1 FROM public.user_pins WHERE user_id = auth.uid()),
    COALESCE((
      SELECT GREATEST(0, CEIL(EXTRACT(EPOCH FROM (locked_until - now()))))::int
      FROM public.user_pins WHERE user_id = auth.uid()
    ), 0);
$$;
-- Définit ou remplace le PIN, et remet le compteur d'échecs à zéro.
CREATE OR REPLACE FUNCTION public.set_user_pin(_pin_hash text)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'non authentifié';
  END IF;
  IF _pin_hash IS NULL OR length(_pin_hash) <> 64 THEN
    RAISE EXCEPTION 'hachage invalide';
  END IF;
  INSERT INTO public.user_pins (user_id, pin_hash, failed_attempts, locked_until, updated_at)
  VALUES (auth.uid(), _pin_hash, 0, NULL, now())
  ON CONFLICT (user_id) DO UPDATE
    SET pin_hash = EXCLUDED.pin_hash,
        failed_attempts = 0,
        locked_until = NULL,
        updated_at = now();
END;
$$;
-- Vérifie le PIN et applique le blocage côté serveur : 5 échecs = 30 s,
-- 10 échecs = 15 min. Ce blocage ne peut être contourné ni par un
-- rechargement, ni par un vidage du stockage, ni par une réinstallation.
CREATE OR REPLACE FUNCTION public.verify_user_pin(_pin_hash text)
RETURNS TABLE (success boolean, attempts integer, locked_seconds integer)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  rec  public.user_pins%ROWTYPE;
  wait integer := 0;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'non authentifié';
  END IF;
  SELECT * INTO rec FROM public.user_pins WHERE user_id = auth.uid();
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 0, 0;
    RETURN;
  END IF;
  IF rec.locked_until IS NOT NULL AND rec.locked_until > now() THEN
    wait := CEIL(EXTRACT(EPOCH FROM (rec.locked_until - now())))::int;
    RETURN QUERY SELECT false, rec.failed_attempts, wait;
    RETURN;
  END IF;
  IF rec.pin_hash = _pin_hash THEN
    UPDATE public.user_pins
      SET failed_attempts = 0, locked_until = NULL
      WHERE user_id = auth.uid();
    RETURN QUERY SELECT true, 0, 0;
    RETURN;
  END IF;
  UPDATE public.user_pins
    SET failed_attempts = rec.failed_attempts + 1,
        locked_until = CASE
          WHEN rec.failed_attempts + 1 >= 10 THEN now() + interval '15 minutes'
          WHEN rec.failed_attempts + 1 >= 5  THEN now() + interval '30 seconds'
          ELSE NULL
        END
    WHERE user_id = auth.uid()
    RETURNING failed_attempts,
              COALESCE(CEIL(EXTRACT(EPOCH FROM (locked_until - now())))::int, 0)
    INTO rec.failed_attempts, wait;
  RETURN QUERY SELECT false, rec.failed_attempts, wait;
END;
$$;
CREATE OR REPLACE FUNCTION public.clear_user_pin()
RETURNS void
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  DELETE FROM public.user_pins WHERE user_id = auth.uid();
$$;
REVOKE EXECUTE ON FUNCTION
  public.user_pin_status(), public.set_user_pin(text),
  public.verify_user_pin(text), public.clear_user_pin()
FROM anon;
GRANT EXECUTE ON FUNCTION
  public.user_pin_status(), public.set_user_pin(text),
  public.verify_user_pin(text), public.clear_user_pin()
TO authenticated;
