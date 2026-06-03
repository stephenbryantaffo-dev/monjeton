
DELETE FROM public.caisse_invites WHERE token = 'e2e_token_1780509769';
DELETE FROM public.caisse_collaborators WHERE caisse_id = 'aee352f3-8a22-4d48-a8b3-26215474ca4e';
DELETE FROM public.tontines WHERE id = 'aee352f3-8a22-4d48-a8b3-26215474ca4e';
DELETE FROM auth.users WHERE email IN ('testa+1780509769@monjeton-test.app', 'testb+1780509769@monjeton-test.app');
