-- Run this in Supabase SQL editor for existing databases.
ALTER TABLE "Hotel_Master"
ADD COLUMN IF NOT EXISTS full_address VARCHAR(500) DEFAULT '';

ALTER TABLE "Hotel_Master"
ADD COLUMN IF NOT EXISTS price_per_night NUMERIC(10, 2) DEFAULT 0;

ALTER TABLE "Hotel_Master"
ADD COLUMN IF NOT EXISTS contact_no VARCHAR(30) DEFAULT '';

ALTER TABLE "Hotel_Master"
ADD COLUMN IF NOT EXISTS gpay_id VARCHAR(120) DEFAULT '';

-- Backfill full_address from existing address values.
UPDATE "Hotel_Master"
SET
	full_address = COALESCE(NULLIF(TRIM(address), ''), full_address),
	price_per_night = COALESCE(price_per_night, 0),
	contact_no = COALESCE(contact_no, ''),
	gpay_id = COALESCE(gpay_id, '')
WHERE COALESCE(NULLIF(TRIM(full_address), ''), '') = ''
	 OR price_per_night IS NULL
	 OR contact_no IS NULL
	 OR gpay_id IS NULL;

DO $$
BEGIN
	IF NOT EXISTS (
		SELECT 1
		FROM pg_constraint
		WHERE conname = 'hotel_master_price_per_night_non_negative'
	) THEN
		ALTER TABLE "Hotel_Master"
		ADD CONSTRAINT hotel_master_price_per_night_non_negative CHECK (price_per_night >= 0);
	END IF;
END $$;
