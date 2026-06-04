ALTER TABLE public.tontine_payments
  ADD COLUMN IF NOT EXISTS expense_item_id uuid 
  REFERENCES public.tontine_expense_items(id) ON DELETE SET NULL;