ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS scope text NOT NULL DEFAULT 'perso'
  CHECK (scope IN ('perso', 'business'));

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS merchant_mode boolean NOT NULL DEFAULT false;