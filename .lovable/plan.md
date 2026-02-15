

## Section "Aujourd'hui" sur le tableau de bord

### Objectif
Ajouter une section **resume journalier** en haut du dashboard, juste apres le message de bienvenue, pour afficher en un coup d'oeil les depenses et revenus du jour.

### Ce qui sera affiche

La section contiendra :
1. **Carte "Depenses du jour"** -- total des depenses de la journee en cours
2. **Carte "Revenus du jour"** -- total des revenus de la journee en cours
3. **Liste des transactions du jour** -- toutes les transactions datees d'aujourd'hui, avec categorie, note et montant

Si aucune transaction n'a eu lieu aujourd'hui, un message "Aucune depense aujourd'hui" sera affiche.

### Placement dans la page

```text
+-------------------------------+
| Bonjour, [nom]                |
+-------------------------------+
| === Aujourd'hui (15 fev) ===  |  <-- NOUVELLE SECTION
| [Depenses: X F] [Revenus: Y F]|
| - Alimentation  -2 500 F     |
| - Transport      -1 000 F    |
+-------------------------------+
| [Semaine] [Mois] [Annee]     |  <-- existant
| Revenus / Depenses cards      |
| Graphiques, etc.              |
+-------------------------------+
```

### Details techniques

**Fichier modifie** : `src/pages/Dashboard.tsx`

1. **Calcul des donnees du jour** : Filtrer `transactions` ou la date correspond a `new Date().toISOString().split("T")[0]` (date du jour). Calculer `todayIncome` et `todayExpense` via `useMemo`.

2. **Nouvelle section UI** : Inserer un bloc entre le message de bienvenue et le selecteur de periode contenant :
   - Le titre "Aujourd'hui" avec la date formatee en francais (`new Date().toLocaleDateString("fr-FR", { day: "numeric", month: "long" })`)
   - Deux mini-cartes cote a cote (grid 2 colonnes) : depenses du jour et revenus du jour, stylees avec `glass-card` et `motion.div` comme les cartes existantes
   - La liste des transactions du jour avec le meme design que les "Transactions recentes"

3. **Gestion du mode privacy** : Utiliser `formatAmount()` deja en place pour masquer les montants si active.

4. **Skeleton loading** : Afficher des skeletons (`CardSkeleton`, `ListItemSkeleton`) pendant le chargement.

Aucune modification de base de donnees ni de requete supplementaire n'est necessaire -- les transactions sont deja chargees et filtrees cote client.
