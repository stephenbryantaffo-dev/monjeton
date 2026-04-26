
# Auto-ajustement des budgets par catégorie

## Objectif

Tu ne veux plus cliquer sur "Appliquer". Dès qu'une dépense est enregistrée dans une catégorie, l'app crée ou ajuste **toute seule** le budget de cette catégorie pour le mois en cours, basé sur :

- **Montant déjà dépensé ce mois dans la catégorie** (plancher absolu)
- **+ une marge** calculée à partir de tes habitudes des 3 derniers mois (pour anticiper la suite du mois)

Résultat : tes budgets se construisent tout seuls et ne sont jamais en "dépassement injuste" — ils suivent ta réalité.

## Règle d'ajustement

Pour chaque catégorie où tu as une dépense ce mois :

```text
nouveau_budget = max(
  budget_actuel,                        // on ne baisse jamais
  dépensé_ce_mois × (jours_mois / jours_écoulés) × 1.10
)
```

- Le facteur `jours_mois / jours_écoulés` extrapole ton rythme actuel jusqu'à la fin du mois.
- Le `× 1.10` donne 10% de marge de sécurité.
- `max(budget_actuel, …)` garantit qu'on n'écrase jamais un budget que tu as fixé à la main plus haut.
- Si tu n'as pas d'historique, on tombe sur `dépensé × 1.20` minimum.

## Quand l'auto-ajustement se déclenche

1. **À chaque nouvelle transaction de type "dépense"** : un trigger côté client (dans `NewTransaction.tsx` après l'insert) appelle une fonction qui upsert le budget de la catégorie concernée.
2. **À l'ouverture de la page Budgets** : un balayage rapide synchronise toutes les catégories ayant eu des dépenses ce mois (rattrape les anciennes transactions).
3. **À chaque édition/suppression de transaction** : recalcul de la catégorie touchée.

Aucun clic, aucune notif intrusive. Juste un petit toast discret la première fois qu'un budget est créé automatiquement pour une catégorie : *"Budget {catégorie} ajusté automatiquement à X FCFA"*.

## Changements de code

### 1. Nouveau helper `src/lib/autoBudget.ts`

Une fonction `syncAutoBudget(userId, categoryId, month, year, supabase)` qui :
- Lit les transactions du mois pour cette catégorie
- Lit les 3 mois d'historique
- Calcule le budget cible avec la formule ci-dessus
- Fait un `upsert` sur `category_budgets` (clé `user_id, category_id, month, year`)
- Renvoie `{ created: boolean, amount: number }`

Et `syncAllAutoBudgets(userId, month, year, supabase)` qui boucle sur toutes les catégories de dépense ayant au moins une transaction ce mois.

### 2. `src/pages/NewTransaction.tsx`

Après le `insert` réussi d'une transaction de type `expense`, appeler `syncAutoBudget(...)` sans bloquer la navigation (fire-and-forget avec `.catch(console.error)`).

### 3. `src/pages/Budgets.tsx`

- Au mount, appeler `syncAllAutoBudgets()` puis recharger la liste des budgets.
- **Supprimer** le bouton "Appliquer" / "Créer & appliquer" sur chaque suggestion IA (devenu inutile).
- **Garder** le bloc des suggestions IA en mode lecture seule (info/conseil), avec un libellé clair "Répartition idéale suggérée" — purement indicatif.
- Ajouter un petit badge "Auto" sur les budgets créés automatiquement (vs. ceux fixés à la main), pour transparence.

### 4. Édition manuelle reste prioritaire

Si tu modifies à la main le budget d'une catégorie (vers le haut OU vers le bas), l'auto-ajustement **ne le baisse jamais**. Il peut seulement le remonter si une dépense future dépasse le seuil. Ça respecte ton intention.

### 5. Suppression de transaction

Pas de baisse automatique du budget si tu supprimes une dépense (sinon ça créerait des effets bizarres). Tu peux toujours ajuster à la main. À discuter si tu veux le contraire.

## Ce qui n'est PAS modifié

- Aucun changement de schéma DB (la table `category_budgets` existe déjà avec la bonne contrainte unique).
- L'edge function `budget-suggest` reste en place (seulement utilisée en lecture seule).
- Pas de nouvelle migration.

## Question ouverte

Tu peux me dire en validant si tu préfères :
- **(A)** Garder le bloc "Suggestions IA" en lecture seule (recommandé, ça reste utile comme conseil).
- **(B)** Le supprimer complètement (page plus épurée, focus sur les budgets réels).

Par défaut je pars sur (A). Dis-moi en approuvant si tu veux (B).
