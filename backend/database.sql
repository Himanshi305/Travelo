CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
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

CREATE TABLE Booking_Details (
  booking_id TEXT PRIMARY KEY,
  user_id TEXT,
  hotel_id TEXT NOT NULL,
  checkin_date DATE NOT NULL,
  checkout_date DATE NOT NULL,
  guest_name TEXT NOT NULL,
  phone_no TEXT NOT NULL
);
