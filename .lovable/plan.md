

# Fix All Security Warnings

Three warn-level security issues to resolve from the scan results.

## Issue 1: RLS Policy Always True on `brvm_cache` (x2 warnings)

The `brvm_cache` table has two overly permissive policies:
- `brvm_cache_insert_authenticated`: `WITH CHECK (true)` — any authenticated user can insert
- `brvm_cache_delete_authenticated`: `USING (true)` — any authenticated user can delete

**Context**: This table is only accessed by the `brvm-data` edge function using the service role key (which bypasses RLS). No client-side code touches this table.

**Fix**: Drop both permissive policies. The edge function uses `SUPABASE_SERVICE_ROLE_KEY` so it bypasses RLS entirely. No authenticated user should directly insert or delete cache rows.

```sql
DROP POLICY "brvm_cache_insert_authenticated" ON public.brvm_cache;
DROP POLICY "brvm_cache_delete_authenticated" ON public.brvm_cache;
```

## Issue 2: Leaked Password Protection Disabled

The HIBP (Have I Been Pwned) check is disabled. This allows users to sign up with passwords known to be compromised in data breaches.

**Fix**: Enable the leaked password protection via the auth configuration tool. This is a setting change, not a code change.

## Issue 3: Receipts Storage Bucket Lacks UPDATE Policy

The `receipts` storage bucket has SELECT, INSERT, and DELETE policies but no UPDATE policy, which could cause errors if file updates are attempted.

**Fix**: Add an UPDATE policy scoped to the owning user, matching the pattern of existing policies:

```sql
CREATE POLICY "Users can update own receipts"
ON storage.objects FOR UPDATE
TO public
USING (bucket_id = 'receipts' AND auth.uid()::text = (storage.foldername(name))[1]);
```

## Implementation Steps

1. Create a single database migration with all three SQL changes (drop 2 brvm_cache policies, add receipts storage UPDATE policy)
2. Enable leaked password protection via auth settings
3. Delete resolved security findings

## Files Changed
- New migration file only (no application code changes needed)

