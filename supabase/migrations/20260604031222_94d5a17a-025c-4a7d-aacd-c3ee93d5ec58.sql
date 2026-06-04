DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'tontine_payments'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.tontine_payments;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'tontine_members'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.tontine_members;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'tontine_expenses'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.tontine_expenses;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'tontine_cycles'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.tontine_cycles;
  END IF;
END $$;