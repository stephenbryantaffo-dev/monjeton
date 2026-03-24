
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS profile_type text,
  ADD COLUMN IF NOT EXISTS gender text,
  ADD COLUMN IF NOT EXISTS living_situation text,
  ADD COLUMN IF NOT EXISTS income_range text,
  ADD COLUMN IF NOT EXISTS main_expense text,
  ADD COLUMN IF NOT EXISTS financial_goal text,
  ADD COLUMN IF NOT EXISTS has_employees boolean,
  ADD COLUMN IF NOT EXISTS dependents_count integer,
  ADD COLUMN IF NOT EXISTS subscriptions text[],
  ADD COLUMN IF NOT EXISTS beauty_budget_range text,
  ADD COLUMN IF NOT EXISTS onboarding_completed boolean NOT NULL DEFAULT false;
