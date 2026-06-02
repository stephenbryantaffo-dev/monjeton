-- 1. Create caisse_collaborators table
CREATE TABLE IF NOT EXISTS public.caisse_collaborators (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  caisse_id uuid NOT NULL REFERENCES public.caisses(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'viewer',
  joined_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(caisse_id, user_id)
);

-- 2. Grants for Data API
GRANT SELECT, INSERT, UPDATE, DELETE ON public.caisse_collaborators TO authenticated;
GRANT ALL ON public.caisse_collaborators TO service_role;

-- 3. Enable RLS
ALTER TABLE public.caisse_collaborators ENABLE ROW LEVEL SECURITY;

-- 4. Security definer function for role check
CREATE OR REPLACE FUNCTION public.is_caisse_collaborator(
  _caisse_id uuid, _min_role text DEFAULT 'viewer'
)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.caisse_collaborators c
    WHERE c.caisse_id = _caisse_id
      AND c.user_id = auth.uid()
      AND (
        _min_role = 'viewer'
        OR (_min_role = 'manager' AND c.role IN ('manager','owner'))
        OR (_min_role = 'owner' AND c.role = 'owner')
      )
  );
$$;

-- 5. RLS policies
CREATE POLICY "View collaborators of own caisses"
  ON public.caisse_collaborators FOR SELECT TO authenticated
  USING (public.is_caisse_collaborator(caisse_id, 'viewer'));

CREATE POLICY "Owner manages collaborators"
  ON public.caisse_collaborators FOR ALL TO authenticated
  USING (public.is_caisse_collaborator(caisse_id, 'owner'))
  WITH CHECK (public.is_caisse_collaborator(caisse_id, 'owner'));

-- 6. Index
CREATE INDEX IF NOT EXISTS idx_caisse_collaborators_user ON public.caisse_collaborators(user_id);
CREATE INDEX IF NOT EXISTS idx_caisse_collaborators_caisse ON public.caisse_collaborators(caisse_id);

-- 7. Seed: each existing caisse creator becomes owner
INSERT INTO public.caisse_collaborators (caisse_id, user_id, role)
SELECT id, user_id, 'owner' FROM public.caisses
ON CONFLICT (caisse_id, user_id) DO NOTHING;