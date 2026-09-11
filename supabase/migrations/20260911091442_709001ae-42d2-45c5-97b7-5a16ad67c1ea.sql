ALTER TABLE public.jeko_payments
  ADD CONSTRAINT jeko_payments_txn_id_key UNIQUE (txn_id);

ALTER TABLE public.jeko_payments
  ADD COLUMN IF NOT EXISTS activated boolean NOT NULL DEFAULT false;