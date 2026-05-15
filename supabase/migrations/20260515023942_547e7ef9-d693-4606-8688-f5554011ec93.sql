CREATE OR REPLACE FUNCTION public.seed_default_wallets()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.wallets (user_id, wallet_name) VALUES
    (NEW.id, 'Orange Money'),
    (NEW.id, 'MTN Mobile Money'),
    (NEW.id, 'Wave'),
    (NEW.id, 'Moov Money'),
    (NEW.id, 'Carte bancaire'),
    (NEW.id, 'Cash');
  RETURN NEW;
END;
$function$;

INSERT INTO public.wallets (user_id, wallet_name)
SELECT u.id, 'Carte bancaire'
FROM auth.users u
WHERE NOT EXISTS (
  SELECT 1 FROM public.wallets w
  WHERE w.user_id = u.id AND w.wallet_name = 'Carte bancaire'
);