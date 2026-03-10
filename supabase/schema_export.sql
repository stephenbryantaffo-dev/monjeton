-- ============================================================
-- MON JETON APP — Complete Schema Export
-- Generated: 2026-03-10
-- ============================================================

-- ======================== ENUMS ========================

CREATE TYPE public.app_role AS ENUM ('admin', 'user');
CREATE TYPE public.workspace_role AS ENUM ('owner', 'admin', 'accountant', 'member', 'viewer');

-- ======================== TABLES ========================

-- profiles
CREATE TABLE public.profiles (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  full_name text,
  email text,
  phone text,
  country text DEFAULT 'CI'::text,
  CONSTRAINT profiles_pkey PRIMARY KEY (id)
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- user_roles
CREATE TABLE public.user_roles (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role app_role NOT NULL DEFAULT 'user'::app_role,
  CONSTRAINT user_roles_pkey PRIMARY KEY (id),
  CONSTRAINT user_roles_user_id_role_key UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- wallets
CREATE TABLE public.wallets (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  initial_balance numeric NOT NULL DEFAULT 0,
  workspace_id uuid,
  wallet_name text NOT NULL,
  currency text NOT NULL DEFAULT 'XOF'::text,
  CONSTRAINT wallets_pkey PRIMARY KEY (id),
  CONSTRAINT wallets_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id)
);
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;

-- categories
CREATE TABLE public.categories (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  workspace_id uuid,
  name text NOT NULL,
  icon text,
  color text,
  type text NOT NULL,
  CONSTRAINT categories_pkey PRIMARY KEY (id),
  CONSTRAINT categories_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id)
);
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

-- transactions
CREATE TABLE public.transactions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  wallet_id uuid,
  category_id uuid,
  amount numeric NOT NULL,
  date date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamptz NOT NULL DEFAULT now(),
  original_amount numeric,
  converted_amount_xof numeric,
  exchange_rate_used numeric,
  conversion_date date,
  workspace_id uuid,
  created_by uuid,
  type text NOT NULL,
  note text,
  original_currency text DEFAULT 'XOF'::text,
  exchange_rate_source text,
  status text NOT NULL DEFAULT 'approved'::text,
  merchant_name text,
  CONSTRAINT transactions_pkey PRIMARY KEY (id),
  CONSTRAINT transactions_wallet_id_fkey FOREIGN KEY (wallet_id) REFERENCES public.wallets(id),
  CONSTRAINT transactions_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(id),
  CONSTRAINT transactions_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id)
);
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- budgets
CREATE TABLE public.budgets (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  month integer NOT NULL,
  year integer NOT NULL,
  total_budget numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT budgets_pkey PRIMARY KEY (id)
);
ALTER TABLE public.budgets ENABLE ROW LEVEL SECURITY;

-- category_budgets
CREATE TABLE public.category_budgets (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  category_id uuid NOT NULL,
  month integer NOT NULL,
  year integer NOT NULL,
  budget_amount numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT category_budgets_pkey PRIMARY KEY (id),
  CONSTRAINT category_budgets_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(id)
);
ALTER TABLE public.category_budgets ENABLE ROW LEVEL SECURITY;

-- savings_goals
CREATE TABLE public.savings_goals (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  target_amount numeric NOT NULL DEFAULT 0,
  current_amount numeric NOT NULL DEFAULT 0,
  deadline date,
  created_at timestamptz NOT NULL DEFAULT now(),
  name text NOT NULL,
  CONSTRAINT savings_goals_pkey PRIMARY KEY (id)
);
ALTER TABLE public.savings_goals ENABLE ROW LEVEL SECURITY;

-- debts
CREATE TABLE public.debts (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  amount numeric NOT NULL,
  due_date date,
  created_at timestamptz NOT NULL DEFAULT now(),
  type text NOT NULL,
  person_name text NOT NULL,
  status text NOT NULL DEFAULT 'pending'::text,
  note text,
  CONSTRAINT debts_pkey PRIMARY KEY (id)
);
ALTER TABLE public.debts ENABLE ROW LEVEL SECURITY;

