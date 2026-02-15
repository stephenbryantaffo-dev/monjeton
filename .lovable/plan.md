
# Changement de couleur des categories + Idees d'amelioration

## 1. Changement de couleur des categories

### Fonctionnalite

Chaque carte de categorie aura un bouton pour changer sa couleur. Au clic, une palette de couleurs predefinies (adaptees au theme sombre de l'app) s'affichera via un Popover. La couleur selectionnee sera sauvegardee en base de donnees immediatement.

### UX

- Cliquer sur le rond colore de la categorie ouvre un Popover avec une grille de couleurs
- La palette proposera 12 couleurs harmonieuses (vert lime, violet, jaune, rouge, bleu, orange, rose, cyan, etc.)
- Le choix d'une couleur se repercute instantanement sur la carte (apercu en temps reel)
- La nouvelle couleur est aussi utilisee lors de la creation d'une categorie (selecteur dans le formulaire d'ajout)

### Details techniques

| Fichier | Modification |
|---------|-------------|
| `src/pages/Categories.tsx` | Ajouter un Popover sur le cercle de couleur de chaque categorie, avec une grille de 12 pastilles cliquables. Au clic, appel `supabase.from("categories").update({ color }).eq("id", id)`. Ajouter aussi le selecteur de couleur dans le formulaire de creation. |

Palette prevue :
```text
hsl(84,81%,44%)   - Vert lime (accent principal)
hsl(270,70%,60%)  - Violet
hsl(45,96%,58%)   - Jaune
hsl(200,70%,50%)  - Bleu
hsl(0,70%,55%)    - Rouge
hsl(340,70%,55%)  - Rose
hsl(180,60%,45%)  - Cyan
hsl(30,80%,50%)   - Orange
hsl(150,60%,45%)  - Vert emeraude
hsl(220,70%,60%)  - Indigo
hsl(60,70%,50%)   - Jaune-vert
hsl(0,0%,60%)     - Gris
```

---

## 2. Idees d'amelioration des fonctionnalites existantes

Voici des pistes concretes pour enrichir l'application :

### A. Transactions
- **Transactions recurrentes** : Permettre de programmer des depenses/revenus automatiques (loyer, salaire, abonnements). Creation automatique chaque mois.
- **Filtrage avance** : Filtrer par categorie, portefeuille, periode, montant min/max.
- **Export CSV/Excel** : Telecharger ses transactions en fichier tableur.

### B. Dashboard
- **Graphique d'evolution** : Ajouter un graphe de tendance des depenses par semaine/mois (line chart avec Recharts).
- **Top 3 categories du mois** : Afficher les categories ou l'utilisateur depense le plus.
- **Comparaison mois precedent** : Indicateur "vous avez depense X% de plus/moins que le mois dernier".

### C. Budgets
- **Alertes de depassement** : Notification toast quand une categorie depasse 80% puis 100% du budget.
- **Budget par categorie** : Repartir le budget global par categorie avec des barres de progression individuelles (la table `category_budgets` existe deja).

### D. Portefeuilles (Wallets)
- **Solde par portefeuille** : Calculer et afficher le solde reel de chaque portefeuille (revenus - depenses).
- **Transfert entre portefeuilles** : Deplacer de l'argent de Wave vers Cash par exemple.

### E. Scan OCR
- **Scan en lot** : Scanner plusieurs tickets a la suite et les confirmer en batch.
- **Historique avec recherche** : Chercher dans ses anciens scans par marchand ou montant.

### F. Epargne (Savings)
- **Notifications d'echeance** : Rappel quand la deadline d'un objectif approche.
- **Ajout rapide de montant** : Bouton "+500F", "+1000F", "+5000F" pour alimenter rapidement un objectif.

### G. Dettes
- **Rappels automatiques** : Notifications avant la date d'echeance d'une dette.
- **Historique de paiements partiels** : Suivre les remboursements progressifs d'une dette.

### H. General
- **Mode hors-ligne** : Permettre d'ajouter des transactions sans connexion et synchroniser plus tard.
- **Multi-devise** : Support EUR et USD en plus du XOF avec conversion.
- **Partage de rapport** : Generer un resume mensuel en PDF/image partageable via WhatsApp.
