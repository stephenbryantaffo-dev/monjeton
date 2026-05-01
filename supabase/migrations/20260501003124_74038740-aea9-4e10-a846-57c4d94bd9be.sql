-- 1. tontine_member_history
CREATE TABLE IF NOT EXISTS public.tontine_member_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tontine_id UUID REFERENCES public.tontines(id) ON DELETE CASCADE,
  member_id UUID REFERENCES public.tontine_members(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  performed_by UUID REFERENCES auth.users(id),
  note TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.tontine_member_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tmh_owner_only" ON public.tontine_member_history;
CREATE POLICY "tmh_owner_only"
  ON public.tontine_member_history FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.tontines
      WHERE id = tontine_member_history.tontine_id
      AND user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.tontines
      WHERE id = tontine_member_history.tontine_id
      AND user_id = auth.uid()
    )
  );

-- 2. receipt_duplicates
CREATE TABLE IF NOT EXISTS public.receipt_duplicates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  scan_id_1 UUID REFERENCES public.receipt_scans(id) ON DELETE CASCADE,
  scan_id_2 UUID REFERENCES public.receipt_scans(id) ON DELETE CASCADE,
  similarity_score NUMERIC DEFAULT 1.0,
  dismissed BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.receipt_duplicates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "dup_own" ON public.receipt_duplicates;
CREATE POLICY "dup_own"
  ON public.receipt_duplicates FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 3. Tighten tontine_members RLS (owner-only update/delete)
DROP POLICY IF EXISTS "tontine_membres_update" ON public.tontine_members;
DROP POLICY IF EXISTS "tontine_members_owner_update" ON public.tontine_members;
CREATE POLICY "tontine_members_owner_update"
  ON public.tontine_members FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.tontines
      WHERE id = tontine_members.tontine_id
      AND user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "tontine_membres_delete" ON public.tontine_members;
DROP POLICY IF EXISTS "tontine_members_owner_delete" ON public.tontine_members;
CREATE POLICY "tontine_members_owner_delete"
  ON public.tontine_members FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.tontines
      WHERE id = tontine_members.tontine_id
      AND user_id = auth.uid()
    )
  );

-- 4. Recalculate total_expected
CREATE OR REPLACE FUNCTION public.recalculate_cycle_expected(
  p_cycle_id UUID,
  p_contribution NUMERIC
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  active_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO active_count
  FROM public.tontine_members tm
  JOIN public.tontine_cycles tc ON tc.id = p_cycle_id
  WHERE tm.tontine_id = tc.tontine_id
    AND tm.status = 'active';

  UPDATE public.tontine_cycles
  SET total_expected = active_count * p_contribution
  WHERE id = p_cycle_id;
END;
$$;

-- 5. Recalculate total_collected
CREATE OR REPLACE FUNCTION public.recalculate_cycle_collected(
  p_cycle_id UUID
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.tontine_cycles
  SET total_collected = (
    SELECT COALESCE(SUM(amount_paid), 0)
    FROM public.tontine_payments
    WHERE cycle_id = p_cycle_id
  )
  WHERE id = p_cycle_id;
END;
$$;