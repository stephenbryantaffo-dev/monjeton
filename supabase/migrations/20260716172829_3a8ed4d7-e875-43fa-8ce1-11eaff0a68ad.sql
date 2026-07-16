ALTER TABLE public.tontine_members ADD COLUMN IF NOT EXISTS user_id uuid;

CREATE UNIQUE INDEX IF NOT EXISTS tontine_members_tontine_user_unique
  ON public.tontine_members (tontine_id, user_id)
  WHERE user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS tontine_members_user_id_idx
  ON public.tontine_members (user_id);