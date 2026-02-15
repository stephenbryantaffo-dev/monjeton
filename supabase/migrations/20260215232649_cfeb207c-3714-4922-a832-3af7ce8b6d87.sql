
-- workspaces
DROP POLICY IF EXISTS "Authenticated users can create workspaces" ON public.workspaces;
CREATE POLICY "Authenticated users can create workspaces"
  ON public.workspaces FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

-- workspace_members: Users can join
DROP POLICY IF EXISTS "Users can join workspace" ON public.workspace_members;
CREATE POLICY "Users can join workspace"
  ON public.workspace_members FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- workspace_members: Owner/admin can manage
DROP POLICY IF EXISTS "Owner/admin can manage members" ON public.workspace_members;
CREATE POLICY "Owner/admin can manage members"
  ON public.workspace_members FOR INSERT
  TO authenticated
  WITH CHECK (has_workspace_role(auth.uid(), workspace_id, ARRAY['owner'::workspace_role, 'admin'::workspace_role]));

-- workspace_invites
DROP POLICY IF EXISTS "Owner/admin can create invites" ON public.workspace_invites;
CREATE POLICY "Owner/admin can create invites"
  ON public.workspace_invites FOR INSERT
  TO authenticated
  WITH CHECK (has_workspace_role(auth.uid(), workspace_id, ARRAY['owner'::workspace_role, 'admin'::workspace_role]));

-- workspace_chat_rooms
DROP POLICY IF EXISTS "Members can create chat rooms" ON public.workspace_chat_rooms;
CREATE POLICY "Members can create chat rooms"
  ON public.workspace_chat_rooms FOR INSERT
  TO authenticated
  WITH CHECK (is_workspace_member(auth.uid(), workspace_id));

-- workspace_chat_messages
DROP POLICY IF EXISTS "Members can send messages" ON public.workspace_chat_messages;
CREATE POLICY "Members can send messages"
  ON public.workspace_chat_messages FOR INSERT
  TO authenticated
  WITH CHECK (is_workspace_member(auth.uid(), workspace_id) AND auth.uid() = sender_id);

-- workspace_notifications
DROP POLICY IF EXISTS "System can create notifications" ON public.workspace_notifications;
CREATE POLICY "System can create notifications"
  ON public.workspace_notifications FOR INSERT
  TO authenticated
  WITH CHECK (is_workspace_member(auth.uid(), workspace_id));

-- transaction_attachments
DROP POLICY IF EXISTS "Members can add attachments" ON public.transaction_attachments;
CREATE POLICY "Members can add attachments"
  ON public.transaction_attachments FOR INSERT
  TO authenticated
  WITH CHECK ((workspace_id IS NULL) OR is_workspace_member(auth.uid(), workspace_id));
