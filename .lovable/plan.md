# Accès Pro pour Paul Christian Djro (août + septembre 2026)

## Compte concerné

Deux comptes portent ce nom :

| Nom | Email | Activité |
|---|---|---|
| Paul Christian Djro | djropaulchristian@gmail.com | 80 transactions, dernière le 13/08/2026 |
| Paul Christian Isaac Jogues Djro | djropaulchristian19@gmail.com | aucune transaction |

C'est le premier compte (le seul actif) qui recevra l'accès Pro. Aucun des deux n'a aujourd'hui de ligne d'abonnement.

## Ce qui sera fait

Création d'un abonnement Pro actif pour ce compte, valable jusqu'à la fin septembre 2026 :

- Statut : actif
- Formule : Pro
- Début : aujourd'hui (13 août 2026)
- Fin : 30 septembre 2026 à 23h59 UTC
- Prix enregistré : 0 (accès offert)

L'utilisateur retrouvera immédiatement les fonctionnalités Pro (scans illimités, outils avancés) à sa prochaine ouverture de l'app.

## Détails techniques

- Insertion d'une ligne dans `public.subscriptions` pour `user_id = 9f79f3d4-3ad4-4363-abdb-066ab4362342` avec `status = 'active'`, `plan_name = 'Pro'`, `activated_at = now()`, `expires_at = '2026-09-30 23:59:59+00'`.
- La table est en RLS restrictive côté client (écriture interdite depuis l'app) : l'insertion se fait via une migration côté serveur.
- Aucun changement de code applicatif, aucune modification de schéma.
