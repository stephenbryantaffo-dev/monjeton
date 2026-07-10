
## Objectif

Adopter fidèlement le design du fichier `landing_anthracite.html` sur la landing React (Hero + 4 sections split), retirer les sections devenues redondantes, garder les sections commerciales (Pricing, FAQ, FinalCTA), et câbler tous les boutons.

## 1. `src/pages/Landing.tsx` — nettoyage du rendu

- Retirer du rendu : `Stats`, `ForWhoSection`, `AIScan`, `Enterprise` (et leurs `AnimatedSectionBackground` wrappers). Les imports lazy correspondants sont supprimés.
- Ordre final :
  1. `Navbar`
  2. `Hero` (réécrit)
  3. `PaymentMarquee`
  4. `FeatureShowcase` (réécrit — 4 sections split)
  5. `Pricing`
  6. `FAQ`
  7. `FinalCTA`
  8. `Footer`
- Conserver `GlobalDigitalEffects`, `FloatingFCFA`, `.grid-bg`.

## 2. `src/components/landing/Hero.tsx` — refonte

Reproduire fidèlement le HTML fourni (grille 1.05fr / 0.95fr, headline UPPERCASE 4 lignes avec `MarkerText` lime + outline + `MarkerText` dark, sous-titre, 3 boutons, ligne trust étoiles).

Téléphone à droite (frame gris métal, Dynamic Island, écran dashboard avec header Bryan / chip -12%, hero card 128 500 FCFA + barres semaine, 2 mini-cartes Revenus/Dépenses, 2 lignes de transactions Freelance +50 000 et Restaurant -8 500).

4 cartes flottantes autour du téléphone (positions `h1c`..`h4c`, rotations, animations flottantes) :
- Alerte dépense -32 000 F (masquée sur mobile)
- Scan AI — Reçu en 2 s
- Tontine Bureau — 7/10 à jour + barre 70%
- Budget Transport — Reste 12 000 F

Boutons câblés :
- **S'inscrire** → `navigate("/signup")`
- **Prendre le plan Pro** → scroll ancre `#pricing`
- **Voir la démo** → scroll ancre `#demo` (fallback `#features`)

Les 3 sections split conservent le id `demo` sur le conteneur racine du FeatureShowcase (déjà en place).

## 3. `src/components/landing/FeatureShowcase.tsx` — 4 sections

Le composant existe déjà avec ce schéma ; on l'aligne strictement sur les 4 sections du HTML :

1. **Vocal — « Parlez, on note tout »** (texte gauche / tel droite) — écran Saisie vocale, orbe micro, barres audio, phrase « 3 000 marché / 15 000 taxi », détail 2 transactions, bouton « Confirmer les 2 ». Cartes : Multi-transactions (2 détectées), Catégorie auto (Alimentation).
2. **Scan — « Photographiez, c'est enregistré »** (inversée) — cadre scan animé (lignes lime + scanline), détail Burger King / -14 500 F / Alimentation, bouton « Enregistrer ». Cartes : Montant lu -14 500 F, Reçu archivé.
3. **Épargne — « Fixez un objectif, atteignez-le »** (texte gauche / tel droite) — Épargne totale 550 000 FCFA, 3 objectifs (Dakar 64%, Fonds urgence 50%, Nouveau tel 32%). Cartes : Objectif Dakar 64%, Reste 180 000 F.
4. **Dettes — « Qui vous doit quoi, enfin clair »** (inversée) — chip Net +55 000, onglets « On me doit » (actif) / « Je dois », 3 lignes Koffi/Aya/Moussa, bouton « Relancer Koffi ». Cartes : On me doit +85 000 F, Rappel auto dans 3 jours.

`<section id="demo">` conservé comme conteneur pour la cible « Voir la démo ». Titres avec `MarkerText`.

## 4. `src/components/landing/Navbar.tsx` — liens

Réduire les liens nav aux sections qui existent encore :

```
Fonctions → #demo
Tarifs    → #pricing
Sécurité  → #faq (fallback ; la section Enterprise est retirée)
FAQ       → #faq
```

`S'inscrire` → `/signup` (déjà OK). Le sélecteur FR/EN et « Se connecter » restent inchangés.

## 5. Vérifications finales

- Tsgo sur les 3 fichiers modifiés.
- Ancres présentes : `#demo` (FeatureShowcase), `#pricing` (Pricing), `#faq` (FAQ). Confirmer en `rg 'id="pricing"|id="faq"|id="demo"' src/components/landing`.
- Aucun autre composant modifié.

## Détails techniques

- Palette : `#04060A`, `#7CFF3A`, `#EAFBEA` (charte inchangée).
- Framer Motion pour reveal + float ; `useInView` sur `MarkerText` (déjà fait).
- Icônes lucide uniquement, zéro émoji.
- Responsive : sur `< md`, la grille passe en 1 colonne, 3 cartes visibles autour du téléphone Hero (Alerte masquée), 2 cartes conservées sur chaque section split.
