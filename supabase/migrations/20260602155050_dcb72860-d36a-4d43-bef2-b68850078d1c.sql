-- === TABLE caisses ===
DROP POLICY IF EXISTS "Users CRUD own caisses" ON public.caisses;

CREATE POLICY "Collaborators view caisse"
  ON public.caisses FOR SELECT TO authenticated
  USING (public.is_caisse_collaborator(id, 'viewer'));

CREATE POLICY "Users create own caisse"
  ON public.caisses FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Owner updates caisse"
  ON public.caisses FOR UPDATE TO authenticated
  USING (public.is_caisse_collaborator(id, 'owner'));

CREATE POLICY "Owner deletes caisse"
  ON public.caisses FOR DELETE TO authenticated
  USING (public.is_caisse_collaborator(id, 'owner'));

-- === TRIGGER : créateur devient owner ===
CREATE OR REPLACE FUNCTION public.add_caisse_owner()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.caisse_collaborators (caisse_id, user_id, role)
  VALUES (NEW.id, NEW.user_id, 'owner')
  ON CONFLICT (caisse_id, user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_add_caisse_owner ON public.caisses;
CREATE TRIGGER trg_add_caisse_owner
  AFTER INSERT ON public.caisses
  FOR EACH ROW EXECUTE FUNCTION public.add_caisse_owner();

-- === TABLE caisse_members ===
DROP POLICY IF EXISTS "Users CRUD own caisse_members" ON public.caisse_members;

CREATE POLICY "Collaborators view members"
  ON public.caisse_members FOR SELECT TO authenticated
  USING (public.is_caisse_collaborator(caisse_id, 'viewer'));

CREATE POLICY "Managers manage members"
  ON public.caisse_members FOR ALL TO authenticated
  USING (public.is_caisse_collaborator(caisse_id, 'manager'))
  WITH CHECK (public.is_caisse_collaborator(caisse_id, 'manager'));

-- === TABLE caisse_cotisations ===
DROP POLICY IF EXISTS "Users CRUD own caisse_cotisations" ON public.caisse_cotisations;

CREATE POLICY "Collaborators view cotisations"
  ON public.caisse_cotisations FOR SELECT TO authenticated
  USING (public.is_caisse_collaborator(caisse_id, 'viewer'));

CREATE POLICY "Managers manage cotisations"
  ON public.caisse_cotisations FOR ALL TO authenticated
  USING (public.is_caisse_collaborator(caisse_id, 'manager'))
  WITH CHECK (public.is_caisse_collaborator(caisse_id, 'manager'));

-- === TABLE caisse_depenses ===
DROP POLICY IF EXISTS "Users CRUD own caisse_depenses" ON public.caisse_depenses;

CREATE POLICY "Collaborators view depenses"
  ON public.caisse_depenses FOR SELECT TO authenticated
  USING (public.is_caisse_collaborator(caisse_id, 'viewer'));

CREATE POLICY "Managers manage depenses"
  ON public.caisse_depenses FOR ALL TO authenticated
  USING (public.is_caisse_collaborator(caisse_id, 'manager'))
  WITH CHECK (public.is_caisse_collaborator(caisse_id, 'manager'));