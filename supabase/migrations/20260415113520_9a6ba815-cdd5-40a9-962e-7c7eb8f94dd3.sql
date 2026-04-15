
-- Status column on caisse_members
ALTER TABLE public.caisse_members
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active';

-- Status/cancel columns on caisse_cotisations
ALTER TABLE public.caisse_cotisations
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'confirmed';

ALTER TABLE public.caisse_cotisations
  ADD COLUMN IF NOT EXISTS cancel_reason TEXT DEFAULT NULL;

ALTER TABLE public.caisse_cotisations
  ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ DEFAULT NULL;

-- Member history table
CREATE TABLE IF NOT EXISTS public.caisse_member_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  caisse_id UUID NOT NULL REFERENCES public.caisses(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES public.caisse_members(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  reason TEXT,
  performed_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.caisse_member_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "history_caisse_owner_all"
ON public.caisse_member_history FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.caisses
    WHERE caisses.id = caisse_member_history.caisse_id
    AND caisses.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.caisses
    WHERE caisses.id = caisse_member_history.caisse_id
    AND caisses.user_id = auth.uid()
  )
);

CREATE POLICY "history_admin_view"
ON public.caisse_member_history FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
);
