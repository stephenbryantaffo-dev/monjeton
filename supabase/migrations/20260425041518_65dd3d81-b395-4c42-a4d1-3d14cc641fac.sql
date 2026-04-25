-- 1. New conversations table
CREATE TABLE public.assistant_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  title TEXT NOT NULL DEFAULT 'Nouvelle conversation',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_message_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_assistant_conversations_user ON public.assistant_conversations(user_id, last_message_at DESC);

ALTER TABLE public.assistant_conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users CRUD own conversations"
  ON public.assistant_conversations FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admin can view all conversations"
  ON public.assistant_conversations FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

-- 2. Add conversation_id to messages
ALTER TABLE public.assistant_messages
  ADD COLUMN conversation_id UUID;

CREATE INDEX idx_assistant_messages_conversation ON public.assistant_messages(conversation_id, created_at);

-- 3. Backfill: one conversation per user with existing messages
DO $$
DECLARE
  rec RECORD;
  new_conv_id UUID;
BEGIN
  FOR rec IN SELECT DISTINCT user_id FROM public.assistant_messages WHERE conversation_id IS NULL LOOP
    INSERT INTO public.assistant_conversations (user_id, title, last_message_at)
    VALUES (rec.user_id, 'Conversation initiale', now())
    RETURNING id INTO new_conv_id;

    UPDATE public.assistant_messages
    SET conversation_id = new_conv_id
    WHERE user_id = rec.user_id AND conversation_id IS NULL;
  END LOOP;
END $$;

-- 4. Make conversation_id NOT NULL going forward
ALTER TABLE public.assistant_messages
  ALTER COLUMN conversation_id SET NOT NULL;

-- 5. Trigger to bump last_message_at on the parent conversation
CREATE OR REPLACE FUNCTION public.bump_conversation_last_message()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.assistant_conversations
  SET last_message_at = NEW.created_at
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_bump_conversation_last_message
AFTER INSERT ON public.assistant_messages
FOR EACH ROW
EXECUTE FUNCTION public.bump_conversation_last_message();