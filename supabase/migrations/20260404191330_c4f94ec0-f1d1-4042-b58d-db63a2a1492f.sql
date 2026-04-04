
-- Drop existing tontine tables (order matters due to FKs)
DROP TABLE IF EXISTS public.tontine_payments;
DROP TABLE IF EXISTS public.tontine_members;
DROP TABLE IF EXISTS public.tontines;

-- 1. tontines
CREATE TABLE public.tontines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  frequency text NOT NULL DEFAULT 'monthly',
  custom_frequency_days int,
  contribution_amount numeric NOT NULL DEFAULT 0,
  start_date date NOT NULL DEFAULT CURRENT_DATE,
  end_date date,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT tontines_frequency_check CHECK (frequency IN ('weekly','monthly','quarterly','annual','custom')),
  CONSTRAINT tontines_status_check CHECK (status IN ('active','paused','completed'))
);

ALTER TABLE public.tontines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users CRUD own tontines" ON public.tontines
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admin can view all tontines" ON public.tontines
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- 2. tontine_members
CREATE TABLE public.tontine_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tontine_id uuid NOT NULL REFERENCES public.tontines(id) ON DELETE CASCADE,
  name text NOT NULL,
  phone text,
  is_owner boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.tontine_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users CRUD own tontine_members" ON public.tontine_members
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.tontines WHERE id = tontine_members.tontine_id AND user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.tontines WHERE id = tontine_members.tontine_id AND user_id = auth.uid()));

CREATE POLICY "Admin can view all tontine_members" ON public.tontine_members
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- 3. tontine_cycles
CREATE TABLE public.tontine_cycles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tontine_id uuid NOT NULL REFERENCES public.tontines(id) ON DELETE CASCADE,
  cycle_number int NOT NULL,
  period_label text NOT NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  total_expected numeric NOT NULL DEFAULT 0,
  total_collected numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'open',
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT tontine_cycles_status_check CHECK (status IN ('open','closed'))
);

ALTER TABLE public.tontine_cycles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users CRUD own tontine_cycles" ON public.tontine_cycles
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.tontines WHERE id = tontine_cycles.tontine_id AND user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.tontines WHERE id = tontine_cycles.tontine_id AND user_id = auth.uid()));

CREATE POLICY "Admin can view all tontine_cycles" ON public.tontine_cycles
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- 4. tontine_payments
CREATE TABLE public.tontine_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cycle_id uuid NOT NULL REFERENCES public.tontine_cycles(id) ON DELETE CASCADE,
  member_id uuid NOT NULL REFERENCES public.tontine_members(id) ON DELETE CASCADE,
  amount_paid numeric NOT NULL DEFAULT 0,
  payment_date date NOT NULL DEFAULT CURRENT_DATE,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.tontine_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users CRUD own tontine_payments" ON public.tontine_payments
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.tontine_cycles c
    JOIN public.tontines t ON t.id = c.tontine_id
    WHERE c.id = tontine_payments.cycle_id AND t.user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.tontine_cycles c
    JOIN public.tontines t ON t.id = c.tontine_id
    WHERE c.id = tontine_payments.cycle_id AND t.user_id = auth.uid()
  ));

CREATE POLICY "Admin can view all tontine_payments" ON public.tontine_payments
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
