const mysql = require("mysql2/promise");

function getDbPool() {
  const {
    DB_HOST,
    DB_PORT,
    DB_USER,
    DB_PASSWORD,
    DB_NAME,
    DB_CA_CERT,
  } = process.env;

  if (!DB_HOST || !DB_PORT || !DB_USER || !DB_PASSWORD || !DB_NAME) {
    throw new Error("Missing DB env vars: DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME");
  }

  const ssl =
    DB_CA_CERT && DB_CA_CERT.trim().length > 0
      ? { ca: DB_CA_CERT }
      : undefined;

  return mysql.createPool({
    host: DB_HOST,
    port: Number(DB_PORT),
    user: DB_USER,
    password: DB_PASSWORD,
    database: DB_NAME,
    ssl,
    waitForConnections: true,
    connectionLimit: 2,
  });
}

module.exports = { getDbPool };