-- tontines
CREATE TABLE public.tontines (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  contribution_amount numeric NOT NULL DEFAULT 0,
  start_date date NOT NULL DEFAULT CURRENT_DATE,
  members_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  name text NOT NULL,
  frequency text NOT NULL DEFAULT 'monthly'::text,
  CONSTRAINT tontines_pkey PRIMARY KEY (id)
);
ALTER TABLE public.tontines ENABLE ROW LEVEL SECURITY;

-- tontine_members
CREATE TABLE public.tontine_members (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  tontine_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  member_name text NOT NULL,
  member_phone text,
  CONSTRAINT tontine_members_pkey PRIMARY KEY (id),
  CONSTRAINT tontine_members_tontine_id_fkey FOREIGN KEY (tontine_id) REFERENCES public.tontines(id)
);
ALTER TABLE public.tontine_members ENABLE ROW LEVEL SECURITY;

-- tontine_payments
CREATE TABLE public.tontine_payments (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  tontine_id uuid NOT NULL,
  amount numeric NOT NULL DEFAULT 0,
  date date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'pending'::text,
  member_name text NOT NULL,
  CONSTRAINT tontine_payments_pkey PRIMARY KEY (id),
  CONSTRAINT tontine_payments_tontine_id_fkey FOREIGN KEY (tontine_id) REFERENCES public.tontines(id)
);
ALTER TABLE public.tontine_payments ENABLE ROW LEVEL SECURITY;

-- subscriptions
CREATE TABLE public.subscriptions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  price_xof numeric DEFAULT 2000,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'inactive'::text,
  stripe_customer_id text,
  stripe_subscription_id text,
  plan_name text DEFAULT 'Pro'::text,
  CONSTRAINT subscriptions_pkey PRIMARY KEY (id)
);
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- monthly_summaries
CREATE TABLE public.monthly_summaries (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  month integer NOT NULL,
  year integer NOT NULL,
  total_spent numeric DEFAULT 0,
  total_income numeric DEFAULT 0,
  estimated_savings numeric DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  assistant_summary text,
  CONSTRAINT monthly_summaries_pkey PRIMARY KEY (id)
);
ALTER TABLE public.monthly_summaries ENABLE ROW LEVEL SECURITY;

-- assistant_messages
CREATE TABLE public.assistant_messages (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  message_role text NOT NULL,
  content text NOT NULL,
  CONSTRAINT assistant_messages_pkey PRIMARY KEY (id)
);
ALTER TABLE public.assistant_messages ENABLE ROW LEVEL SECURITY;

-- receipt_scans
CREATE TABLE public.receipt_scans (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  parsed_amount numeric,
  parsed_date date,
  created_at timestamptz NOT NULL DEFAULT now(),
  parsed_original_amount numeric,
  parsed_converted_amount_xof numeric,
  parsed_exchange_rate_used numeric,
  scan_type text NOT NULL DEFAULT 'receipt'::text,
  image_url text,
  extracted_text text,
  parsed_merchant text,
  parsed_wallet text,
  parsed_type text,
  parsed_category text,
  status text NOT NULL DEFAULT 'pending'::text,
  parsed_currency text DEFAULT 'XOF'::text,
  parsed_exchange_rate_source text,
  CONSTRAINT receipt_scans_pkey PRIMARY KEY (id)
);
ALTER TABLE public.receipt_scans ENABLE ROW LEVEL SECURITY;

-- transaction_attachments
CREATE TABLE public.transaction_attachments (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  transaction_id uuid NOT NULL,
  workspace_id uuid,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  file_url text NOT NULL,
  file_type text NOT NULL DEFAULT 'image'::text,
  CONSTRAINT transaction_attachments_pkey PRIMARY KEY (id),
  CONSTRAINT transaction_attachments_transaction_id_fkey FOREIGN KEY (transaction_id) REFERENCES public.transactions(id),
  CONSTRAINT transaction_attachments_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id)
);
ALTER TABLE public.transaction_attachments ENABLE ROW LEVEL SECURITY;

-- workspaces
CREATE TABLE public.workspaces (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  name text NOT NULL,
  logo_url text,
  default_currency text NOT NULL DEFAULT 'XOF'::text,
  CONSTRAINT workspaces_pkey PRIMARY KEY (id)
);
ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;

