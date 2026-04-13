
-- Add storage_path column to receipt_scans
ALTER TABLE public.receipt_scans
  ADD COLUMN IF NOT EXISTS storage_path TEXT DEFAULT NULL;

-- Storage RLS policies for receipts bucket
-- Users can only access their own folder (userId/...)
CREATE POLICY "receipts_select_own"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'receipts'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "receipts_insert_own"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'receipts'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "receipts_update_own"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'receipts'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "receipts_delete_own"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'receipts'
  AND auth.uid()::text = (storage.foldername(name))[1]
);
