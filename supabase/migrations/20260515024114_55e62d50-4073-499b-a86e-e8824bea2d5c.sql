ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS currency_preference text NOT NULL DEFAULT 'XOF';
COMMENT ON COLUMN public.profiles.currency_preference IS 'Currency code: XOF (FCFA), EUR, USD';