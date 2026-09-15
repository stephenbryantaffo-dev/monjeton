# Plan — Intégration du webhook Jèko (via MCP Jèko)

## Contexte / problème

Un utilisateur peut payer son abonnement (Pro / Ultra Pro) via les liens de paiement Jèko, mais l'accès aux fonctionnalités pro n'est pas activé automatiquement. Actuellement l'activation dépend entièrement de la fonction Supabase `jeko-webhook`, qui n'est jamais (ou pas fiablement) appelée par Jèko. Résultat : activation manuelle nécessaire à chaque paiement.

## État actuel du code (déjà en place)

| Fichier | Rôle |
|---|---|
| `supabase/functions/jeko-webhook/index.ts` | Endpoint qui reçoit le callback, vérifie une signature HMAC (header `jeko-signature`), matche l'utilisateur **par numéro de téléphone**, active la souscription dans `subscriptions`. |
| `supabase/functions/_shared/jeko-client.ts` | Client API Jèko (`api.jeko.africa/partner_api`), utilisé seulement pour lister les transactions (`listRecentTransactions`), pas pour créer des paiements. |
| `src/lib/jeko.ts` | Liens de paiement **statiques et partagés** (`pay.jeko.africa/pl/<id>`) — un lien par plan, identique pour tous les clients. |
| `supabase/functions/verify-payment/index.ts` | Lit simplement la table `subscriptions` côté frontend — dépend entièrement du webhook pour être à jour. |
| Table `jeko_payments` | Log de tous les paiements reçus, y compris ceux non matchés à un utilisateur (réconciliation manuelle). |

**Hypothèses de la cause racine** (à confirmer via le MCP) :
1. L'URL du webhook n'a jamais été déclarée côté Jèko (dashboard ou champ API).
2. Les liens de paiement **statiques** ne transmettent peut-être pas de webhook au même titre qu'une transaction créée dynamiquement via l'API avec une référence par utilisateur.
3. Le format du payload/signature attendu diffère de ce que le code vérifie actuellement (un commentaire dans le code note déjà une incohérence dans la doc : champs à la racine vs sous `.data`).
4. Le matching par numéro de téléphone est fragile (formats différents, faux négatifs) — indépendant du problème webhook mais aggrave l'impact.

## Contrainte d'environnement

Le MCP Jèko (`https://mcp.jeko.africa/mcp`) et la doc (`developer.jeko.africa`) sont **inaccessibles depuis cet environnement distant** (bloqués par la politique réseau). Toute la phase de diagnostic MCP doit donc se faire **en local**, dans VS Code / terminal, avec Claude Code (MCP déjà ajouté via `claude mcp add --scope user --transport http jeko https://mcp.jeko.africa/mcp`).

---

## Phase 1 — Diagnostic via le MCP Jèko (en local)

- [ ] **1.1** Lancer `/mcp__jeko__integrer_produit webhooks` et décrire le cas d'usage : paiement d'abonnement via lien de paiement, besoin d'un callback fiable pour activer l'accès pro.
- [ ] **1.2** Demander explicitement : *les liens de paiement statiques (`pay.jeko.africa/pl/...`) déclenchent-ils un webhook, ou faut-il créer une transaction par utilisateur via l'API pour recevoir un callback ?*
- [ ] **1.3** Récupérer la checklist officielle via `get_integration_checklist` pour le produit "webhooks" (et "lien de paiement" si distinct).
- [ ] **1.4** Clarifier via `search_docs` / `get_endpoint` :
  - Où/comment enregistrer l'URL de callback (dashboard marchand ? champ `webhookUrl` à la création du paiement ? configuration globale par magasin ?)
  - Le nom exact des champs du payload (racine vs `.data`), les types d'événements (`PaymentRequest`, autres statuts que `success`)
  - L'algorithme et le header de signature exacts (HMAC-SHA256 sur le header `jeko-signature` — à confirmer)
  - Le format du montant (centimes vs XOF direct)
- [ ] **1.5** Faire relire l'implémentation existante avec `/mcp__jeko__implementer_webhook javascript`, en donnant `supabase/functions/jeko-webhook/index.ts` comme code à valider via `validate_webhook`, et noter chaque écart signalé.
- [ ] **1.6** Vérifier s'il existe un moyen recommandé d'identifier l'utilisateur qui paie (référence/metadata personnalisée à la création du paiement) plutôt que le matching par téléphone.

**Livrable de cette phase** : réponses aux points ci-dessus, à ramener dans la session de travail sur le repo pour la phase 2.

---

## Phase 2 — Correctifs dans le repo (après validation des réponses)

- [ ] **2.1** Si nécessaire, migrer de liens de paiement statiques vers des **demandes de paiement créées via l'API par utilisateur**, avec une référence unique (ex. `user_id`) transmise à Jèko — via `jeko-client.ts`.
- [ ] **2.2** Enregistrer l'URL de callback côté Jèko selon la méthode confirmée (dashboard, ou paramètre dans l'appel API de création de paiement).
- [ ] **2.3** Corriger `jeko-webhook/index.ts` :
  - Aligner le parsing du payload sur le schéma confirmé (supprimer le fallback `.data ?? racine` si tranché)
  - Corriger la vérification de signature si le header/algorithme diffère
  - Remplacer/renforcer le matching utilisateur par la référence unique si disponible (garder le matching téléphone en fallback)
- [ ] **2.4** Adapter le frontend (`src/lib/jeko.ts`, `Subscribe.tsx`) si le flux passe par des paiements créés dynamiquement plutôt que des liens statiques.
- [ ] **2.5** Tester en conditions réelles sur un **magasin dédié aux tests** (pas d'environnement sandbox chez Jèko — chaque appel touche la prod), avec un petit montant.
- [ ] **2.6** Vérifier que les paiements non matchés continuent d'être loggés dans `jeko_payments` pour réconciliation manuelle en filet de sécurité.
- [ ] **2.7** Déployer la fonction Supabase mise à jour et surveiller les logs / la table `jeko_payments` sur les premiers paiements réels.

---

## Points de validation avant de démarrer l'implémentation

- [ ] Confirmer que la Phase 1 (diagnostic MCP) a été faite et les réponses obtenues
- [ ] Valider si on migre vers des paiements créés par API (impact sur le parcours utilisateur : redirection dynamique au lieu d'un lien statique)
- [ ] Valider le budget de test (paiements réels sur magasin de test = argent réel, même minime)
