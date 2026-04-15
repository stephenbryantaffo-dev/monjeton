

## Redesign Login & Signup — Style HextaUI adapté Mon Jeton

### Objectif
Refondre les pages Login (`/login`) et Signup (`/signup`) en s'inspirant du design centré HextaUI (carte glass centrée, inputs arrondis, bouton Google, fond sombre) tout en conservant les couleurs Mon Jeton (primary lime `#7EC845`, fond dark `#0F0F1A`, accents verts/violets) et en optimisant pour mobile.

### Design cible
- Fond sombre uni (background existant) — pas de split-screen
- Carte centrée avec glassmorphism (existant `glass` class)
- Logo Mon Jeton centré en haut de la carte
- Inputs avec fond `bg-secondary`, coins arrondis `rounded-xl`, placeholders
- Bouton principal `gradient-primary` (lime)
- Bouton Google OAuth avec icône G colorée
- Liens "Mot de passe oublié" et "S'inscrire / Se connecter"
- Mobile-first : `max-w-sm`, padding adapté, pas de colonne desktop

### Plan technique

**1. Refondre `src/pages/Login.tsx`**
- Supprimer le layout split-screen (colonne gauche orbitale)
- Layout : `min-h-screen flex items-center justify-center bg-background`
- Carte centrée : logo Mon Jeton, titre "Mon Jeton", inputs email/password (arrondis, fond secondary), bouton "Se connecter" (gradient-primary), bouton "Continuer avec Google", lien mot de passe oublié, lien inscription
- Conserver toute la logique existante (signIn, rate limit, forgot password, toast)
- Ajouter Google OAuth via `lovable.auth.signInWithOAuth("google")`

**2. Refondre `src/pages/Signup.tsx`**
- Même layout centré que Login
- Carte : logo, titre "Créer ton compte", inputs nom/email/password avec PasswordStrengthIndicator, bouton "Créer mon compte", bouton Google, lien connexion
- Conserver la logique existante (signUp, rate limit, password validation, sanitize)
- Ajouter Google OAuth

**3. Configurer Google OAuth**
- Utiliser l'outil Configure Social Auth pour générer le module `lovable.auth`
- Importer `lovable.auth.signInWithOAuth("google")` dans Login et Signup

### Fichiers modifiés
- `src/pages/Login.tsx` — refonte complète du template
- `src/pages/Signup.tsx` — refonte complète du template
- Configuration Google OAuth via outil dédié

### Ce qui ne change PAS
- Toute la logique métier (auth, rate limiting, validation, navigation)
- Les imports et dépendances existants
- Le routing dans App.tsx

