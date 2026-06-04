DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.caisse_collaborators;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;