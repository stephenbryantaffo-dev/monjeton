CREATE TABLE public.pro_activation_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token text UNIQUE NOT NULL,
  email text NOT NULL,
  sale_id text,
  plan text NOT NULL DEFAULT 'pro',
  used boolean NOT NULL DEFAULT false,
  used_by_user_id uuid,
  used_at timestamptz,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.pro_activation_tokens TO service_role;

ALTER TABLE public.pro_activation_tokens ENABLE ROW LEVEL SECURITY;

-- Aucune policy pour anon/authenticated => tout accès client est bloqué.
-- service_role bypass RLS.

CREATE INDEX idx_pro_activation_tokens_email ON public.pro_activation_tokens (lower(email));
CREATE INDEX idx_pro_activation_tokens_sale_id ON public.pro_activation_tokens (sale_id);