## Ajouter "Continuer avec Google" sur Login et Signup

### Ce qui sera fait
1. **Activer Google OAuth managé** via Lovable Cloud (aucune clé à fournir, credentials managés par défaut).
2. **Bouton "Continuer avec Google"** ajouté sur :
   - `src/pages/Login.tsx` (sous le formulaire email/mot de passe, avec un séparateur "ou")
   - `src/pages/Signup.tsx` (même placement, cohérent visuellement)
3. **Flow OAuth** : appel via le module `lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin })`. Redirection vers Google → retour sur l'app → session créée automatiquement.
4. **Profil utilisateur** : le trigger `handle_new_user` existe déjà → un profil + rôle `user` seront créés automatiquement pour les nouveaux comptes Google (nom récupéré depuis `raw_user_meta_data.full_name` fourni par Google).
5. **Préservation du `returnTo`** (ex: invitations caisse) : transmis via `redirect_uri` pour ne pas casser le flow d'invitation.
6. **Email/mot de passe conservé** : pas de désactivation, les deux méthodes coexistent.

### Détails techniques
- Tool `configure_social_auth` avec `providers: ["google"]` (génère `src/integrations/lovable/`).
- Pas de modif de `supabase/client.ts` ni de migration DB.
- Style du bouton : variant `outline`, icône Google SVG inline, cohérent avec le thème dark/neon existant.

### Questions ouvertes
- Tu veux aussi **Apple Sign-In** (souvent demandé pour l'App Store iOS) ou seulement Google pour l'instant ?
