
CREATE TABLE IF NOT EXISTS public.receipts (
  id              UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id         UUID NOT NULL,
  image_base64    TEXT NULL,
  amount          DECIMAL(18,2) NULL,
  currency        TEXT DEFAULT 'XOF',
  merchant        TEXT NULL,
  date            DATE NULL,
  category        TEXT NULL,
  type            TEXT DEFAULT 'expense',
  wallet          TEXT NULL,
  raw_data        JSONB NULL,
  transaction_id  UUID NULL REFERENCES public.transactions(id) ON DELETE SET NULL,
  note            TEXT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.receipts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "receipts_select_own" ON public.receipts
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "receipts_insert_own" ON public.receipts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "receipts_update_own" ON public.receipts
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "receipts_delete_own" ON public.receipts
  FOR DELETE USING (auth.uid() = user_id);
