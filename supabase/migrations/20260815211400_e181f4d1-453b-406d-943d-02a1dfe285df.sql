-- La politique ouverte annulait la politique restreinte "Members can view
-- invites" (les policies RLS se cumulent en OU). Aucun code applicatif ne lit
-- d'invitation par jeton côté client : la suppression est sans impact
-- fonctionnel et rétablit la restriction aux membres de l'espace.
DROP POLICY IF EXISTS "Anyone can read invite by token" ON public.workspace_invites;