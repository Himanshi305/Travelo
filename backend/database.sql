CREATE EXTENSION IF NOT EXISTS pgcrypto;

DROP TABLE IF EXISTS "Review_Master" CASCADE;
DROP TABLE IF EXISTS review_master CASCADE;
DROP TABLE IF EXISTS booking_details CASCADE;
DROP TABLE IF EXISTS "Hotel_Master" CASCADE;
DROP TABLE IF EXISTS "Destination_Master" CASCADE;

CREATE TABLE "Destination_Master" (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  destination_name TEXT NOT NULL,
  address TEXT DEFAULT '',
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX destination_master_user_id_idx ON "Destination_Master" (user_id);

CREATE TABLE "Hotel_Master" (
  hotel_id TEXT PRIMARY KEY,
  hotel_name VARCHAR(255) NOT NULL,
  booking_id TEXT,
  address VARCHAR(500) NOT NULL,
  full_address VARCHAR(500) DEFAULT '',
  local_address VARCHAR(255) DEFAULT '',
  state VARCHAR(120) DEFAULT '',
  pin_code VARCHAR(20) DEFAULT '',
  country VARCHAR(120) DEFAULT '',
  price_per_night FLOAT(10, 2) DEFAULT 0 CHECK (price_per_night >= 0),
  contact_no VARCHAR(30) DEFAULT '',
  gpay_id VARCHAR(120) DEFAULT '',
  rating NUMERIC(2, 1) DEFAULT 0 CHECK (rating >= 0 AND rating <= 5),
  hotel_url TEXT DEFAULT '',
  hotel_details TEXT DEFAULT '',
  hotel_image_url TEXT DEFAULT '',
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
-
CREATE TABLE booking_details (
  booking_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  hotel_id TEXT NOT NULL REFERENCES "Hotel_Master"(hotel_id) ON DELETE CASCADE,
  checkin_date DATE NOT NULL,
  checkout_date DATE NOT NULL,
  guest_name TEXT NOT NULL,
  phone_no TEXT NOT NULL,
  email TEXT NOT NULL,
  amount NUMERIC(10, 2) NOT NULL CHECK (amount >= 0),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT booking_checkout_after_checkin CHECK (checkout_date > checkin_date)
);

CREATE INDEX booking_details_user_id_idx ON booking_details(user_id);
CREATE INDEX booking_details_hotel_id_idx ON booking_details(hotel_id);

CREATE TABLE review_master (
  review_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id TEXT NOT NULL REFERENCES "Hotel_Master"(hotel_id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_email TEXT,
  comment TEXT NOT NULL,
  star SMALLINT NOT NULL CHECK (star BETWEEN 1 AND 5),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX review_master_hotel_id_idx ON review_master(hotel_id);
CREATE INDEX review_master_user_id_idx ON review_master(user_id);
