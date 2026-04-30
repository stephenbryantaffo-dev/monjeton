ALTER TABLE public.tontine_members
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active';

-- Validation trigger (immutable check constraints not used per project rules)
CREATE OR REPLACE FUNCTION public.validate_tontine_member_status()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.status NOT IN ('active','suspended','removed') THEN
    RAISE EXCEPTION 'Invalid tontine_member status: %', NEW.status;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validate_tontine_member_status_trg ON public.tontine_members;
CREATE TRIGGER validate_tontine_member_status_trg
BEFORE INSERT OR UPDATE ON public.tontine_members
FOR EACH ROW EXECUTE FUNCTION public.validate_tontine_member_status();