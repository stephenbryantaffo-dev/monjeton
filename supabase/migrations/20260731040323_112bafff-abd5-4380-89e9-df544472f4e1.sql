UPDATE public.subscriptions
SET status = 'active',
    plan_name = 'Pro',
    price_xof = 2000,
    activated_at = now(),
    expires_at = now() + interval '30 days',
    grace_until = now() + interval '33 days',
    last_reminder_sent = NULL,
    updated_at = now()
WHERE user_id = '1996eb8c-3d6d-4cb5-b7ab-e91083becab6';