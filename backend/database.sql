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
  destination_name TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE Hotel_Master (
  hotel_id BIGSERIAL PRIMARY KEY,
  hotel_name VARCHAR(255) NOT NULL,
  booking_id TEXT,
  address VARCHAR(500) NOT NULL,
  price_per_night NUMERIC(10, 2) DEFAULT 0,
  contact_no VARCHAR(30) DEFAULT '',
  rating NUMERIC(2, 1) DEFAULT 0
);

CREATE TABLE Booking_Details (
  booking_id TEXT PRIMARY KEY,
  hotel_id BIGINT NOT NULL REFERENCES Hotel_Master(hotel_id),
  checkin_date DATE NOT NULL,
  checkout_date DATE NOT NULL,
  guest_name TEXT NOT NULL,
  phone_no TEXT NOT NULL,
  email TEXT NOT NULL,
  amount DECIMAL(10, 2) NOT NULL
);
