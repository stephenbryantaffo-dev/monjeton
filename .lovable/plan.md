
## Analyse de ta demande

Ton prompt couvre l'essentiel mais il manque plusieurs détails techniques importants pour un résultat propre. Voici une version corrigée et enrichie, organisée en 3 fonctionnalités distinctes.

---

## Fonctionnalité 1 — Sélection depuis le répertoire

### Ce qui manque dans ton idée
- Sur **Web** (PWA), l'API native `navigator.contacts` n'existe que sur Chrome Android. Sur iOS Safari, **impossible** sans Capacitor.
- Tu utilises Capacitor (`capacitor.config.json` présent) → on peut utiliser `@capacitor-community/contacts` pour iOS/Android natif.
- Il faut un **fallback manuel** propre quand l'API n'est pas dispo.
- Réutiliser la **validation E.164** déjà en place (`src/lib/phoneValidation.ts`) pour normaliser le numéro choisi.

### Implémentation
- Nouveau composant `ContactPickerButton` à côté du champ "Nom" dans la modale Dette.
- Détection runtime :
  - Si Capacitor natif → `Contacts.pickContact()` (iOS/Android)
  - Sinon si `'contacts' in navigator` → `navigator.contacts.select(['name','tel'])` (Chrome Android)
  - Sinon → bouton désactivé avec tooltip "Saisie manuelle uniquement sur ce navigateur"
- Au choix d'un contact, auto-remplir `person_name` + `whatsapp` (normalisé via `parsePhone` selon le pays du profil).
- Champs restent éditables manuellement après import.

---

## Fonctionnalité 2 — Modification de dette + historique

### Ce qui manque dans ton idée
- Pas de table d'historique → besoin d'une migration SQL pour `debt_history`.
- Quoi tracker exactement ? Modifications du **montant**, **échéance**, **motif**, **statut**, **paiements** (déjà dans `debt_payments`).
- Quand on **augmente** le montant (re-prêt à la même personne) → faut-il créer une nouvelle dette ou augmenter ? **Décision proposée** : bouton "Re-prêter" qui ouvre un dialog dédié et incrémente `amount` + log dans l'historique avec action `loan_increased`.
- Empêcher la modification si la dette est `paid` (ou demander confirmation).

### Implémentation
- **Migration SQL** : nouvelle table `debt_history` :
  ```
  id, debt_id, user_id, action (text: edit|loan_increased|status_change|payment|plan_change),
  field, old_value, new_value, note, created_at
  ```
  + RLS `auth.uid() = user_id` (PERMISSIVE).
- **Dialog "Modifier la dette"** (nouveau) — accessible via un bouton crayon sur chaque carte :
  - Champs : montant total, motif, échéance, WhatsApp, note
  - Au save : compare champ par champ, insère un row `debt_history` par champ modifié.
- **Bouton "Re-prêter"** (visible uniquement si `type = owed_to_me` et statut non `paid`) :
  - Demande montant additionnel + motif → `amount += X`, log `loan_increased`.
- **Section "Historique"** dans la carte dépliée (en plus de l'historique des paiements existant) : timeline mixant `debt_payments` + `debt_history` triés par date.

---

## Fonctionnalité 3 — Règlement par échéancier

### Ce qui manque dans ton idée
- Pas de structure pour stocker un plan d'échéances.
- Quel type d'échéancier ? **Proposé** : 2 modes
  1. **Auto** : nb_versements + fréquence (hebdo/bi-mensuel/mensuel) → génération auto des échéances calculées
  2. **Manuel** : l'utilisateur saisit chaque échéance (date + montant)
- Comment marquer une échéance payée ? → quand un `debt_payment` est enregistré, l'affecter automatiquement à la prochaine échéance non payée (FIFO), ou laisser l'utilisateur choisir.
- Notifications à l'approche d'une échéance (J-3) → réutiliser la table `notifications` existante.

### Implémentation
- **Migration SQL** : nouvelle table `debt_installments` :
  ```
  id, debt_id, user_id, due_date, expected_amount, paid_amount (default 0),
  status (pending|partial|paid|overdue), order_index, created_at
  ```
  + RLS PERMISSIVE.
- **Dans la modale création dette** : nouvel accordéon "Plan de remboursement" (optionnel) :
  - Toggle ON/OFF
  - Mode auto : `nb_versements` + `frequence` + `date_premier_versement` → preview des dates calculées
  - Mode manuel : ajout/suppression de lignes
- **Affectation automatique** : dans `handlePayment`, après insertion dans `debt_payments`, propager le montant aux échéances `pending` les plus anciennes (cascade FIFO) et mettre à jour leur statut.
- **Affichage carte dépliée** : barre de progression par échéance (vert payé, gris à venir, rouge en retard).
- **Cron / hook** : marquer `overdue` les échéances dont `due_date < now()` et `status != 'paid'` (à faire au fetch côté client pour rester simple, sans pg_cron).

---

## Détails techniques transverses

- **Types** : `src/integrations/supabase/types.ts` est auto-généré, ne pas l'éditer manuellement après les migrations.
- **Pays / format téléphone** : récupérer `country` depuis `profiles` pour passer à `parsePhone`.
- **Permissions Capacitor** : ajouter la permission contacts dans `capacitor.config.json` + `Info.plist` (NSContactsUsageDescription) et `AndroidManifest` (READ_CONTACTS) — mentionné mais l'utilisateur devra rebuild ses apps natives.
- **UX** : conserver la création "rapide" (sans plan) — l'échéancier reste **optionnel** pour ne pas alourdir le flux.

---

## Plan d'exécution (ordre)

1. Migration SQL : `debt_history` + `debt_installments` + RLS
2. Composant `ContactPickerButton` (Capacitor + Web Contacts API + fallback)
3. Refonte modale création dette : intégrer picker + accordéon échéancier
4. Nouveau dialog "Modifier la dette" + bouton "Re-prêter"
5. Logique d'affectation des paiements aux échéances
6. Carte dépliée enrichie : timeline historique + progression échéances
7. Mise à jour `capacitor.config.json` + permissions natives

Souhaites-tu qu'on parte sur cette base, ou veux-tu ajuster un point (par ex. retirer le mode "Re-prêter" et toujours créer une nouvelle dette à la place) ?