-- workspace_members
CREATE TABLE public.workspace_members (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL,
  user_id uuid NOT NULL,
  role workspace_role NOT NULL DEFAULT 'member'::workspace_role,
  joined_at timestamptz NOT NULL DEFAULT now(),
  member_color text,
  display_name text NOT NULL,
  avatar_url text,
  CONSTRAINT workspace_members_pkey PRIMARY KEY (id),
  CONSTRAINT workspace_members_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id)
);
ALTER TABLE public.workspace_members ENABLE ROW LEVEL SECURITY;

-- workspace_invites
CREATE TABLE public.workspace_invites (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + '7 days'::interval),
  invite_code text NOT NULL DEFAULT encode(extensions.gen_random_bytes(6), 'hex'::text),
  invite_link_token text NOT NULL DEFAULT encode(extensions.gen_random_bytes(16), 'hex'::text),
  email text,
  status text NOT NULL DEFAULT 'active'::text,
  CONSTRAINT workspace_invites_pkey PRIMARY KEY (id),
  CONSTRAINT workspace_invites_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id)
);
ALTER TABLE public.workspace_invites ENABLE ROW LEVEL SECURITY;

-- workspace_chat_rooms
CREATE TABLE public.workspace_chat_rooms (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL,
  transaction_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  type text NOT NULL DEFAULT 'general'::text,
  CONSTRAINT workspace_chat_rooms_pkey PRIMARY KEY (id),
  CONSTRAINT workspace_chat_rooms_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id),
  CONSTRAINT workspace_chat_rooms_transaction_id_fkey FOREIGN KEY (transaction_id) REFERENCES public.transactions(id)
);
ALTER TABLE public.workspace_chat_rooms ENABLE ROW LEVEL SECURITY;

-- workspace_chat_messages
CREATE TABLE public.workspace_chat_messages (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL,
  workspace_id uuid NOT NULL,
  sender_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  message_type text NOT NULL DEFAULT 'text'::text,
  content text,
  file_url text,
  file_name text,
  sender_display_name text NOT NULL,
  sender_role text NOT NULL DEFAULT 'member'::text,
  CONSTRAINT workspace_chat_messages_pkey PRIMARY KEY (id),
  CONSTRAINT workspace_chat_messages_room_id_fkey FOREIGN KEY (room_id) REFERENCES public.workspace_chat_rooms(id),
  CONSTRAINT workspace_chat_messages_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id)
);
ALTER TABLE public.workspace_chat_messages ENABLE ROW LEVEL SECURITY;

-- workspace_notifications
CREATE TABLE public.workspace_notifications (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  read boolean NOT NULL DEFAULT false,
  type text NOT NULL,
  title text NOT NULL,
  body text NOT NULL DEFAULT ''::text,
  link text,
  CONSTRAINT workspace_notifications_pkey PRIMARY KEY (id),
  CONSTRAINT workspace_notifications_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id)
);
ALTER TABLE public.workspace_notifications ENABLE ROW LEVEL SECURITY;


-- ======================== FUNCTIONS ========================

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE OR REPLACE FUNCTION public.is_workspace_member(_user_id uuid, _workspace_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.workspace_members
    WHERE user_id = _user_id AND workspace_id = _workspace_id
  )
$$;

CREATE OR REPLACE FUNCTION public.has_workspace_role(_user_id uuid, _workspace_id uuid, _roles workspace_role[])
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.workspace_members
    WHERE user_id = _user_id AND workspace_id = _workspace_id AND role = ANY(_roles)
  )
