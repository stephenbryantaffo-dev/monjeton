## Problème

Sur la page **Transactions**, les nouvelles dépenses du jour apparaissent souvent en bas de la liste, alors que sur le mini-aperçu du Dashboard elles remontent bien en haut.

**Cause** : le tri actuel utilise uniquement `order("date", desc)`. Comme `date` est un champ de type `DATE` (jour seulement, sans heure), toutes les transactions d'une même journée partagent la même valeur de tri → l'ordre entre elles est **indéterminé** côté Postgres et tombe souvent sur l'ordre d'insertion ascendant (les plus récentes en bas).

## Correction

Ajouter un **tri secondaire par `created_at` décroissant** partout où l'on liste les transactions, pour que les ajouts les plus récents d'un même jour remontent toujours en premier.

### Fichiers à modifier

1. **`src/pages/Transactions.tsx`** (ligne 55)
   - `.order("date", { ascending: false })` → ajouter `.order("created_at", { ascending: false })` en second
   - Appliquer le même double tri quand `sortOrder === "asc"` (date asc + created_at asc).

2. **`src/pages/Dashboard.tsx`** (ligne 266, requête transactions)
   - Ajouter le tri secondaire `created_at desc` pour cohérence avec la page Transactions.

3. **Rafraîchissement après ajout** : vérifier que `NewTransaction.tsx` redirige bien vers `/transactions` (ou Dashboard) après création — déjà le cas. Le re-fetch au focus de la page suffit, mais on peut aussi forcer un `setPage(0); fetchData(0)` au montage (déjà fait via `useEffect([user])`).

### Bonus optionnel (à confirmer)

Si tu veux une mise à jour **instantanée sans rechargement** lorsque tu reviens sur la page Transactions depuis NewTransaction, on peut ajouter un écouteur Supabase Realtime sur la table `transactions` filtré par `user_id`. C'est plus lourd mais plus "live". Sinon, le simple re-fetch au montage de la page suffit largement.

## Test attendu

1. Ajouter 3 transactions consécutives aujourd'hui (ex: 1000 F, 2000 F, 3000 F).
2. Aller sur **Transactions** → la liste affiche **3000 F → 2000 F → 1000 F** en haut (la plus récente en premier).
3. Cohérent avec le mini-bloc "Transactions récentes" du Dashboard.
