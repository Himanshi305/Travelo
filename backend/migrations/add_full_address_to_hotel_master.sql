-- Run this in Supabase SQL editor for existing databases.
ALTER TABLE "Hotel_Master"
ADD COLUMN IF NOT EXISTS full_address VARCHAR(500) DEFAULT '';

-- Backfill full_address from existing address values.
UPDATE "Hotel_Master"
SET full_address = COALESCE(NULLIF(TRIM(address), ''), full_address)
WHERE COALESCE(NULLIF(TRIM(full_address), ''), '') = '';
