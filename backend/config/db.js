import mysql from "mysql2";

const connectDB = () => {
  const pool = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "travel_booking",
  port: process.env.DB_PORT || 3306,
});

  pool.getConnection((err, connection) => {
    if (err) {
      console.error("Database connection failed:", err);
    } else {
      console.log("Database connected successfully ✅");
      connection.release();
    }
  });

  return pool;
};

export default connectDB;