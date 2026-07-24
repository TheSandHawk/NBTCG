const fs = require("node:fs/promises");
const path = require("node:path");
const mysql = require("mysql2/promise");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const required = ["MYSQL_HOST", "MYSQL_DATABASE", "MYSQL_USER", "MYSQL_PASSWORD"];
const missing = required.filter((name) => process.env[name] === undefined);
if (missing.length) throw new Error(`Missing environment variables: ${missing.join(", ")}`);

async function migrate() {
  const schema = await fs.readFile(path.join(__dirname, "..", "database", "schema.sql"), "utf8");
  const connection = await mysql.createConnection({
    host: process.env.MYSQL_HOST,
    port: Number(process.env.MYSQL_PORT || 3306),
    database: process.env.MYSQL_DATABASE,
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    multipleStatements: true,
  });
  await connection.query(schema);
  await connection.end();
  console.log("Database schema is ready.");
}

migrate().catch((error) => {
  console.error("Database migration failed:", error.message);
  process.exit(1);
});
