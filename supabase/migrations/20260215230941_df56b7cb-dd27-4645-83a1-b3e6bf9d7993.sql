
-- =============================================
-- ENTERPRISE MODE: Full Database Schema
-- =============================================

-- 1) Create workspace role enum
CREATE TYPE public.workspace_role AS ENUM ('owner', 'admin', 'accountant', 'member', 'viewer');

-- 2) Workspaces table
CREATE TABLE public.workspaces (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  logo_url text,
  default_currency text NOT NULL DEFAULT 'XOF',
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;

-- 3) Workspace members
CREATE TABLE public.workspace_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  role workspace_role NOT NULL DEFAULT 'member',
  display_name text NOT NULL,
  avatar_url text,
  member_color text,
  joined_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(workspace_id, user_id)
);
ALTER TABLE public.workspace_members ENABLE ROW LEVEL SECURITY;

-- 4) Workspace invites
CREATE TABLE public.workspace_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  invite_code text UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(6), 'hex'),
  invite_link_token text UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(16), 'hex'),
  email text,
  created_by uuid NOT NULL,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '7 days')
);
ALTER TABLE public.workspace_invites ENABLE ROW LEVEL SECURITY;

-- 5) Add workspace_id to existing tables
ALTER TABLE public.wallets ADD COLUMN IF NOT EXISTS workspace_id uuid REFERENCES public.workspaces(id) ON DELETE CASCADE;
ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS workspace_id uuid REFERENCES public.workspaces(id) ON DELETE CASCADE;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS workspace_id uuid REFERENCES public.workspaces(id) ON DELETE CASCADE;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'approved';
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS merchant_name text;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS created_by uuid;

-- 6) Transaction attachments
CREATE TABLE public.transaction_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id uuid NOT NULL REFERENCES public.transactions(id) ON DELETE CASCADE,
  workspace_id uuid REFERENCES public.workspaces(id) ON DELETE CASCADE,
  file_url text NOT NULL,
  file_type text NOT NULL DEFAULT 'image',
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.transaction_attachments ENABLE ROW LEVEL SECURITY;

-- 7) Chat rooms
CREATE TABLE public.workspace_chat_rooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  type text NOT NULL DEFAULT 'general',
  transaction_id uuid REFERENCES public.transactions(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.workspace_chat_rooms ENABLE ROW LEVEL SECURITY;

-- 8) Chat messages (workspace)
CREATE TABLE public.workspace_chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES public.workspace_chat_rooms(id) ON DELETE CASCADE,
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL,
  sender_display_name text NOT NULL,
  sender_role text NOT NULL DEFAULT 'member',
  message_type text NOT NULL DEFAULT 'text',
  content text,
  file_url text,
  file_name text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.workspace_chat_messages ENABLE ROW LEVEL SECURITY;

-- 9) Notifications
CREATE TABLE public.workspace_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  type text NOT NULL,
  title text NOT NULL,
  body text NOT NULL DEFAULT '',
  link text,
  read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.workspace_notifications ENABLE ROW LEVEL SECURITY;

-- =============================================
-- SECURITY DEFINER FUNCTIONS
-- =============================================

-- Check workspace membership
CREATE OR REPLACE FUNCTION public.is_workspace_member(_user_id uuid, _workspace_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.workspace_members
    WHERE user_id = _user_id AND workspace_id = _workspace_id
  )
$$;

-- Check workspace role
CREATE OR REPLACE FUNCTION public.has_workspace_role(_user_id uuid, _workspace_id uuid, _roles workspace_role[])
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.workspace_members
    WHERE user_id = _user_id AND workspace_id = _workspace_id AND role = ANY(_roles)
  )
$$;

-- =============================================
-- RLS POLICIES
-- =============================================

-- Workspaces: members can see their workspaces
CREATE POLICY "Members can view own workspaces" ON public.workspaces
  FOR SELECT USING (public.is_workspace_member(auth.uid(), id));
CREATE POLICY "Authenticated users can create workspaces" ON public.workspaces
  FOR INSERT WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Owner/admin can update workspace" ON public.workspaces
  FOR UPDATE USING (public.has_workspace_role(auth.uid(), id, ARRAY['owner','admin']::workspace_role[]));
CREATE POLICY "Owner can delete workspace" ON public.workspaces
  FOR DELETE USING (public.has_workspace_role(auth.uid(), id, ARRAY['owner']::workspace_role[]));

