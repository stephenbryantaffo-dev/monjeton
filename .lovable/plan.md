## Problème

Deux sections de la landing sont écrites en français en dur et ne changent pas quand on bascule en anglais :

- `src/components/landing/TestimonialsBlock.tsx` — badge "Témoignages", titre "Ils gèrent mieux leur argent", les 3 citations, noms, rôles.
- `src/components/landing/Pricing.tsx` — badge "Abonnements", titre "Choisissez votre plan", sous-titre, "FCFA / mois", labels annuels ("ou 19 900 FCFA / an", "pour toujours"), features de chaque plan, textes des boutons ("S'inscrire", "Prendre Pro", "Prendre Ultra Pro"), badge "Le plus populaire", note "Paiement sécurisé via Jèko".

Le reste de la landing (Hero, FAQ, Footer, etc.) utilise déjà `useLandingT()` → `LANDING_STRINGS` dans `src/lib/landingI18n.ts`. Il faut faire pareil pour ces deux composants.

## Plan

### 1. Ajouter les clés FR + EN dans `src/lib/landingI18n.ts`

Sous les deux langues, ajouter :

**Testimonials**
- `testi_badge` : "Témoignages" / "Testimonials"
- `testi_title_before` : "Ils gèrent mieux leur" / "They manage their"
- `testi_title_word` : "argent" / "money" (mot mis en surbrillance via `MarkerText`)
- `testi_items` : tableau de 3 objets `{ quote, name, role }` traduits.

**Pricing (landing)**
- `pricing_landing_badge` : "Abonnements" / "Plans"
- `pricing_landing_title_before` : "Choisissez votre" / "Choose your"
- `pricing_landing_title_word` : "plan" / "plan"
- `pricing_landing_subtitle` : "Commencez gratuitement, passez au Pro quand vous êtes prêt." / "Start free, upgrade to Pro when you're ready."
- `pricing_landing_popular` : "Le plus populaire" / "Most popular"
- `pricing_landing_per_month` : "FCFA / mois" / "FCFA / month"
- `pricing_landing_secure_note` : "Paiement sécurisé via Jèko" / "Secure payment via Jèko"
- Pour chaque plan (`free`, `pro`, `ultra`) : `name`, `yearlyLabel`, `features` (tableau), `buttonText`.
  - Free : "Gratuit"/"Free", "pour toujours"/"forever", features, "S'inscrire"/"Sign up"
  - Pro : "Pro", "ou 19 900 FCFA / an"/"or 19,900 FCFA / year", features, "Prendre Pro"/"Get Pro"
  - Ultra : "Ultra Pro", "ou 49 900 FCFA / an"/"or 49,900 FCFA / year", features, "Prendre Ultra Pro"/"Get Ultra Pro"

Les tableaux typés `as const` posent parfois problème pour l'inférence — s'assurer que `LandingStrings` reste dérivé du `fr` uniquement (déjà le cas). Utiliser des types compatibles (arrays de strings, arrays d'objets simples).

### 2. Réécrire `TestimonialsBlock.tsx`
- Importer `useLandingT`.
- Remplacer le tableau `testimonials` codé en dur par `lt.testi_items`.
- Remplacer "Témoignages" par `lt.testi_badge`.
- Remplacer le titre par `{lt.testi_title_before} <MarkerText…>{lt.testi_title_word}</MarkerText>`.

### 3. Réécrire `src/components/landing/Pricing.tsx`
- Importer `useLandingT`.
- Construire `plans` à partir de `lt` (nom, yearlyLabel, features, buttonText) au lieu de littéraux FR.
- Remplacer "Abonnements", le titre, le sous-titre, "FCFA / mois", "Le plus populaire", "Paiement sécurisé via Jèko" par les clés correspondantes.
- Conserver toute la logique : `openJekoPro`, `openJekoMax`, `navigate("/signup")`, styles, animations, prix affichés en chiffres (2000/5000/0), `formatPrice`.
- Le `MarkerText` reste sur le mot "plan"/"plan".

### 4. Vérifications
- `npx tsgo --noEmit` doit passer sans erreur.
- Basculer FR ↔ EN via le sélecteur : témoignages, titres, features, boutons, note Jèko, tout doit changer.
- Aucun autre fichier ne bouge. Comportement web/Android/iOS strictement identique côté logique (seuls les libellés changent).

## Détails techniques

Fichiers modifiés :
- `src/lib/landingI18n.ts` (ajout de clés dans `fr` et `en`)
- `src/components/landing/TestimonialsBlock.tsx`
- `src/components/landing/Pricing.tsx`

Aucun changement de logique métier, aucune modif de `jeko.ts`, `CountryContext`, ou d'autres composants landing.
