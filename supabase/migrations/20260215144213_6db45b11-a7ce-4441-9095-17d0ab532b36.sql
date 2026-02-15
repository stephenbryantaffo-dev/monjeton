
-- ========================
-- BUDGETS
-- ========================
CREATE TABLE public.budgets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  month INTEGER NOT NULL,
  year INTEGER NOT NULL,
  total_budget NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, month, year)
);

ALTER TABLE public.budgets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users CRUD own budgets" ON public.budgets FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admin can view all budgets" ON public.budgets FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

-- ========================
-- CATEGORY BUDGETS
-- ========================
CREATE TABLE public.category_budgets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  month INTEGER NOT NULL,
  year INTEGER NOT NULL,
  budget_amount NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, category_id, month, year)
);

ALTER TABLE public.category_budgets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users CRUD own category_budgets" ON public.category_budgets FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admin can view all category_budgets" ON public.category_budgets FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

-- ========================
-- TONTINES
-- ========================
CREATE TABLE public.tontines (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  contribution_amount NUMERIC NOT NULL DEFAULT 0,
  frequency TEXT NOT NULL DEFAULT 'monthly',
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  members_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.tontines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users CRUD own tontines" ON public.tontines FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admin can view all tontines" ON public.tontines FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

-- ========================
-- TONTINE MEMBERS
-- ========================
CREATE TABLE public.tontine_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tontine_id UUID NOT NULL REFERENCES public.tontines(id) ON DELETE CASCADE,
  member_name TEXT NOT NULL,
  member_phone TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.tontine_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users CRUD own tontine_members" ON public.tontine_members FOR ALL
  USING (EXISTS (SELECT 1 FROM public.tontines WHERE id = tontine_id AND user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.tontines WHERE id = tontine_id AND user_id = auth.uid()));
CREATE POLICY "Admin can view all tontine_members" ON public.tontine_members FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

-- ========================
-- TONTINE PAYMENTS
-- ========================
CREATE TABLE public.tontine_payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tontine_id UUID NOT NULL REFERENCES public.tontines(id) ON DELETE CASCADE,
  member_name TEXT NOT NULL,
  amount NUMERIC NOT NULL DEFAULT 0,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.tontine_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users CRUD own tontine_payments" ON public.tontine_payments FOR ALL
  USING (EXISTS (SELECT 1 FROM public.tontines WHERE id = tontine_id AND user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.tontines WHERE id = tontine_id AND user_id = auth.uid()));
CREATE POLICY "Admin can view all tontine_payments" ON public.tontine_payments FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

-- ========================
-- RECEIPT SCANS
-- ========================
CREATE TABLE public.receipt_scans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  scan_type TEXT NOT NULL DEFAULT 'receipt',
  image_url TEXT,
  extracted_text TEXT,
  parsed_amount NUMERIC,
  parsed_date DATE,
  parsed_merchant TEXT,
  parsed_wallet TEXT,
  parsed_type TEXT,
  parsed_category TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.receipt_scans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users CRUD own receipt_scans" ON public.receipt_scans FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admin can view all receipt_scans" ON public.receipt_scans FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

-- ========================
-- STORAGE BUCKET for receipts
-- ========================
INSERT INTO storage.buckets (id, name, public) VALUES ('receipts', 'receipts', false);

CREATE POLICY "Users can upload own receipts" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'receipts' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view own receipts" ON storage.objects FOR SELECT
  USING (bucket_id = 'receipts' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete own receipts" ON storage.objects FOR DELETE
  USING (bucket_id = 'receipts' AND auth.uid()::text = (storage.foldername(name))[1]);
