
-- ─── debt_history ───
CREATE TABLE public.debt_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  debt_id UUID NOT NULL,
  user_id UUID NOT NULL,
  action TEXT NOT NULL, -- edit | loan_increased | status_change | plan_change | installment_paid
  field TEXT,
  old_value TEXT,
  new_value TEXT,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_debt_history_debt ON public.debt_history(debt_id);
CREATE INDEX idx_debt_history_user ON public.debt_history(user_id);

ALTER TABLE public.debt_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "debt_history_select_own" ON public.debt_history
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "debt_history_insert_own" ON public.debt_history
  AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "debt_history_delete_own" ON public.debt_history
  FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "debt_history_admin_view" ON public.debt_history
  FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

-- ─── debt_installments ───
CREATE TABLE public.debt_installments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  debt_id UUID NOT NULL,
  user_id UUID NOT NULL,
  due_date DATE NOT NULL,
  expected_amount NUMERIC NOT NULL DEFAULT 0,
  paid_amount NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending', -- pending | partial | paid | overdue
  order_index INT NOT NULL DEFAULT 0,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_debt_installments_debt ON public.debt_installments(debt_id, order_index);
CREATE INDEX idx_debt_installments_user ON public.debt_installments(user_id);

ALTER TABLE public.debt_installments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "debt_installments_all_own" ON public.debt_installments
  AS PERMISSIVE FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "debt_installments_admin_view" ON public.debt_installments
  FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_debt_installments_updated_at
  BEFORE UPDATE ON public.debt_installments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
