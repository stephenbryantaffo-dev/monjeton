

## Signup Desktop — Design HextaUI 2 colonnes adapté Mon Jeton

### Objectif
Ajouter un layout desktop full-screen 2 colonnes au Signup, inspiré du composant HextaUI (screenshot). Mobile garde le design card centré actuel.

### Plan technique

**Fichier modifié : `src/pages/Signup.tsx`**

Restructurer le return JSX en deux blocs :

1. **Mobile (`flex md:hidden`)** : Conserver le design card centré existant tel quel (lignes 78-186 actuelles).

2. **Desktop (`hidden md:flex`)** : Layout full-screen 2 colonnes `min-h-screen` sur fond `#05070A` :

   - **Colonne gauche (50%)** : Fond sombre avec effets visuels :
     - 6 lignes verticales avec gradient vert (`rgba(126,200,69,0.15)`) style HextaUI
     - Blob radial vert principal (420px, blur 30px)
     - Blob secondaire teal
     - Overlay gradient top pour fondre
     - Texte en bas : slogan "Tu vas voir clair dans ton jeton." en blanc, grande typo

   - **Colonne droite (50%)** : Fond `#0A0D12` (légèrement plus clair), formulaire centré verticalement :
     - Logo Mon Jeton + titre "Créer ton compte" + sous-titre
     - Inputs nom/email/password avec labels, fond `#12151A`, bordure `#1E2330`, coins arrondis
     - PasswordStrengthIndicator
     - Bouton "Créer mon compte" gradient-primary (lime)
     - Séparateur "ou"
     - Bouton Google OAuth outline
     - Lien "Déjà un compte ? Se connecter"

3. **Logique partagée** : Les handlers (`handleSubmit`, `handleGoogleSignIn`) et state restent identiques, utilisés par les deux layouts. Les formulaires desktop et mobile partagent les mêmes `id` (pas de conflit car un seul est rendu).

### Ce qui ne change PAS
- Toute la logique métier (signUp, rate limit, password validation, Google OAuth)
- Le design mobile actuel
- Login.tsx (pas touché dans ce ticket)

