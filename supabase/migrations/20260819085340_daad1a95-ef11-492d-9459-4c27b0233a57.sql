-- Recettes extérieures d'une caisse de projet : billets vendus, apports de
-- sponsors, dons, ventes annexes. Distinct des cotisations, qui viennent des
-- membres eux-mêmes. C'est ce qui permet de calculer un résultat d'événement.

CREATE TABLE IF NOT EXISTS public.caisse_recettes (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  caisse_id     UUID NOT NULL REFERENCES public.caisses(id) ON DELETE CASCADE,
  label         TEXT NOT NULL,
  source        TEXT NOT NULL DEFAULT 'autre',
  quantite      INTEGER,
  prix_unitaire NUMERIC,
  amount        NUMERIC NOT NULL,
  recette_date  DATE NOT NULL DEFAULT CURRENT_DATE,
  contact       TEXT,
  note          TEXT,
  created_at    TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT caisse_recettes_source_check
    CHECK (source IN ('billetterie','sponsor','don','vente','autre')),
  CONSTRAINT caisse_recettes_amount_check CHECK (amount >= 0)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.caisse_recettes TO authenticated;
GRANT ALL ON public.caisse_recettes TO service_role;

CREATE INDEX IF NOT EXISTS idx_caisse_recettes_caisse
  ON public.caisse_recettes(caisse_id);

ALTER TABLE public.caisse_recettes ENABLE ROW LEVEL SECURITY;

-- Mêmes règles d'accès que caisse_depenses : le propriétaire de la caisse.
CREATE POLICY "Users CRUD own caisse_recettes" ON public.caisse_recettes FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.caisses WHERE caisses.id = caisse_recettes.caisse_id AND caisses.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.caisses WHERE caisses.id = caisse_recettes.caisse_id AND caisses.user_id = auth.uid()));

CREATE POLICY "Admin can view all caisse_recettes" ON public.caisse_recettes FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Total des recettes extérieures, maintenu comme total_collected et total_spent.
ALTER TABLE public.caisses
  ADD COLUMN IF NOT EXISTS total_recettes NUMERIC NOT NULL DEFAULT 0;
