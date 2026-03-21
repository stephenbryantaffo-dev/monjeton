-- 1. Block any direct INSERT on user_roles by authenticated users
-- The handle_new_user trigger (SECURITY DEFINER) handles legitimate inserts
CREATE POLICY "Block direct role inserts"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (false);

-- 2. Block any DELETE on user_roles by authenticated users
CREATE POLICY "Block direct role deletes"
ON public.user_roles
FOR DELETE
TO authenticated
USING (false);

-- 3. Fix subscriptions: drop overly permissive UPDATE policy
DROP POLICY IF EXISTS "Users can update own subscription" ON public.subscriptions;

-- 4. No client-side UPDATE allowed on subscriptions
-- Subscription changes should only happen via server-side/webhook logic