$$;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, full_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', ''));
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user');
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.seed_default_categories()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.categories (user_id, name, icon, color, type) VALUES
    (NEW.id, 'Alimentation', 'Utensils', 'hsl(84,81%,44%)', 'expense'),
    (NEW.id, 'Transport', 'Car', 'hsl(270,70%,60%)', 'expense'),
    (NEW.id, 'Téléphone', 'Smartphone', 'hsl(45,96%,58%)', 'expense'),
    (NEW.id, 'Shopping', 'ShoppingBag', 'hsl(200,70%,50%)', 'expense'),
    (NEW.id, 'Factures', 'Zap', 'hsl(0,70%,55%)', 'expense'),
    (NEW.id, 'Santé', 'Heart', 'hsl(340,70%,55%)', 'expense'),
    (NEW.id, 'Loisirs', 'Music', 'hsl(180,60%,45%)', 'expense'),
    (NEW.id, 'Sport', 'Dumbbell', 'hsl(30,80%,50%)', 'expense'),
    (NEW.id, 'Salaire', 'Wallet', 'hsl(84,81%,44%)', 'income'),
    (NEW.id, 'Freelance', 'Briefcase', 'hsl(200,70%,50%)', 'income'),
    (NEW.id, 'Autre', 'MoreHorizontal', 'hsl(0,0%,60%)', 'expense');
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.seed_default_wallets()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.wallets (user_id, wallet_name) VALUES
    (NEW.id, 'Orange Money'),
    (NEW.id, 'MTN Mobile Money'),
    (NEW.id, 'Wave'),
    (NEW.id, 'Moov Money'),
    (NEW.id, 'Cash');
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_workspace_general_chat()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.workspace_chat_rooms (workspace_id, type) VALUES (NEW.id, 'general');
  INSERT INTO public.workspace_members (workspace_id, user_id, role, display_name)
    VALUES (NEW.id, NEW.created_by, 'owner', COALESCE(
      (SELECT full_name FROM public.profiles WHERE user_id = NEW.created_by), 'Owner'
    ));
  RETURN NEW;
END;
$$;


-- ======================== RLS POLICIES ========================

-- profiles
CREATE POLICY "Admin can view all profiles" ON public.profiles FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);

-- user_roles
CREATE POLICY "Admin can view all roles" ON public.user_roles FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);

-- wallets
CREATE POLICY "Admin can view all wallets" ON public.wallets FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users CRUD own wallets" ON public.wallets FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- categories
CREATE POLICY "Admin can view all categories" ON public.categories FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users CRUD own categories" ON public.categories FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- transactions
CREATE POLICY "Admin can view all transactions" ON public.transactions FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users CRUD own transactions" ON public.transactions FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- budgets
CREATE POLICY "Admin can view all budgets" ON public.budgets FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users CRUD own budgets" ON public.budgets FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- category_budgets
CREATE POLICY "Admin can view all category_budgets" ON public.category_budgets FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users CRUD own category_budgets" ON public.category_budgets FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- savings_goals
CREATE POLICY "Admin can view all savings" ON public.savings_goals FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users CRUD own savings" ON public.savings_goals FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- debts
CREATE POLICY "Admin can view all debts" ON public.debts FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users CRUD own debts" ON public.debts FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- tontines
CREATE POLICY "Admin can view all tontines" ON public.tontines FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users CRUD own tontines" ON public.tontines FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- tontine_members
CREATE POLICY "Admin can view all tontine_members" ON public.tontine_members FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users CRUD own tontine_members" ON public.tontine_members FOR ALL
  USING (EXISTS (SELECT 1 FROM tontines WHERE tontines.id = tontine_members.tontine_id AND tontines.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM tontines WHERE tontines.id = tontine_members.tontine_id AND tontines.user_id = auth.uid()));

-- tontine_payments
CREATE POLICY "Admin can view all tontine_payments" ON public.tontine_payments FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users CRUD own tontine_payments" ON public.tontine_payments FOR ALL
  USING (EXISTS (SELECT 1 FROM tontines WHERE tontines.id = tontine_payments.tontine_id AND tontines.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM tontines WHERE tontines.id = tontine_payments.tontine_id AND tontines.user_id = auth.uid()));

-- subscriptions
CREATE POLICY "Admin can view all subscriptions" ON public.subscriptions FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users can view own subscription" ON public.subscriptions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own subscription" ON public.subscriptions FOR UPDATE USING (auth.uid() = user_id);

