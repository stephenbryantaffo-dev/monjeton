
-- Add currency conversion columns to transactions
ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS original_amount numeric,
  ADD COLUMN IF NOT EXISTS original_currency text DEFAULT 'XOF',
  ADD COLUMN IF NOT EXISTS converted_amount_xof numeric,
  ADD COLUMN IF NOT EXISTS exchange_rate_used numeric,
  ADD COLUMN IF NOT EXISTS exchange_rate_source text,
  ADD COLUMN IF NOT EXISTS conversion_date date;

-- Add currency columns to receipt_scans
ALTER TABLE public.receipt_scans
  ADD COLUMN IF NOT EXISTS parsed_currency text DEFAULT 'XOF',
  ADD COLUMN IF NOT EXISTS parsed_original_amount numeric,
  ADD COLUMN IF NOT EXISTS parsed_converted_amount_xof numeric,
  ADD COLUMN IF NOT EXISTS parsed_exchange_rate_used numeric,
  ADD COLUMN IF NOT EXISTS parsed_exchange_rate_source text;
