# Thème clair : appliquer la maquette `apercu-light-final`

Étape 1 : l'écran **Accueil** (Blanc + Crème). Les autres pages suivront ensuite avec la même grammaire.

## Rendu visé

1. **Vert de marque vif** — dégradé `#6BD62C → #3FAE0C` (bordure `#2E8C06`) pour les éléments pleins ; variante claire `#A8EE7C → #7ADD44 → #5FCB27` (bordure `#45A80F`) pour les pastilles d'icônes, avec icônes vert très foncé `#173A08`. Texte vert de lien/accent : `#1E4A0B`.
2. **Sélecteur de période** — barre gris très clair (`#F1F3EF` blanc / `#F1EBE0` crème), pilule active en dégradé vert avec texte blanc et ombre douce.
3. **Cartes Revenus / Dépenses** — rayon 18px, dégradés verts et rouge `#E8705F → #CF4433`, pastille flèche blanche translucide, montant blanc 21px très serré.
4. **Trio Saisir / Parler / Scanner** — cercles 56px pleins en dégradé vert clair, icônes foncées, reflet interne ; « Parler » en label vert foncé.
5. **Raccourcis budget / tontine** — carte blanche bordée, pastille carrée verte 26px, chevron vert foncé.
6. **Transactions & tontines** — cartes blanches bordées avec ombre légère, montant sortant `#A32B20`, chips gris clair.
7. **Nav basse** — onglet actif en pilule dégradé vert, icône et libellé blancs.
8. **Densité** — titres et espacements alignés sur la maquette (salutation 20px, sections 13,5px, gaps 9-14px).

Le mode sombre reste strictement inchangé.

## Détails techniques

- `src/index.css` :
  - dans `.light` / `.cream`, redéfinir `--primary` (vert vif), `--primary-foreground` (blanc), `--ring`, `--neon-lime`, `--sidebar-primary` ; ajouter `--primary-text: #1E4A0B` et `--primary-soft` (pastille claire), plus `--gradient-primary-light`.
  - overrides `.light .icon-3d`, `.cream .icon-3d` → dégradé `#A8EE7C→#5FCB27`, bordure `#45A80F`, icônes `#173A08`, suppression du `::before` sombre.
  - overrides clairs pour `.gradient-primary` (dégradé 155deg vert vif + ombre).
- `tailwind.config.ts` : exposer `primary-text` et `primary-soft`.
- `src/pages/Dashboard.tsx` : classes des cartes Revenus/Dépenses (rayons, dégradés, tailles), pilules de période, trio d'actions, raccourcis, en-têtes de section et liens en `text-primary-text`, cartes tontines/transactions.
- `src/components/LimelightNav.tsx` : onglet actif en pilule `gradient-primary` + texte/icône `primary-foreground` en thème clair, comportement sombre conservé.
- Vérification : capture Playwright de `/dashboard` en thèmes Blanc et Crème, comparée à la maquette.

## Suite

Après validation de l'Accueil : Saisie/clavier, Vocal, Scan et Paramètres (sélecteur de thème) qui figurent aussi dans la maquette.
