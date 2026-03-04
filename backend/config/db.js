import mysql from "mysql2";

const connectDB = () => {
  const pool = mysql.createPool({
    host: "localhost",
    user: "root",
    password: "your_mysql_password",  // change this
    database: "travel_companion",
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
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