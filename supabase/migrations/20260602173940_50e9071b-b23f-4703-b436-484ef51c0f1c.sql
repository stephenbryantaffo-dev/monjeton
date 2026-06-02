ALTER TABLE public.tontine_expenses
  DROP CONSTRAINT IF EXISTS tontine_expenses_tontine_id_fkey;
ALTER TABLE public.tontine_expenses
  ADD CONSTRAINT tontine_expenses_tontine_id_fkey
  FOREIGN KEY (tontine_id) REFERENCES public.tontines(id) ON DELETE CASCADE;