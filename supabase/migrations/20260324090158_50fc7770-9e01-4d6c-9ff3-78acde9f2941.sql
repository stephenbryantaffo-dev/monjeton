
CREATE TABLE public.daily_reminders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  date date NOT NULL DEFAULT CURRENT_DATE,
  reminded_at timestamptz NOT NULL DEFAULT now(),
  user_responded boolean NOT NULL DEFAULT false,
  transactions_count integer NOT NULL DEFAULT 0,
  UNIQUE (user_id, date)
);

ALTER TABLE public.daily_reminders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users CRUD own reminders"
  ON public.daily_reminders
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admin can view all reminders"
  ON public.daily_reminders
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));
