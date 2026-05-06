CREATE TABLE IF NOT EXISTS public.budget_plan_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  coaching_id UUID NOT NULL REFERENCES public.budget_coaching(id) ON DELETE CASCADE,
  month INTEGER NOT NULL,
  year INTEGER NOT NULL,
  action TEXT NOT NULL,
  category_name TEXT,
  amount_before NUMERIC(12,0),
  amount_after NUMERIC(12,0),
  difference NUMERIC(12,0),
  ai_suggestion JSONB,
  applied BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_plan_history_coaching ON public.budget_plan_history(coaching_id);
CREATE INDEX IF NOT EXISTS idx_plan_history_user_date ON public.budget_plan_history(user_id, created_at DESC);

ALTER TABLE public.budget_plan_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "plan_history_own" ON public.budget_plan_history;
CREATE POLICY "plan_history_own" ON public.budget_plan_history FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

ALTER TABLE public.budget_coaching
  ADD COLUMN IF NOT EXISTS validated_categories JSONB DEFAULT '[]'::jsonb;

ALTER TABLE public.budget_coaching
  ADD COLUMN IF NOT EXISTS modified_categories JSONB DEFAULT '{}'::jsonb;