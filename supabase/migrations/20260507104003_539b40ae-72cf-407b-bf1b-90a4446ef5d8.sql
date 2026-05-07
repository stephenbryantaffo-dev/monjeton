
-- ============================================
-- TABLE 1: debt_persons (NEW)
-- ============================================
CREATE TABLE IF NOT EXISTS public.debt_persons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  phone TEXT,
  whatsapp TEXT,
  contact_id TEXT,
  photo_uri TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, name, phone)
);

CREATE INDEX IF NOT EXISTS idx_debt_persons_user ON public.debt_persons(user_id);

ALTER TABLE public.debt_persons ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "debt_persons_own" ON public.debt_persons;
CREATE POLICY "debt_persons_own" ON public.debt_persons
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP TRIGGER IF EXISTS trg_debt_persons_updated ON public.debt_persons;
CREATE TRIGGER trg_debt_persons_updated
  BEFORE UPDATE ON public.debt_persons
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- TABLE 2: extend debts
-- ============================================
ALTER TABLE public.debts
  ADD COLUMN IF NOT EXISTS person_id UUID REFERENCES public.debt_persons(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS payment_type TEXT DEFAULT 'lump_sum',
  ADD COLUMN IF NOT EXISTS monthly_amount NUMERIC(12,0),
  ADD COLUMN IF NOT EXISTS monthly_day INTEGER,
  ADD COLUMN IF NOT EXISTS installments_total INTEGER,
  ADD COLUMN IF NOT EXISTS installments_paid INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS amount_remaining NUMERIC(12,0),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

-- Constraints (drop if exist then add)
ALTER TABLE public.debts DROP CONSTRAINT IF EXISTS debts_payment_type_check;
ALTER TABLE public.debts ADD CONSTRAINT debts_payment_type_check
  CHECK (payment_type IN ('lump_sum','monthly','custom'));

ALTER TABLE public.debts DROP CONSTRAINT IF EXISTS debts_monthly_day_check;
ALTER TABLE public.debts ADD CONSTRAINT debts_monthly_day_check
  CHECK (monthly_day IS NULL OR (monthly_day BETWEEN 1 AND 31));

ALTER TABLE public.debts DROP CONSTRAINT IF EXISTS debts_status_check;
ALTER TABLE public.debts ADD CONSTRAINT debts_status_check
  CHECK (status IN ('pending','partial','paid','cancelled'));

-- Initialize amount_remaining for existing rows (uses existing paid_amount column)
UPDATE public.debts
  SET amount_remaining = GREATEST(amount - COALESCE(paid_amount, 0), 0)
  WHERE amount_remaining IS NULL;

CREATE INDEX IF NOT EXISTS idx_debts_person ON public.debts(person_id);

DROP TRIGGER IF EXISTS trg_debts_updated ON public.debts;
CREATE TRIGGER trg_debts_updated
  BEFORE UPDATE ON public.debts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- TABLE 3: extend debt_installments
-- (existing cols: expected_amount, paid_amount, order_index, status, due_date, note)
-- ============================================
ALTER TABLE public.debt_installments
  ADD COLUMN IF NOT EXISTS installment_number INTEGER,
  ADD COLUMN IF NOT EXISTS paid_date DATE,
  ADD COLUMN IF NOT EXISTS reminder_sent BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS reminder_sent_at TIMESTAMPTZ;

-- Backfill installment_number from order_index for existing rows
UPDATE public.debt_installments
  SET installment_number = order_index + 1
  WHERE installment_number IS NULL;

-- Allow 'overdue' status (current allows pending/partial/paid/overdue per debtHistory.ts usage)
ALTER TABLE public.debt_installments DROP CONSTRAINT IF EXISTS debt_installments_status_check;
ALTER TABLE public.debt_installments ADD CONSTRAINT debt_installments_status_check
  CHECK (status IN ('pending','partial','paid','overdue'));

CREATE INDEX IF NOT EXISTS idx_installments_debt
  ON public.debt_installments(debt_id);
CREATE INDEX IF NOT EXISTS idx_installments_due_date
  ON public.debt_installments(user_id, due_date)
  WHERE status IN ('pending','partial');

-- ============================================
-- TABLE 4: extend debt_payments
-- (existing cols: debt_id, user_id, amount, note, transaction_id, payment_date)
-- ============================================
ALTER TABLE public.debt_payments
  ADD COLUMN IF NOT EXISTS installment_id UUID REFERENCES public.debt_installments(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS payment_method TEXT,
  ADD COLUMN IF NOT EXISTS proof_url TEXT;

CREATE INDEX IF NOT EXISTS idx_payments_debt
  ON public.debt_payments(debt_id, payment_date DESC);

-- ============================================
-- TABLE 5: extend debt_history
-- (existing cols: debt_id, user_id, action, field, old_value, new_value, note)
-- ============================================
ALTER TABLE public.debt_history
  ADD COLUMN IF NOT EXISTS amount NUMERIC(12,0);

CREATE INDEX IF NOT EXISTS idx_history_debt
  ON public.debt_history(debt_id, created_at DESC);

-- ============================================
-- Trigger: recalc debt remaining/paid/status after each payment
-- (uses existing paid_amount column on debts)
-- ============================================
CREATE OR REPLACE FUNCTION public.recalculate_debt_remaining()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_debt_id UUID;
  v_total_paid NUMERIC;
  v_amount NUMERIC;
BEGIN
  v_debt_id := COALESCE(NEW.debt_id, OLD.debt_id);

  SELECT COALESCE(SUM(amount), 0) INTO v_total_paid
    FROM public.debt_payments WHERE debt_id = v_debt_id;

  SELECT amount INTO v_amount FROM public.debts WHERE id = v_debt_id;

  UPDATE public.debts SET
    paid_amount = v_total_paid,
    amount_remaining = GREATEST(v_amount - v_total_paid, 0),
    status = CASE
      WHEN v_total_paid >= v_amount THEN 'paid'
      WHEN v_total_paid > 0 THEN 'partial'
      ELSE 'pending'
    END,
    updated_at = now()
  WHERE id = v_debt_id;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_recalc_debt_after_payment ON public.debt_payments;
CREATE TRIGGER trg_recalc_debt_after_payment
  AFTER INSERT OR DELETE ON public.debt_payments
  FOR EACH ROW EXECUTE FUNCTION public.recalculate_debt_remaining();

-- ============================================
-- Utility: mark overdue installments
-- ============================================
CREATE OR REPLACE FUNCTION public.mark_overdue_installments()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.debt_installments
    SET status = 'overdue', updated_at = now()
    WHERE status IN ('pending','partial')
      AND due_date < CURRENT_DATE;
END;
$$;
