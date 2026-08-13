# Mode clair — état réel vs maquette

## Réponse honnête

Non, pas encore trait pour trait. Voici ce qui est réellement en place et ce qui manque, après vérification du code.

### Déjà fidèle
- Palette exacte de la maquette : vert `#6BD62C → #3FAE0C`, pastilles `#A8EE7C → #5FCB27` bordure `#45A80F`, texte vert profond `#1E4A0B`, rouge dépenses `#E8705F → #CF4433`.
- Fonds : blanc pur (`Blanc`) et crème `#FAF8F3` (`Crème`), bordures et cartes avec les mêmes ombres douces.
- Écran Accueil : cartes Revenus/Dépenses pleines, pastilles rondes des actions, rail de période, onglet actif de la nav en pilule verte.

### Pas encore aligné
- Les autres écrans de la maquette ne sont pas repris : Saisie (clavier numérique, gros montant, chips), Vocal (bouton micro), Transactions (pastille ronde colorée + montant rouge foncé), Tontine (mini-cartes 2 colonnes avec chips).
- Les boutons CTA (plein vert + variante fantôme bordée) ne suivent pas encore la grammaire de la maquette partout.
- ~130 usages de `glass-card` dans l'app gardent un rendu générique en clair, alors que la maquette utilise une carte nette (bord fin + double ombre).
- Détails de densité : tailles de police, rayons (15/18px) et espacements de la maquette ne sont pas répliqués au pixel sur les listes.

## Ce que je propose de faire

1. **Carte de référence unique** : aligner `.glass-card` en clair/crème sur la carte de la maquette (fond, bord 1px, double ombre, rayon 15–18px) pour que toutes les pages en héritent d'un coup.
2. **Boutons** : deux styles clairs — plein dégradé vert (bordure `#2E8C06`, ombre verte) et fantôme (bord neutre, icône verte foncée).
3. **Listes de transactions** : pastille ronde 36px colorée, nom 12,5px semi-gras, date discrète, montant en `#A32B20`.
4. **Écran Saisie** : onglets segmentés verts, montant géant avec curseur vert, chips arrondies à icône verte, clavier avec touche action en vert clair.
5. **Écran Vocal** : bouton micro en dégradé vert avec halo, textes en vert profond.
6. **Tontine / cartes secondaires** : grille 2 colonnes, titres 11px capitales, chips gris clair.

Le mode sombre reste strictement inchangé à chaque étape.

## Notes techniques

- Tout passe par les tokens déjà créés (`--grad-primary`, `--grad-primary-soft`, `--grad-expense`, `--primary-text`) dans `src/index.css`, section « apercu-light-final ».
- Aucune couleur en dur dans les composants : uniquement des classes sémantiques (`money-income`, `short-card`, `nav-active`, etc.).
- Les surcharges restent préfixées `.light` / `.cream`, hors `@layer`, pour ne jamais toucher le thème sombre.
- Vérification visuelle : je ne peux pas capturer les écrans connectés (pas de session de test disponible), donc la validation se fera sur tes captures après chaque lot.

## Ordre proposé

Lot 1 : carte de référence + boutons (impact global immédiat).
Lot 2 : Transactions + Tontine.
Lot 3 : Saisie + Vocal.
