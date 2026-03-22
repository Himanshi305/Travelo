CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  role ENUM('user', 'admin', 'vendor') NOT NULL DEFAULT 'user',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE Destination_Master (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  destination_name TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX destination_master_user_id_idx ON Destination_Master(user_id);

CREATE TABLE Hotel_Master (
  hotel_id BIGSERIAL PRIMARY KEY,
  hotel_name VARCHAR(255) NOT NULL,
  booking_id TEXT,
  address VARCHAR(500) NOT NULL,
  price_per_night NUMERIC(10, 2) DEFAULT 0,
  contact_no VARCHAR(30) DEFAULT '',
  rating NUMERIC(2, 1) DEFAULT 0
);

CREATE TABLE booking_details (
  booking_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  hotel_id TEXT NOT NULL REFERENCES Hotel_Master(hotel_id),
  checkin_date DATE NOT NULL,
  checkout_date DATE NOT NULL,
  guest_name TEXT NOT NULL,
  phone_no TEXT NOT NULL,
  email TEXT NOT NULL,
  amount DECIMAL(10, 2) NOT NULL
);

-- ===============================
-- SQL Migration: Convert existing booking_id to UUID
-- ===============================
-- Use this only if booking_details already exists with TEXT booking_id values (for example bk_xxxxx):
--
-- ALTER TABLE booking_details ADD COLUMN IF NOT EXISTS booking_id_uuid UUID DEFAULT gen_random_uuid();
--
-- UPDATE booking_details
-- SET booking_id_uuid = CASE
--   WHEN booking_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
--     THEN booking_id::UUID
--   ELSE gen_random_uuid()
-- END;
--
-- ALTER TABLE booking_details DROP CONSTRAINT IF EXISTS booking_details_pkey;
-- ALTER TABLE booking_details DROP COLUMN booking_id;
-- ALTER TABLE booking_details RENAME COLUMN booking_id_uuid TO booking_id;
-- ALTER TABLE booking_details ALTER COLUMN booking_id SET DEFAULT gen_random_uuid();
-- ALTER TABLE booking_details ADD CONSTRAINT booking_details_pkey PRIMARY KEY (booking_id);

-- ===============================
-- SQL Migration: Fix hotel_id type to support string IDs
-- ===============================
-- Run this on Supabase to convert existing BIGINT to TEXT:
--
-- ALTER TABLE booking_details DROP CONSTRAINT booking_details_hotel_fk;
-- ALTER TABLE booking_details ALTER COLUMN hotel_id TYPE TEXT USING hotel_id::TEXT;
-- ALTER TABLE booking_details ADD CONSTRAINT booking_details_hotel_fk FOREIGN KEY (hotel_id) REFERENCES Hotel_Master(hotel_id);
-- ALTER TABLE booking_details ADD COLUMN IF NOT EXISTS user_id UUID;
-- Backfill user_id for existing rows before setting NOT NULL, for example:
-- UPDATE booking_details bd
-- SET user_id = au.id
-- FROM auth.users au
-- WHERE bd.user_id IS NULL
--   AND lower(bd.email) = lower(au.email);
-- ALTER TABLE booking_details ALTER COLUMN user_id SET NOT NULL;
-- ALTER TABLE booking_details ADD CONSTRAINT booking_details_user_fk FOREIGN KEY (user_id) REFERENCES auth.users(id);

-- ===============================
-- SQL Migration: Isolate destinations by account (user_id)
-- ===============================
-- Run this on Supabase if Destination_Master already exists without user_id:
--
-- ALTER TABLE Destination_Master
-- ADD COLUMN IF NOT EXISTS user_id UUID;
--
-- Backfill existing rows if needed using a safe mapping strategy before NOT NULL.
-- Then enforce constraints:
-- ALTER TABLE Destination_Master
-- ALTER COLUMN user_id SET NOT NULL;
--
-- ALTER TABLE Destination_Master
-- ADD CONSTRAINT destination_master_user_fk
-- FOREIGN KEY (user_id) REFERENCES auth.users(id);
--
-- CREATE INDEX IF NOT EXISTS destination_master_user_id_idx ON Destination_Master(user_id);
