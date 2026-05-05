-- Table principale du coaching budgétaire
CREATE TABLE IF NOT EXISTS public.budget_coaching (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  month INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
  year INTEGER NOT NULL CHECK (year >= 2024),
  revenu_principal NUMERIC(12,0) DEFAULT 0 CHECK (revenu_principal >= 0),
  revenu_type TEXT DEFAULT 'fixe' CHECK (revenu_type IN ('fixe','variable','multiple')),
  charges_fixes JSONB DEFAULT '[]'::jsonb,
  dettes_mois NUMERIC(12,0) DEFAULT 0 CHECK (dettes_mois >= 0),
  dettes_details JSONB DEFAULT '[]'::jsonb,
  revenu_exceptionnel NUMERIC(12,0) DEFAULT 0 CHECK (revenu_exceptionnel >= 0),
  revenu_exceptionnel_source TEXT,
  objectifs JSONB DEFAULT '[]'::jsonb,
  situation_familiale TEXT DEFAULT 'seul' CHECK (situation_familiale IN ('seul','couple','famille','foyer_elargi')),
  nb_personnes INTEGER DEFAULT 1 CHECK (nb_personnes BETWEEN 1 AND 50),
  habitude_depense TEXT DEFAULT 'mixte' CHECK (habitude_depense IN ('gros_achats','petits_achats','mixte')),
  mois_special TEXT DEFAULT 'normal' CHECK (mois_special IN ('normal','rentree','fetes','vacances','autre')),
  mois_special_note TEXT,
  plan_genere JSONB DEFAULT NULL,
  conseils_par_categorie JSONB DEFAULT '{}'::jsonb,
  statut TEXT DEFAULT 'en_cours' CHECK (statut IN ('en_cours','complete','approuve')),
  current_step INTEGER DEFAULT 0 CHECK (current_step BETWEEN 0 AND 9),
  whatsapp_notifications BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, month, year)
);

CREATE INDEX IF NOT EXISTS idx_budget_coaching_user_month
  ON public.budget_coaching(user_id, month, year);

ALTER TABLE public.budget_coaching ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "budget_coaching_own" ON public.budget_coaching;
CREATE POLICY "budget_coaching_own" ON public.budget_coaching
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.update_budget_coaching_timestamp()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_budget_coaching_update ON public.budget_coaching;
CREATE TRIGGER trg_budget_coaching_update
  BEFORE UPDATE ON public.budget_coaching
  FOR EACH ROW EXECUTE FUNCTION public.update_budget_coaching_timestamp();

-- Table anti-spam alertes WhatsApp
CREATE TABLE IF NOT EXISTS public.budget_alerts_sent (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category_id UUID,
  month INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
  year INTEGER NOT NULL,
  alert_type TEXT NOT NULL CHECK (alert_type IN ('50pct','80pct','100pct','projection')),
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, category_id, month, year, alert_type)
);

CREATE INDEX IF NOT EXISTS idx_alerts_sent_user_month
  ON public.budget_alerts_sent(user_id, month, year);

ALTER TABLE public.budget_alerts_sent ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "alerts_sent_own" ON public.budget_alerts_sent;
CREATE POLICY "alerts_sent_own" ON public.budget_alerts_sent
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);