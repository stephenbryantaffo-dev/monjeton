# Optimisation vitesse mobile — Landing Mon Jeton

Objectif : réduire le JS initial de la landing (`/`) sous ~250 KB gzip, first paint quasi-immédiat sur Android moyen de gamme, **sans changer le design**.

## 1. Isoler la landing du backend (gros gain)

Aujourd'hui `App.tsx` importe eagerly `AuthProvider`, `PrivacyProvider`, `CountryProvider`, `Dashboard`, `Login`, `Signup`. Résultat : `@supabase/supabase-js`, tous les contextes auth et Dashboard sont dans le bundle initial même sur `/`.

**Action** :
- Créer `src/PrivateApp.tsx` regroupant tous les providers (Auth/Privacy/Country), `CurrencyRateLoader`, `PinLockScreen`, et TOUTES les routes non-publiques.
- `App.tsx` ne garde eagerly que : `ErrorBoundary`, `BrowserRouter`, `QueryClientProvider`, `Toaster`, `Landing`. Login, Signup, Privacy, Terms deviennent lazy. Le reste passe par un `<Route path="*" element={<PrivateApp/>} />` lazy-loadé.
- Résultat : sur `/`, aucun `@supabase`, aucun `AuthContext`, aucun Dashboard.

## 2. Landing plus légère

- `Landing.tsx` : rendre `GlobalDigitalEffects`, `FloatingFCFA`, `PaymentMarquee`, `AnimatedSectionBackground`, `Footer`, `Navbar` (mobile menu) lazy. `Hero` reste eager (above-fold).
- `Hero.tsx` : garder la structure visuelle mais remplacer les `motion.div` non critiques par des animations CSS (`@keyframes float`) — `framer-motion` uniquement pour ce qui reste réellement animé.
- `SectionReveal.tsx` : sur mobile ou `prefers-reduced-motion`, rendu direct sans framer-motion (`whileInView`).
- `GlobalDigitalEffects` : désactivé complètement en mobile (film grain SVG + scanline non essentiels).
- Retirer `<PageLoader/>` fallback plein écran pour la landing : `Suspense fallback={null}` sur les sections below-fold pour ne pas cacher le hero.

## 3. Charts & poids

- `recharts` déjà en chunk séparé + n'est importé par aucun composant landing. Vérifier via visualizer.
- Ajouter `rollup-plugin-visualizer` (mode analyze) : `npm run build -- --mode=analyze` produit `dist/stats.html`.
- Ajouter chunks manuels supplémentaires pour `date-fns`, `jspdf`, `canvas-confetti`, `embla-carousel` (aucun ne doit apparaître dans le chunk initial).

## 4. Images & polices

- Vérifier `index.html` : preload logo (petit), pas de police lourde bloquante. `<link rel="preload">` sur le logo si utilisé above-fold. Images below-fold : `loading="lazy" decoding="async"`.

## 5. Config Vite

```ts
// vite.config.ts
build.rollupOptions.output.manualChunks:
  + date-fns → vendor-datefns
  + jspdf, canvas-confetti → vendor-heavy (lazy only)
  + embla-carousel → vendor-carousel
plugins (analyze mode): visualizer({ filename: 'dist/stats.html', gzipSize: true })
```

## 6. Vérification

- `npm run build` : lire les tailles des chunks émis par Vite. Cible : chunk initial `index-*.js` < 250 KB gzip pour `/`.
- Confirmer via visualizer qu'aucun `@supabase`, `recharts`, `jspdf`, `date-fns` n'apparaît dans le chunk initial.

## Fichiers touchés

- `src/App.tsx` (refactor majeur)
- `src/PrivateApp.tsx` (nouveau)
- `src/pages/Landing.tsx` (lazy sections)
- `src/components/landing/Hero.tsx` (framer-motion → CSS pour les décorations)
- `src/components/landing/SectionReveal.tsx` (CSS mobile)
- `src/components/landing/GlobalDigitalEffects.tsx` (skip mobile complet)
- `vite.config.ts` (chunks + visualizer optionnel)
- `package.json` (ajouter `rollup-plugin-visualizer` en devDep)

## Non touché

- Design visuel, textes, i18n, palette, logique métier.
- Pages connectées (Dashboard, etc.) : inchangées, seulement lazy-loadées.
- Aucune migration DB.

Confirme et je lance l'implémentation.
