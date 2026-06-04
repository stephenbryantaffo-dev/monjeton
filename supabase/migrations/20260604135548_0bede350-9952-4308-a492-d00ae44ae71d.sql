CREATE TABLE IF NOT EXISTS public.tontine_expense_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tontine_id uuid NOT NULL REFERENCES public.tontines(id) ON DELETE CASCADE,
  label text NOT NULL,
  planned_amount numeric NOT NULL DEFAULT 0,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.tontine_expense_items TO authenticated;
GRANT ALL ON public.tontine_expense_items TO service_role;

ALTER TABLE public.tontine_expense_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Collaborators view expense items"
  ON public.tontine_expense_items FOR SELECT TO authenticated
  USING (public.is_caisse_collaborator(tontine_id, 'viewer'));

CREATE POLICY "Managers manage expense items"
  ON public.tontine_expense_items FOR ALL TO authenticated
  USING (public.is_caisse_collaborator(tontine_id, 'manager'))
  WITH CHECK (public.is_caisse_collaborator(tontine_id, 'manager'));

ALTER TABLE public.tontine_expenses
  ADD COLUMN IF NOT EXISTS expense_item_id uuid 
  REFERENCES public.tontine_expense_items(id) ON DELETE SET NULL;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.tontine_expense_items;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;