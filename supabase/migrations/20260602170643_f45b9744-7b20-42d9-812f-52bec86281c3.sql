
-- 0. Purge orphan rows that reference legacy caisses(id) not present in tontines
DELETE FROM public.caisse_invites WHERE caisse_id NOT IN (SELECT id FROM public.tontines);
DELETE FROM public.caisse_collaborators WHERE caisse_id NOT IN (SELECT id FROM public.tontines);

-- 1. Fix foreign keys to point to tontines
ALTER TABLE public.caisse_collaborators
  DROP CONSTRAINT IF EXISTS caisse_collaborators_caisse_id_fkey;
ALTER TABLE public.caisse_collaborators
  ADD CONSTRAINT caisse_collaborators_caisse_id_fkey
  FOREIGN KEY (caisse_id) REFERENCES public.tontines(id) ON DELETE CASCADE;

ALTER TABLE public.caisse_invites
  DROP CONSTRAINT IF EXISTS caisse_invites_caisse_id_fkey;
ALTER TABLE public.caisse_invites
  ADD CONSTRAINT caisse_invites_caisse_id_fkey
  FOREIGN KEY (caisse_id) REFERENCES public.tontines(id) ON DELETE CASCADE;

-- 2. Re-seed owners from existing tontines
INSERT INTO public.caisse_collaborators (caisse_id, user_id, role)
SELECT id, user_id, 'owner' FROM public.tontines
ON CONFLICT (caisse_id, user_id) DO NOTHING;

-- 3. Move trigger from caisses to tontines
DROP TRIGGER IF EXISTS trg_add_caisse_owner ON public.caisses;
DROP TRIGGER IF EXISTS trg_add_caisse_owner_tontines ON public.tontines;
CREATE TRIGGER trg_add_caisse_owner_tontines
  AFTER INSERT ON public.tontines
  FOR EACH ROW EXECUTE FUNCTION public.add_caisse_owner();

-- 4. RLS tontines
DROP POLICY IF EXISTS "Users CRUD own tontines" ON public.tontines;
CREATE POLICY "Owner inserts tontine"
  ON public.tontines FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Collaborators view tontine"
  ON public.tontines FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.is_caisse_collaborator(id, 'viewer'));
CREATE POLICY "Managers update tontine"
  ON public.tontines FOR UPDATE TO authenticated
  USING (auth.uid() = user_id OR public.is_caisse_collaborator(id, 'manager'))
  WITH CHECK (auth.uid() = user_id OR public.is_caisse_collaborator(id, 'manager'));
CREATE POLICY "Owner deletes tontine"
  ON public.tontines FOR DELETE TO authenticated
  USING (auth.uid() = user_id OR public.is_caisse_collaborator(id, 'owner'));

-- 5. tontine_members
DROP POLICY IF EXISTS "Users CRUD own tontine_members" ON public.tontine_members;
DROP POLICY IF EXISTS "tontine_members_owner_update" ON public.tontine_members;
DROP POLICY IF EXISTS "tontine_members_owner_delete" ON public.tontine_members;
CREATE POLICY "Collaborators view tontine_members"
  ON public.tontine_members FOR SELECT TO authenticated
  USING (public.is_caisse_collaborator(tontine_id, 'viewer'));
CREATE POLICY "Managers insert tontine_members"
  ON public.tontine_members FOR INSERT TO authenticated
  WITH CHECK (public.is_caisse_collaborator(tontine_id, 'manager'));
CREATE POLICY "Managers update tontine_members"
  ON public.tontine_members FOR UPDATE TO authenticated
  USING (public.is_caisse_collaborator(tontine_id, 'manager'))
  WITH CHECK (public.is_caisse_collaborator(tontine_id, 'manager'));
CREATE POLICY "Managers delete tontine_members"
  ON public.tontine_members FOR DELETE TO authenticated
  USING (public.is_caisse_collaborator(tontine_id, 'manager'));

-- 6. tontine_expenses
DROP POLICY IF EXISTS "Users CRUD own tontine_expenses" ON public.tontine_expenses;
CREATE POLICY "Collaborators view tontine_expenses"
  ON public.tontine_expenses FOR SELECT TO authenticated
  USING (public.is_caisse_collaborator(tontine_id, 'viewer'));
CREATE POLICY "Managers manage tontine_expenses"
  ON public.tontine_expenses FOR ALL TO authenticated
  USING (public.is_caisse_collaborator(tontine_id, 'manager'))
  WITH CHECK (public.is_caisse_collaborator(tontine_id, 'manager'));

-- 7. tontine_cycles
DROP POLICY IF EXISTS "Users CRUD own tontine_cycles" ON public.tontine_cycles;
CREATE POLICY "Collaborators view tontine_cycles"
  ON public.tontine_cycles FOR SELECT TO authenticated
  USING (public.is_caisse_collaborator(tontine_id, 'viewer'));
CREATE POLICY "Managers manage tontine_cycles"
  ON public.tontine_cycles FOR ALL TO authenticated
  USING (public.is_caisse_collaborator(tontine_id, 'manager'))
  WITH CHECK (public.is_caisse_collaborator(tontine_id, 'manager'));

-- 8. tontine_payments
DROP POLICY IF EXISTS "Users CRUD own tontine_payments" ON public.tontine_payments;
CREATE POLICY "Collaborators view tontine_payments"
  ON public.tontine_payments FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.tontine_cycles c
    WHERE c.id = tontine_payments.cycle_id
      AND public.is_caisse_collaborator(c.tontine_id, 'viewer')
  ));
CREATE POLICY "Managers manage tontine_payments"
  ON public.tontine_payments FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.tontine_cycles c
    WHERE c.id = tontine_payments.cycle_id
      AND public.is_caisse_collaborator(c.tontine_id, 'manager')
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.tontine_cycles c
    WHERE c.id = tontine_payments.cycle_id
      AND public.is_caisse_collaborator(c.tontine_id, 'manager')
  ));
