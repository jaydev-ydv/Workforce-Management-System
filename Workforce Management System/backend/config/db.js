const mysql = require("mysql2");
require("dotenv").config();

const pool = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "root",
  database: process.env.DB_NAME || "workforce",
  // Most free cloud MySQL providers (Aiven, etc.) require SSL.
  // Set DB_SSL=true in your environment variables when using one.
  ssl: process.env.DB_SSL === "true" ? { rejectUnauthorized: true } : undefined
});

module.exports = pool.promise();
