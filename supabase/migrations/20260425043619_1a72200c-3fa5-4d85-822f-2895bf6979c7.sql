-- 1. New columns on debts
ALTER TABLE public.debts ADD COLUMN IF NOT EXISTS motif TEXT DEFAULT NULL;
ALTER TABLE public.debts ADD COLUMN IF NOT EXISTS whatsapp TEXT DEFAULT NULL;
ALTER TABLE public.debts ADD COLUMN IF NOT EXISTS preuve_url TEXT DEFAULT NULL;
ALTER TABLE public.debts ADD COLUMN IF NOT EXISTS preuve_storage_path TEXT DEFAULT NULL;
ALTER TABLE public.debts ADD COLUMN IF NOT EXISTS date_echeance DATE DEFAULT NULL;

-- 2. Private storage bucket for debt proofs
INSERT INTO storage.buckets (id, name, public)
VALUES ('debt-proofs', 'debt-proofs', false)
ON CONFLICT (id) DO NOTHING;

-- 3. Storage policies: each user accesses only their own folder
CREATE POLICY "debt_proofs_select_own"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'debt-proofs' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "debt_proofs_insert_own"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'debt-proofs' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "debt_proofs_update_own"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'debt-proofs' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "debt_proofs_delete_own"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'debt-proofs' AND auth.uid()::text = (storage.foldername(name))[1]);