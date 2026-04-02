CREATE TABLE public.brvm_cache (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  data jsonb NOT NULL DEFAULT '[]'::jsonb,
  fetched_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.brvm_cache ENABLE ROW LEVEL SECURITY;