-- 1. Colonne role sur tontine_members (en plus de is_owner existant)
ALTER TABLE public.tontine_members
  ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'membre'
  CHECK (role IN ('owner', 'membre'));

-- Migrer is_owner existant vers role
UPDATE public.tontine_members SET role = 'owner' WHERE is_owner = true AND role = 'membre';

-- 2. La colonne status existe déjà sur tontines, on étend juste les valeurs autorisées via check
-- (pas de CHECK existant, on ajoute juste un index pour perfs)
CREATE INDEX IF NOT EXISTS idx_tontines_status ON public.tontines(status);

-- 3. Table notifications tontine
CREATE TABLE IF NOT EXISTS public.tontine_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tontine_id UUID NOT NULL REFERENCES public.tontines(id) ON DELETE CASCADE,
  membre_id UUID REFERENCES public.tontine_members(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  message TEXT NOT NULL,
  envoye_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  statut TEXT NOT NULL DEFAULT 'envoye',
  canal TEXT NOT NULL DEFAULT 'whatsapp'
);

CREATE INDEX IF NOT EXISTS idx_tontine_notif_tontine
  ON public.tontine_notifications(tontine_id, envoye_at DESC);

ALTER TABLE public.tontine_notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "notif_tontine_owner_all" ON public.tontine_notifications;
CREATE POLICY "notif_tontine_owner_all"
  ON public.tontine_notifications FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.tontines
    WHERE id = tontine_notifications.tontine_id
      AND user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.tontines
    WHERE id = tontine_notifications.tontine_id
      AND user_id = auth.uid()
  ));

-- 4. Helper SQL : vérifier owner d'une tontine
CREATE OR REPLACE FUNCTION public.is_tontine_owner(
  p_tontine_id UUID,
  p_user_id UUID
) RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.tontines
    WHERE id = p_tontine_id AND user_id = p_user_id
  );
$$;