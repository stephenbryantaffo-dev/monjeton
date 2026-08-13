-- Ancienne politique trop permissive : tout utilisateur connecté pouvait lire tous les jetons d'invitation.
-- La fonctionnalité workspace n'est pas utilisée côté client, et la validation par token est faite côté serveur.
-- On restreint donc la lecture directe aux membres de l'espace concerné.
DROP POLICY IF EXISTS "Anyone can read invite by token" ON public.workspace_invites;

CREATE POLICY "Members can read their workspace invites"
  ON public.workspace_invites
  FOR SELECT
  USING (
    public.has_workspace_role(
      auth.uid(),
      workspace_id,
      ARRAY['owner','admin','member']::workspace_role[]
    )
  );