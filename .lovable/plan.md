# Création de tontine : passer de 5 écrans à 2

Objectif : appliquer la maquette fournie au flux de création (`CreateTontineModal`), sans perdre aucune fonctionnalité existante.

## État actuel

Le flux tournante/groupe fait 5 écrans :
1. Choix du type (3 cartes)
2. Nom + montant + date de début
3. Fréquence (5 options en liste)
4. Membres
5. Récapitulatif

Le flux événement fait déjà 3 écrans (type, infos, participants).

## Nouveau flux (2 écrans)

**Écran 1 — « Ta tontine »**
- Sélecteur de type compact en haut : 3 tuiles côte à côte (Tontine tournante / Cotisations groupe / Événement), icônes en trait lime, tuile active surlignée.
- Nom
- Ligne à deux colonnes : Cotisation (montant) et Début (date)
- Rythme : pastilles horizontales au lieu de la liste verticale. Chaque jour / Chaque semaine / Chaque mois affichées en premier, plus Trimestrielle, Annuelle et Personnalisée (le champ « tous les combien de jours » n'apparaît que si Personnalisée est choisie).
- Bouton « Continuer »

Pour le type Événement, l'écran 1 garde ses champs propres (objectif fixe / ouvert, date de l'événement) à la place de cotisation + rythme.

**Écran 2 — « Qui participe ? »**
- Liste des membres en cartes avec avatar initiale, nom, croix de suppression
- Bouton en pointillés « + Ajouter un membre » (ouvre les champs nom/téléphone + case « C'est moi »)
- Bloc récapitulatif intégré en bas, mis à jour en direct : nom, montant × rythme, nombre de membres, cagnotte du tour
- Bouton « Créer la tontine »

Barre de progression à 2 segments en haut, plus de compteur « Étape X/5 ».

## Détails techniques

- Fichier concerné : `src/components/tontine/CreateTontineModal.tsx` (refonte du rendu et de la machine à étapes ; les fonctions `createRecurring` / `createProject` et les payloads Supabase restent inchangés).
- `step` passe de 0–4 à 1–2 ; le choix du type devient un état interne à l'écran 1 (valeur par défaut : tontine tournante).
- Validation : écran 1 exige type + nom + montant > 0 + date (événement : nom seul) ; écran 2 exige 2 membres minimum (1 pour événement).
- `MembersStep` est réécrit en style cartes/avatars, réutilisé par les deux parcours.
- Styles issus des tokens existants (`glass-card`, `primary`, `border`) — pas de couleurs en dur, aucun emoji.
- Aucun changement de base de données.
