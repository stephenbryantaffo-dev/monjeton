Corriger le bouton **"Appliquer"** des suggestions IA de budget qui ne fonctionne pas pour la plupart des catégories. Cause : l'IA invente des libellés composés ("Business & Entreprise", "Épargne & Investissement", "Factures & Téléphone"…) qui ne correspondent à aucune catégorie réelle de l'utilisateur, donc `category_id` reste `undefined` et le bouton tombe sur le toast "Catégorie introuvable".

Solution combinée : **forcer l'IA à n'utiliser que les vraies catégories** + **fallback de matching robuste côté code** + **bouton de création rapide** si jamais une suggestion ne matche pas.

## Changements

### 1. `supabase/functions/budget-suggest/index.ts`

- Lire un nouveau champ `userCategories: string[]` depuis le body de la requête.
- Injecter cette liste exacte dans le prompt système (section "CATÉGORIES DISPONIBLES").
- Ajouter une **règle absolue #1** : "Le champ `categorie` doit être STRICTEMENT identique à l'un des noms de la liste. N'invente jamais de noms composés type 'X & Y'. Si tu veux regrouper, choisis UNE seule catégorie existante."

### 2. `src/pages/Budgets.tsx`

- Lors de l'appel `supabase.functions.invoke("budget-suggest")`, passer `userCategories: categories.filter(c => c.type === "expense").map(c => c.name)`.
- Améliorer la fonction de matching `enriched` :
  - Normalisation : lowercase + suppression accents + suppression ponctuation.
  - Si pas de match exact, essayer un match par mot-clé (ex : "Business & Entreprise" → cherche une catégorie contenant "business" ou "entreprise").
  - Mapping de synonymes courants : `épargne` → `Autre` (ou catégorie "Épargne" si elle existe), `business`/`entreprise`/`pro` → `Freelance`, `imprévus` → `Autre`, `investissement` → `Autre`.
- Si après tous ces fallbacks `category_id` reste vide : au lieu d'afficher juste un toast d'erreur, le bouton "Appliquer" devient **"Créer & appliquer"** qui :
  1. Crée la catégorie (`INSERT INTO categories` avec `name = suggestion.categorie`, `type = 'expense'`, icône/couleur par défaut).
  2. Applique le budget dans la foulée.
  3. Recharge les données.

## Détails techniques

- Helper de normalisation côté client : `(s) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[&/,()]/g, " ").replace(/\s+/g, " ").trim()`.
- Le matching essaie dans l'ordre : (1) exact normalisé, (2) chaque mot du libellé IA contre chaque nom de catégorie normalisé (≥4 caractères pour éviter les faux positifs sur "et"/"de").
- Aucun changement de schéma BDD requis. Aucune migration.
- Aucun changement sur les autres composants.

Résultat : tous les boutons "Appliquer" fonctionnent, et dans les rares cas restants (libellé exotique de l'IA), l'utilisateur peut créer la catégorie en 1 clic au lieu d'être bloqué.