# Thème clair : passer au rendu épuré de la maquette

Objectif : que le mode clair (Blanc et Crème) ressemble à l'aperçu de droite — vert lime vif, boutons ronds pleins, cartes blanches nettes — au lieu du vert foncé terne et des pastilles délavées actuelles.

## Ce qui change visuellement

1. **Vert de marque plus vif en clair**
   - Aujourd'hui le vert du thème clair est un vert forêt sombre (utilisé pour la carte Revenus, les pastilles, le texte d'accent) : rendu lourd.
   - Nouveau vert lime vif comme dans la maquette, avec texte foncé posé dessus (au lieu de blanc) pour garder le contraste.
   - Un vert foncé séparé est conservé uniquement pour le **texte** vert (liens « Voir tout », label « Parler ») afin de rester lisible sur fond blanc.

2. **Boutons ronds Saisir / Parler / Scanner**
   - Actuellement : pastilles en dégradé pâle avec relief (effet conçu pour le fond sombre) → aspect délavé sur blanc.
   - Nouveau : cercles pleins vert lime, icône foncée, légère ombre douce. Le mode sombre garde exactement son rendu actuel.

3. **Cartes Revenus / Dépenses**
   - Vert lime vif et rouge corail plus lumineux, coins un peu moins arrondis, ombre douce colorée, valeurs en blanc/foncé selon le fond — comme la maquette.

4. **Sélecteur de période et raccourcis**
   - Pilule active « Jour » en vert lime plein avec texte foncé, fond de la barre gris très clair.
   - Cartes « Créer un budget / Créer une tontine » : fond blanc, bordure fine, pastille d'icône vert lime clair.

5. **Barre de navigation basse**
   - Onglet actif : pastille vert lime pleine avec icône et libellé foncés (au lieu du vert translucide actuel).

6. **Densité / épuration**
   - Espacements et tailles de titre alignés sur la maquette (titre d'accueil un peu plus compact, moins d'écart entre les blocs).

Le mode sombre reste strictement inchangé.

## Détails techniques

- `src/index.css` : dans `.light` et `.cream`, redéfinir `--primary` en lime vif (~`hsl(96 72% 48%)`) avec `--primary-foreground` foncé ; ajouter une variable dédiée `--primary-text` (vert foncé actuel) pour le texte vert sur fond clair ; ajuster `--ring`, `--neon-lime`, `--sidebar-primary`.
- `src/index.css` : override `.light .icon-3d`, `.cream .icon-3d` → fond plat `hsl(var(--primary))`, bordure transparente, ombre douce, suppression du `::before`.
- `tailwind.config.ts` : exposer `primary-text` comme couleur.
- `src/pages/Dashboard.tsx` : appliquer `text-primary-text` là où du vert est utilisé comme texte, ajuster classes des cartes Revenus/Dépenses, pilules de période, cartes raccourcis, espacements.
- `src/components/LimelightNav.tsx` : onglet actif en `bg-primary` + texte `text-primary-foreground` en thème clair (garder `bg-primary/15` en sombre via variante).

## Suite

Une fois validé, on applique la même grammaire visuelle aux autres pages (Transactions, Rapports, Plus).
