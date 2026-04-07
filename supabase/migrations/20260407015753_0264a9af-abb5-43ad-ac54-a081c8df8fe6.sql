
-- Table caisses
CREATE TABLE public.caisses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  contribution_amount NUMERIC NOT NULL DEFAULT 0,
  frequency TEXT NOT NULL DEFAULT 'monthly',
  total_collected NUMERIC NOT NULL DEFAULT 0,
  total_spent NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.caisses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users CRUD own caisses" ON public.caisses FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admin can view all caisses" ON public.caisses FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Table caisse_members
CREATE TABLE public.caisse_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  caisse_id UUID NOT NULL REFERENCES public.caisses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.caisse_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users CRUD own caisse_members" ON public.caisse_members FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.caisses WHERE caisses.id = caisse_members.caisse_id AND caisses.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.caisses WHERE caisses.id = caisse_members.caisse_id AND caisses.user_id = auth.uid()));
CREATE POLICY "Admin can view all caisse_members" ON public.caisse_members FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Table caisse_cotisations
CREATE TABLE public.caisse_cotisations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  caisse_id UUID NOT NULL REFERENCES public.caisses(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES public.caisse_members(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL,
  cotisation_date DATE NOT NULL DEFAULT CURRENT_DATE,
  cycle_label TEXT,
  note TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.caisse_cotisations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users CRUD own caisse_cotisations" ON public.caisse_cotisations FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.caisses WHERE caisses.id = caisse_cotisations.caisse_id AND caisses.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.caisses WHERE caisses.id = caisse_cotisations.caisse_id AND caisses.user_id = auth.uid()));
CREATE POLICY "Admin can view all caisse_cotisations" ON public.caisse_cotisations FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Table caisse_depenses
CREATE TABLE public.caisse_depenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  caisse_id UUID NOT NULL REFERENCES public.caisses(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  category TEXT,
  depense_date DATE NOT NULL DEFAULT CURRENT_DATE,
  beneficiaire TEXT,
  note TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.caisse_depenses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users CRUD own caisse_depenses" ON public.caisse_depenses FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.caisses WHERE caisses.id = caisse_depenses.caisse_id AND caisses.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.caisses WHERE caisses.id = caisse_depenses.caisse_id AND caisses.user_id = auth.uid()));
CREATE POLICY "Admin can view all caisse_depenses" ON public.caisse_depenses FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));
