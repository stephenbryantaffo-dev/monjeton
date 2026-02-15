

## Configuration PWA pour Mon Jeton

### Ce que tu obtiendras
- Une icone "Mon Jeton" sur l'ecran d'accueil de ton telephone
- Un ecran de chargement (splash screen) avec le logo et la couleur verte du theme
- L'application s'ouvre en plein ecran, comme une vraie app native
- Fonctionne meme hors-ligne (les pages deja visitees restent accessibles)
- Une page `/install` avec les instructions d'installation pour tes utilisateurs

### Instructions d'installation (apres la mise en place)
- **Android (Chrome)** : Ouvre l'app dans Chrome, le navigateur proposera automatiquement "Ajouter a l'ecran d'accueil"
- **iPhone (Safari)** : Ouvre l'app dans Safari, appuie sur le bouton Partager, puis "Sur l'ecran d'accueil"

---

### Details techniques

**1. Installer `vite-plugin-pwa`**
- Ajout de la dependance `vite-plugin-pwa` au projet

**2. Configurer `vite.config.ts`**
- Ajout du plugin `VitePWA` avec :
  - Manifest incluant le nom "Mon Jeton", la description, les couleurs du theme (vert `#4a9a1e` et fond sombre `#0a1a0d`)
  - Icons PWA (192x192 et 512x512) generees en SVG dans le dossier `public/`
  - Mode `standalone` pour l'affichage plein ecran
  - `navigateFallbackDenylist` incluant `/~oauth` pour ne pas cacher les redirections d'authentification
  - Service worker en mode `generateSW` pour le cache automatique

**3. Creer les icones PWA**
- `public/pwa-icon-192.svg` et `public/pwa-icon-512.svg` : icones SVG representant une piece de monnaie stylisee en vert sur fond sombre (coherent avec le theme)

**4. Mettre a jour `index.html`**
- Ajout des meta tags pour iOS :
  - `apple-mobile-web-app-capable`
  - `apple-mobile-web-app-status-bar-style`
  - `apple-touch-icon`
- Ajout du `theme-color` vert du theme

**5. Creer la page `/install`**
- Nouvelle page `src/pages/Install.tsx` avec :
  - Detection automatique du systeme (Android/iOS)
  - Instructions visuelles etape par etape pour installer l'app
  - Bouton "Installer" qui declenche le prompt natif sur Android (via `beforeinstallprompt`)
  - Design coherent avec le reste de l'application
- Ajout de la route `/install` dans `App.tsx` (route publique)

**6. Fichiers concernes**
- `vite.config.ts` — ajout du plugin VitePWA
- `index.html` — meta tags mobiles
- `public/pwa-icon-192.svg` — icone 192px (nouveau)
- `public/pwa-icon-512.svg` — icone 512px (nouveau)
- `src/pages/Install.tsx` — page d'installation (nouveau)
- `src/App.tsx` — ajout de la route `/install`

Aucune modification de base de donnees necessaire.
