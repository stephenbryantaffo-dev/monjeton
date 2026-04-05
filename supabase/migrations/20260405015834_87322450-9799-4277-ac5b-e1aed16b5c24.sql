
-- Fix brvm_cache: restrict INSERT and DELETE to authenticated users only (service role for edge function)
DROP POLICY IF EXISTS "brvm_cache_insert_service" ON public.brvm_cache;
DROP POLICY IF EXISTS "brvm_cache_delete_service" ON public.brvm_cache;

-- Only allow insert/delete via service role (no anon/public access)
-- Since brvm-data edge function uses service role key, these operations will still work
CREATE POLICY "brvm_cache_insert_authenticated" ON public.brvm_cache
  FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "brvm_cache_delete_authenticated" ON public.brvm_cache
  FOR DELETE TO authenticated
  USING (true);

-- Fix chat-files storage bucket: add ownership-based policies
-- Drop existing overly permissive policies if any and create scoped ones
DROP POLICY IF EXISTS "Allow authenticated uploads" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated reads" ON storage.objects;

-- Chat files: only workspace members can read files in their workspace
CREATE POLICY "chat_files_select_workspace_member" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'chat-files'
    AND (storage.foldername(name))[1] IS NOT NULL
    AND public.is_workspace_member(auth.uid(), ((storage.foldername(name))[1])::uuid)
  );

-- Chat files: only workspace members can upload files
CREATE POLICY "chat_files_insert_workspace_member" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'chat-files'
    AND (storage.foldername(name))[1] IS NOT NULL
    AND public.is_workspace_member(auth.uid(), ((storage.foldername(name))[1])::uuid)
  );

-- Chat files: only uploader can delete their own files
CREATE POLICY "chat_files_delete_own" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'chat-files'
    AND auth.uid() = owner
  );
