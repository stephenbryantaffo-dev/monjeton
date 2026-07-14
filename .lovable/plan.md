## Objectif
Préparer Mon Jeton à supporter 100 000+ utilisateurs actifs sans dégradation de performance, en 4 chantiers priorisés du plus impactant au plus long. Aucun changement fonctionnel visible côté user.

## Constat (audit db_health + slow_queries)
- Instance actuelle : mémoire déjà à 53 % avec seulement 226 users.
- Aucun index composite sur les tables chaudes → les lectures RLS scannent en séquentiel.
- Requêtes les plus coûteuses aujourd'hui :
  1. `transactions` par `(user_id, type, date)` — 1617 appels, 7,1 s cumulés.
  2. `rate_limits` inserts — 973 appels, 5,3 s cumulés (pas d'index).
  3. `category_budgets` par `(user_id, month, year)` — 3054 appels, 3 s cumulés.
- `receipts`, `notifications`, `wallets`, `categories`, `savings_deposits`, `tontine_payments`, `caisse_cotisations`, `caisse_depenses` n'ont **que** l'index PK.

---

## Chantier 1 — Index composites sur les tables chaudes (migration SQL)

Ajout d'index B-tree ciblés sur les patterns exacts observés dans `slow_queries`. Aucun `CONCURRENTLY` (interdit en migration). Chaque `CREATE INDEX IF NOT EXISTS` est idempotent.

```
-- Transactions : filtres user_id + date, user_id + type + date
CREATE INDEX IF NOT EXISTS idx_tx_user_date       ON public.transactions (user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_tx_user_type_date  ON public.transactions (user_id, type, date DESC);
CREATE INDEX IF NOT EXISTS idx_tx_user_cat        ON public.transactions (user_id, category_id);
CREATE INDEX IF NOT EXISTS idx_tx_user_wallet     ON public.transactions (user_id, wallet_id);

-- Receipts / scans
CREATE INDEX IF NOT EXISTS idx_receipts_user_date       ON public.receipts (user_id, transaction_date DESC);
CREATE INDEX IF NOT EXISTS idx_receipt_scans_user_created ON public.receipt_scans (user_id, created_at DESC);

-- Notifications (feed + lecture)
CREATE INDEX IF NOT EXISTS idx_notif_user_created  ON public.notifications (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notif_user_unread   ON public.notifications (user_id) WHERE read = false;

-- Portefeuilles / catégories / objectifs
CREATE INDEX IF NOT EXISTS idx_categories_user ON public.categories (user_id);
CREATE INDEX IF NOT EXISTS idx_wallets_user    ON public.wallets (user_id);
CREATE INDEX IF NOT EXISTS idx_savings_goals_user      ON public.savings_goals (user_id);
CREATE INDEX IF NOT EXISTS idx_savings_deposits_goal   ON public.savings_deposits (goal_id);
CREATE INDEX IF NOT EXISTS idx_category_budgets_user_m ON public.category_budgets (user_id, year, month);

-- Dettes
CREATE INDEX IF NOT EXISTS idx_debts_user           ON public.debts (user_id);
CREATE INDEX IF NOT EXISTS idx_debts_user_status    ON public.debts (user_id, status);
CREATE INDEX IF NOT EXISTS idx_debt_payments_debt   ON public.debt_payments (debt_id);
CREATE INDEX IF NOT EXISTS idx_debt_installments_debt ON public.debt_installments (debt_id, due_date);

-- Tontines / caisses
CREATE INDEX IF NOT EXISTS idx_tontine_members_tontine ON public.tontine_members (tontine_id);
CREATE INDEX IF NOT EXISTS idx_tontine_payments_cycle  ON public.tontine_payments (cycle_id);
CREATE INDEX IF NOT EXISTS idx_tontine_payments_member ON public.tontine_payments (member_id);
CREATE INDEX IF NOT EXISTS idx_caisse_collab_user      ON public.caisse_collaborators (user_id);
CREATE INDEX IF NOT EXISTS idx_caisse_cotisations_caisse ON public.caisse_cotisations (caisse_id);
CREATE INDEX IF NOT EXISTS idx_caisse_depenses_caisse    ON public.caisse_depenses (caisse_id);

-- Rate limits (hot writes/reads)
CREATE INDEX IF NOT EXISTS idx_rate_limits_user_ep_time ON public.rate_limits (user_id, endpoint, called_at DESC);

-- Assistant chat
CREATE INDEX IF NOT EXISTS idx_assistant_msgs_conv_created ON public.assistant_messages (conversation_id, created_at);
CREATE INDEX IF NOT EXISTS idx_assistant_convs_user        ON public.assistant_conversations (user_id, last_message_at DESC);
```

Vérification post-migration : re-lancer `slow_queries` sur 3-4 requêtes clés et confirmer un `Index Scan` via `EXPLAIN`.

---

## Chantier 2 — Hygiène côté client (limiter le volume lu)

Le vrai risque à 100k users n'est pas la BDD mais le **volume renvoyé par requête**. Actions :

1. **Ajouter `.limit()` explicite** partout où on lit `transactions`, `receipts`, `notifications`, `assistant_messages`, `debt_history`. Aujourd'hui plusieurs pages font `select("*")` sans limite (déjà limité pour Reports à 1000 — étendre à toutes les pages).
2. **Paginer** l'historique des transactions (Transactions.tsx) : range 50 par page, chargement à la demande. On garde déjà les filtres existants.
3. **Réduire la sélection de colonnes** sur les listes : ne plus faire `select("*")` sur `transactions` quand seul un aperçu s'affiche (dashboard, listes). Sélectionner colonne par colonne.
4. **Retirer `count: 'exact'`** dans les listes non critiques (coûteux : full scan avec RLS). Utiliser `count: 'estimated'` quand disponible.
5. **Cache React Query** : passer `staleTime` à 60 s sur les listes (catégories, wallets, budgets) qui ne changent pas fréquemment. Aujourd'hui la plupart n'utilisent pas de cache → refetch systématique.

Fichiers concernés (audit rapide, sans exhaustivité) :
- `src/pages/Transactions.tsx`, `src/pages/Dashboard.tsx`, `src/pages/Receipts.tsx`, `src/pages/Reports.tsx`, `src/pages/Debts.tsx`, `src/pages/Assistant.tsx`, `src/pages/Notifications` (si existe), `src/components/DashboardTontineWidget.tsx`.

---

## Chantier 3 — Realtime & Edge functions

1. **Auditer les `supabase.channel(...)`** ouverts par l'app. À 100k users chaque channel = une connexion websocket permanente. Règle : n'ouvrir un canal que sur la page où il est visible (unmount → close), et scope minimal (`.filter('user_id=eq.<uid>')`).
2. **Edge functions** :
   - Toutes utilisent déjà `fetch` natif + JWT en code (bien). Vérifier que `chat` (streaming) ferme correctement l'upstream à `abort`.
   - `subscription-reminders`, `send-daily-reminders` : ajouter un `LIMIT` sur les batchs pour éviter un fan-out sur 100k users en une exécution — traiter par pages de 5 000.
3. **Rate limiting** : la table `rate_limits` grossit vite. Le job `cleanup_rate_limits` existe déjà (24 h) — s'assurer qu'il tourne bien via pg_cron. Sinon, ajouter la planification.

---

## Chantier 4 — Infrastructure & monitoring

1. **Compute** : rester sur le size actuel jusqu'à ~2 000 users actifs, puis proposer un `resize_compute` (outil disponible). Documenter le seuil : dès que `db_health` montre mémoire > 75 % ou connexions > 70 % en pointe.
2. **Ajouter un dashboard admin léger** : query `n_live_tup` + `pg_stat_activity` count pour surveiller la croissance des tables et la saturation.
3. **Storage** : les buckets `receipts` et `debt-proofs` sont privés (OK). Vérifier que les uploads passent bien par upload signé et pas par un `INSERT` public.
4. **Frontend** :
   - Vérifier que le build Vite produit des chunks < 300 kB (déjà fait via `manualChunks` dans mem "Reliability & Performance").
   - Preload de l'image LCP de la landing.
   - Service worker : durcir la stratégie `stale-while-revalidate` sur les assets statiques.

---

## Livrables par chantier

| Chantier | Effort | Impact perf | Bloque ? |
| --- | --- | --- | --- |
| 1. Index BDD | 1 migration | **Très élevé** | Non — 100 % rétro-compat |
| 2. Limites & cache client | 6–8 fichiers | Élevé | Non |
| 3. Realtime + edge batch | 3–4 fichiers | Moyen | Non |
| 4. Compute + monitoring | Doc + tool call plus tard | Élevé quand la charge monte | Non |

## Question avant d'implémenter

Je propose d'exécuter **Chantier 1 (index BDD) en premier** — c'est le gain immédiat, zéro risque fonctionnel, une seule migration. Puis Chantier 2 dans une deuxième passe.

Confirme-moi si :
- (a) **je fais tout d'un coup** (chantiers 1 → 2 → 3 dans ce message),
- (b) **je fais Chantier 1 seul** maintenant et on enchaîne après validation,
- (c) tu veux **ajuster/prioriser** différemment (par ex. attaquer d'abord la pagination Transactions ou l'upgrade compute).
