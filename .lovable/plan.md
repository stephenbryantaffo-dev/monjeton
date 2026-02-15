
# Correction du flux "Mot de passe oublié"

## Probleme identifie

Quand un utilisateur clique sur "Mot de passe oublié" sur la page de connexion, un email de réinitialisation est envoyé avec un lien qui redirige vers `/login`. Cependant, quand l'utilisateur clique sur ce lien, il arrive sur la page de connexion normale sans aucun moyen de saisir un nouveau mot de passe. Le token de récupération dans l'URL n'est pas détecté ni traité.

## Solution

Créer une page dédiée `/reset-password` qui permet à l'utilisateur de saisir son nouveau mot de passe, et détecter automatiquement le token de récupération.

## Etapes techniques

### 1. Creer la page `src/pages/ResetPassword.tsx`
- Un formulaire avec deux champs : nouveau mot de passe + confirmation
- Detecter l'evenement `PASSWORD_RECOVERY` via `onAuthStateChange` de Supabase
- Appeler `supabase.auth.updateUser({ password })` pour mettre a jour le mot de passe
- Afficher un message de succes et rediriger vers `/login`

### 2. Ajouter la route dans `src/App.tsx`
- Ajouter `<Route path="/reset-password" element={<ResetPassword />} />`

### 3. Modifier la redirection dans `src/pages/Login.tsx`
- Changer le `redirectTo` de `resetPasswordForEmail` de `/login` vers `/reset-password`
- Cela garantit que le lien dans l'email amene directement sur le formulaire de nouveau mot de passe

### 4. Gerer le token dans `AuthContext.tsx`
- Detecter l'evenement `PASSWORD_RECOVERY` dans le listener `onAuthStateChange`
- Rediriger automatiquement vers `/reset-password` quand cet evenement est detecte

## Resultat attendu
1. L'utilisateur entre son email et clique "Mot de passe oublié"
2. Il recoit un email avec un lien
3. Le lien ouvre la page `/reset-password`
4. Il saisit son nouveau mot de passe
5. Le mot de passe est mis a jour et il est redirige vers la connexion
