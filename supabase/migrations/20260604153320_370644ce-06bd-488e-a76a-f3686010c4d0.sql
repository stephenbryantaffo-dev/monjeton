-- 1. Policy : un collaborateur non-owner peut quitter (supprimer sa propre ligne)
CREATE POLICY "Collaborator can leave"
  ON public.caisse_collaborators FOR DELETE TO authenticated
  USING (user_id = auth.uid() AND role <> 'owner');

-- 2. Fonction sécurisée : transférer la propriété
CREATE OR REPLACE FUNCTION public.transfer_caisse_ownership(
  _caisse_id uuid, _new_owner uuid
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid uuid := auth.uid();
BEGIN
  -- Vérifier que l'appelant est bien l'owner actuel
  IF NOT EXISTS (
    SELECT 1 FROM public.caisse_collaborators
    WHERE caisse_id = _caisse_id AND user_id = v_uid AND role = 'owner'
  ) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_owner');
  END IF;

  -- Vérifier que le nouveau owner est un collaborateur de la caisse
  IF NOT EXISTS (
    SELECT 1 FROM public.caisse_collaborators
    WHERE caisse_id = _caisse_id AND user_id = _new_owner
  ) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_a_collaborator');
  END IF;

  -- Promouvoir le nouveau owner
  UPDATE public.caisse_collaborators
    SET role = 'owner'
    WHERE caisse_id = _caisse_id AND user_id = _new_owner;

  -- Rétrograder l'ancien owner en manager
  UPDATE public.caisse_collaborators
    SET role = 'manager'
    WHERE caisse_id = _caisse_id AND user_id = v_uid;

  -- Mettre à jour tontines.user_id pour refléter le nouveau propriétaire
  UPDATE public.tontines
    SET user_id = _new_owner
    WHERE id = _caisse_id;

  RETURN jsonb_build_object('ok', true);
END;
$$;

-- 3. Grant execute pour les utilisateurs authentifiés
GRANT EXECUTE ON FUNCTION public.transfer_caisse_ownership(uuid, uuid) TO authenticated;
