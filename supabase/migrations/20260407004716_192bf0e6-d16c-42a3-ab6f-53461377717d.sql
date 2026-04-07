
CREATE TABLE public.savings_deposits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  savings_goal_id UUID NOT NULL REFERENCES public.savings_goals(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  wallet_id UUID REFERENCES public.wallets(id),
  amount NUMERIC NOT NULL,
  transaction_id UUID REFERENCES public.transactions(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.savings_deposits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users CRUD own savings_deposits" ON public.savings_deposits
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admin can view all savings_deposits" ON public.savings_deposits
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