-- Workspace members
CREATE POLICY "Members can view workspace members" ON public.workspace_members
  FOR SELECT USING (public.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "Owner/admin can manage members" ON public.workspace_members
  FOR INSERT WITH CHECK (public.has_workspace_role(auth.uid(), workspace_id, ARRAY['owner','admin']::workspace_role[]));
CREATE POLICY "Owner/admin can update members" ON public.workspace_members
  FOR UPDATE USING (public.has_workspace_role(auth.uid(), workspace_id, ARRAY['owner','admin']::workspace_role[]));
CREATE POLICY "Owner/admin can remove members" ON public.workspace_members
  FOR DELETE USING (public.has_workspace_role(auth.uid(), workspace_id, ARRAY['owner','admin']::workspace_role[]));
-- Allow self-insert when joining via invite
CREATE POLICY "Users can join workspace" ON public.workspace_members
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Workspace invites
CREATE POLICY "Members can view invites" ON public.workspace_invites
  FOR SELECT USING (public.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "Owner/admin can create invites" ON public.workspace_invites
  FOR INSERT WITH CHECK (public.has_workspace_role(auth.uid(), workspace_id, ARRAY['owner','admin']::workspace_role[]));
CREATE POLICY "Owner/admin can update invites" ON public.workspace_invites
  FOR UPDATE USING (public.has_workspace_role(auth.uid(), workspace_id, ARRAY['owner','admin']::workspace_role[]));
CREATE POLICY "Anyone can read invite by token" ON public.workspace_invites
  FOR SELECT USING (true);

-- Transaction attachments
CREATE POLICY "Members can view attachments" ON public.transaction_attachments
  FOR SELECT USING (
    workspace_id IS NULL OR public.is_workspace_member(auth.uid(), workspace_id)
  );
CREATE POLICY "Members can add attachments" ON public.transaction_attachments
  FOR INSERT WITH CHECK (
    workspace_id IS NULL OR public.is_workspace_member(auth.uid(), workspace_id)
  );

-- Chat rooms
CREATE POLICY "Members can view chat rooms" ON public.workspace_chat_rooms
  FOR SELECT USING (public.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "Members can create chat rooms" ON public.workspace_chat_rooms
  FOR INSERT WITH CHECK (public.is_workspace_member(auth.uid(), workspace_id));

-- Chat messages
CREATE POLICY "Members can view chat messages" ON public.workspace_chat_messages
  FOR SELECT USING (public.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "Members can send messages" ON public.workspace_chat_messages
  FOR INSERT WITH CHECK (public.is_workspace_member(auth.uid(), workspace_id) AND auth.uid() = sender_id);

-- Notifications
CREATE POLICY "Users can view own notifications" ON public.workspace_notifications
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own notifications" ON public.workspace_notifications
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "System can create notifications" ON public.workspace_notifications
  FOR INSERT WITH CHECK (public.is_workspace_member(auth.uid(), workspace_id));

-- =============================================
-- REALTIME
-- =============================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.workspace_chat_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.workspace_notifications;

-- =============================================
-- STORAGE BUCKETS
-- =============================================
INSERT INTO storage.buckets (id, name, public) VALUES ('chat-files', 'chat-files', false) ON CONFLICT DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('workspace-logos', 'workspace-logos', true) ON CONFLICT DO NOTHING;

-- Storage policies for chat-files
CREATE POLICY "Workspace members can upload chat files" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'chat-files' AND auth.role() = 'authenticated');
CREATE POLICY "Workspace members can view chat files" ON storage.objects
  FOR SELECT USING (bucket_id = 'chat-files' AND auth.role() = 'authenticated');

-- Storage policies for workspace-logos
CREATE POLICY "Anyone can view workspace logos" ON storage.objects
  FOR SELECT USING (bucket_id = 'workspace-logos');
CREATE POLICY "Authenticated users can upload workspace logos" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'workspace-logos' AND auth.role() = 'authenticated');

-- =============================================
-- AUTO-CREATE GENERAL CHAT ROOM ON WORKSPACE CREATION
-- =============================================
CREATE OR REPLACE FUNCTION public.create_workspace_general_chat()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.workspace_chat_rooms (workspace_id, type) VALUES (NEW.id, 'general');
  INSERT INTO public.workspace_members (workspace_id, user_id, role, display_name)
    VALUES (NEW.id, NEW.created_by, 'owner', COALESCE(
      (SELECT full_name FROM public.profiles WHERE user_id = NEW.created_by), 'Owner'
    ));
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_workspace_created
  AFTER INSERT ON public.workspaces
  FOR EACH ROW
  EXECUTE FUNCTION public.create_workspace_general_chat();
