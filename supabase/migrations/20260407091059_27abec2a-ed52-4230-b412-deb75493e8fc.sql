
-- Fix 1: Drop overly permissive brvm_cache policies
DROP POLICY "brvm_cache_insert_authenticated" ON public.brvm_cache;
DROP POLICY "brvm_cache_delete_authenticated" ON public.brvm_cache;

-- Fix 3: Add missing UPDATE policy on receipts storage bucket
CREATE POLICY "Users can update own receipts"
ON storage.objects FOR UPDATE
TO public
USING (bucket_id = 'receipts' AND auth.uid()::text = (storage.foldername(name))[1]);
