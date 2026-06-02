
-- 1. Étendre tontines pour supporter le type "Caisse de projet"
ALTER TABLE public.tontines
ADD COLUMN IF NOT EXISTS caisse_type text NOT NULL DEFAULT 'recurring',
ADD COLUMN IF NOT EXISTS target_amount numeric,
ADD COLUMN IF NOT EXISTS contribution_per_member numeric,
ADD COLUMN IF NOT EXISTS event_date date,
ADD COLUMN IF NOT EXISTS is_closed boolean NOT NULL DEFAULT false;

-- contrainte légère sur le type
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'tontines_caisse_type_check') THEN
    ALTER TABLE public.tontines
      ADD CONSTRAINT tontines_caisse_type_check
      CHECK (caisse_type IN ('recurring','project'));
  END IF;
END $$;

-- 2. Table des dépenses pour les caisses de projet
CREATE TABLE IF NOT EXISTS public.tontine_expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tontine_id uuid NOT NULL,
  label text NOT NULL,
  amount numeric NOT NULL CHECK (amount > 0),
  category text,
  beneficiaire text,
  expense_date date NOT NULL DEFAULT CURRENT_DATE,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.tontine_expenses TO authenticated;
GRANT ALL ON public.tontine_expenses TO service_role;

ALTER TABLE public.tontine_expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users CRUD own tontine_expenses"
ON public.tontine_expenses
FOR ALL
TO authenticated
USING (EXISTS (SELECT 1 FROM public.tontines WHERE tontines.id = tontine_expenses.tontine_id AND tontines.user_id = auth.uid()))
WITH CHECK (EXISTS (SELECT 1 FROM public.tontines WHERE tontines.id = tontine_expenses.tontine_id AND tontines.user_id = auth.uid()));

CREATE POLICY "Admin can view all tontine_expenses"
ON public.tontine_expenses
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX IF NOT EXISTS idx_tontine_expenses_tontine ON public.tontine_expenses(tontine_id);
