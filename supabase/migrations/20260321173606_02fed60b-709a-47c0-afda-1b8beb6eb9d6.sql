CREATE POLICY "Profiles are created by trigger only"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());