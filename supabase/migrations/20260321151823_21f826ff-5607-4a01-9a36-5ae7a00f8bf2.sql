
CREATE TABLE public.financial_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  score integer NOT NULL DEFAULT 50,
  insights jsonb NOT NULL DEFAULT '[]'::jsonb,
  tip_of_week text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.financial_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own scores" ON public.financial_scores
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own scores" ON public.financial_scores
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own scores" ON public.financial_scores
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Admin can view all scores" ON public.financial_scores
  FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));