-- monthly_summaries
CREATE POLICY "Admin can view all summaries" ON public.monthly_summaries FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users CRUD own summaries" ON public.monthly_summaries FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- assistant_messages
CREATE POLICY "Admin can view all messages" ON public.assistant_messages FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users CRUD own messages" ON public.assistant_messages FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- receipt_scans
CREATE POLICY "Admin can view all receipt_scans" ON public.receipt_scans FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users CRUD own receipt_scans" ON public.receipt_scans FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- transaction_attachments
CREATE POLICY "Members can view attachments" ON public.transaction_attachments FOR SELECT USING ((workspace_id IS NULL) OR is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "Members can add attachments" ON public.transaction_attachments FOR INSERT TO authenticated WITH CHECK ((workspace_id IS NULL) OR is_workspace_member(auth.uid(), workspace_id));

-- workspaces
CREATE POLICY "Authenticated users can create workspaces" ON public.workspaces FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Members can view own workspaces" ON public.workspaces FOR SELECT USING (is_workspace_member(auth.uid(), id));
CREATE POLICY "Owner/admin can update workspace" ON public.workspaces FOR UPDATE USING (has_workspace_role(auth.uid(), id, ARRAY['owner'::workspace_role, 'admin'::workspace_role]));
CREATE POLICY "Owner can delete workspace" ON public.workspaces FOR DELETE USING (has_workspace_role(auth.uid(), id, ARRAY['owner'::workspace_role]));

-- workspace_members
CREATE POLICY "Members can view workspace members" ON public.workspace_members FOR SELECT USING (is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "Owner/admin can manage members" ON public.workspace_members FOR INSERT TO authenticated WITH CHECK (has_workspace_role(auth.uid(), workspace_id, ARRAY['owner'::workspace_role, 'admin'::workspace_role]));
CREATE POLICY "Users can join workspace" ON public.workspace_members FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Owner/admin can update members" ON public.workspace_members FOR UPDATE USING (has_workspace_role(auth.uid(), workspace_id, ARRAY['owner'::workspace_role, 'admin'::workspace_role]));
CREATE POLICY "Owner/admin can remove members" ON public.workspace_members FOR DELETE USING (has_workspace_role(auth.uid(), workspace_id, ARRAY['owner'::workspace_role, 'admin'::workspace_role]));

-- workspace_invites
CREATE POLICY "Anyone can read invite by token" ON public.workspace_invites FOR SELECT USING (true);
CREATE POLICY "Members can view invites" ON public.workspace_invites FOR SELECT USING (is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "Owner/admin can create invites" ON public.workspace_invites FOR INSERT TO authenticated WITH CHECK (has_workspace_role(auth.uid(), workspace_id, ARRAY['owner'::workspace_role, 'admin'::workspace_role]));
CREATE POLICY "Owner/admin can update invites" ON public.workspace_invites FOR UPDATE USING (has_workspace_role(auth.uid(), workspace_id, ARRAY['owner'::workspace_role, 'admin'::workspace_role]));

-- workspace_chat_rooms
CREATE POLICY "Members can view chat rooms" ON public.workspace_chat_rooms FOR SELECT USING (is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "Members can create chat rooms" ON public.workspace_chat_rooms FOR INSERT TO authenticated WITH CHECK (is_workspace_member(auth.uid(), workspace_id));

-- workspace_chat_messages
CREATE POLICY "Members can view chat messages" ON public.workspace_chat_messages FOR SELECT USING (is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "Members can send messages" ON public.workspace_chat_messages FOR INSERT TO authenticated WITH CHECK (is_workspace_member(auth.uid(), workspace_id) AND auth.uid() = sender_id);

-- workspace_notifications
CREATE POLICY "Users can view own notifications" ON public.workspace_notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own notifications" ON public.workspace_notifications FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "System can create notifications" ON public.workspace_notifications FOR INSERT TO authenticated WITH CHECK (is_workspace_member(auth.uid(), workspace_id));


-- ======================== STORAGE BUCKETS ========================

-- INSERT INTO storage.buckets (id, name, public) VALUES ('receipts', 'receipts', false);
-- INSERT INTO storage.buckets (id, name, public) VALUES ('chat-files', 'chat-files', false);
-- INSERT INTO storage.buckets (id, name, public) VALUES ('workspace-logos', 'workspace-logos', true);
