
-- Transactions
CREATE INDEX IF NOT EXISTS idx_tx_user_date       ON public.transactions (user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_tx_user_type_date  ON public.transactions (user_id, type, date DESC);
CREATE INDEX IF NOT EXISTS idx_tx_user_cat        ON public.transactions (user_id, category_id);
CREATE INDEX IF NOT EXISTS idx_tx_user_wallet     ON public.transactions (user_id, wallet_id);

-- Receipts / receipt scans
CREATE INDEX IF NOT EXISTS idx_receipts_user_created      ON public.receipts (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_receipts_user_status       ON public.receipts (user_id, status);
CREATE INDEX IF NOT EXISTS idx_receipt_scans_user_created ON public.receipt_scans (user_id, created_at DESC);

-- Notifications
CREATE INDEX IF NOT EXISTS idx_notif_user_created ON public.notifications (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notif_user_unread  ON public.notifications (user_id) WHERE read = false;

-- Catégories, portefeuilles, budgets, épargne
CREATE INDEX IF NOT EXISTS idx_categories_user           ON public.categories (user_id);
CREATE INDEX IF NOT EXISTS idx_wallets_user              ON public.wallets (user_id);
CREATE INDEX IF NOT EXISTS idx_savings_goals_user        ON public.savings_goals (user_id);
CREATE INDEX IF NOT EXISTS idx_savings_deposits_goal     ON public.savings_deposits (savings_goal_id);
CREATE INDEX IF NOT EXISTS idx_savings_deposits_user     ON public.savings_deposits (user_id);
CREATE INDEX IF NOT EXISTS idx_category_budgets_user_ym  ON public.category_budgets (user_id, year, month);

-- Dettes
CREATE INDEX IF NOT EXISTS idx_debts_user             ON public.debts (user_id);
CREATE INDEX IF NOT EXISTS idx_debts_user_status      ON public.debts (user_id, status);
CREATE INDEX IF NOT EXISTS idx_debt_payments_debt     ON public.debt_payments (debt_id);
CREATE INDEX IF NOT EXISTS idx_debt_installments_debt ON public.debt_installments (debt_id, due_date);

-- Tontines / caisses
CREATE INDEX IF NOT EXISTS idx_tontine_members_tontine   ON public.tontine_members (tontine_id);
CREATE INDEX IF NOT EXISTS idx_tontine_payments_cycle    ON public.tontine_payments (cycle_id);
CREATE INDEX IF NOT EXISTS idx_tontine_payments_member   ON public.tontine_payments (member_id);
CREATE INDEX IF NOT EXISTS idx_caisse_collab_user        ON public.caisse_collaborators (user_id);
CREATE INDEX IF NOT EXISTS idx_caisse_cotisations_caisse ON public.caisse_cotisations (caisse_id);
CREATE INDEX IF NOT EXISTS idx_caisse_depenses_caisse    ON public.caisse_depenses (caisse_id);

-- Assistant chat
CREATE INDEX IF NOT EXISTS idx_assistant_msgs_conv_created ON public.assistant_messages (conversation_id, created_at);
CREATE INDEX IF NOT EXISTS idx_assistant_convs_user        ON public.assistant_conversations (user_id, last_message_at DESC);

-- Rate limits (hot path)
CREATE INDEX IF NOT EXISTS idx_rate_limits_user_ep_time ON public.rate_limits (user_id, endpoint, called_at DESC);
