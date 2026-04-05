
-- Add new columns to existing receipts table
ALTER TABLE public.receipts 
  ADD COLUMN IF NOT EXISTS image_path text,
  ADD COLUMN IF NOT EXISTS items jsonb,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'pending';

-- Add check constraint for status
ALTER TABLE public.receipts 
  ADD CONSTRAINT receipts_status_check 
  CHECK (status IN ('pending', 'confirmed', 'archived'));

-- Rename columns for consistency
ALTER TABLE public.receipts RENAME COLUMN merchant TO merchant_name;
ALTER TABLE public.receipts RENAME COLUMN amount TO total_amount;
ALTER TABLE public.receipts RENAME COLUMN date TO receipt_date;

-- Set existing rows to confirmed
UPDATE public.receipts SET status = 'confirmed' WHERE status = 'pending';
