CREATE TABLE public.prediction_snapshots (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  month integer NOT NULL,
  year integer NOT NULL,
  category text NOT NULL,
  predicted_amount numeric NOT NULL DEFAULT 0,
  actual_amount numeric,
  budget_amount numeric,
  accuracy_pct numeric,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, month, year, category)
);

ALTER TABLE public.prediction_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users CRUD own snapshots" ON public.prediction_snapshots FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admin can view all snapshots" ON public.prediction_snapshots FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));