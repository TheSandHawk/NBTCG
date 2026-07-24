const path = require("node:path");
const fs = require("node:fs/promises");
const crypto = require("node:crypto");
const express = require("express");
const mysql = require("mysql2/promise");
const bcrypt = require("bcryptjs");
require("dotenv").config({ path: path.join(__dirname, ".env") });

const required = ["MYSQL_HOST", "MYSQL_DATABASE", "MYSQL_USER", "MYSQL_PASSWORD", "ADMIN_USERNAME", "ADMIN_PASSWORD_HASH"];
const missing = required.filter((name) => process.env[name] === undefined);
if (missing.length) throw new Error(`Missing environment variables: ${missing.join(", ")}`);

const app = express();
const production = process.env.NODE_ENV === "production";
const port = Number(process.env.PORT || 3000);
const sessions = new Map();
const pool = mysql.createPool({ host: process.env.MYSQL_HOST, port: Number(process.env.MYSQL_PORT || 3306), database: process.env.MYSQL_DATABASE, user: process.env.MYSQL_USER, password: process.env.MYSQL_PASSWORD, connectionLimit: 5, dateStrings: true });
app.use(express.json({ limit: "32kb" }));

function cookies(request) {
  return Object.fromEntries((request.headers.cookie || "").split(";").filter(Boolean).map((part) => {
    const index = part.indexOf("=");
    return [part.slice(0, index).trim(), decodeURIComponent(part.slice(index + 1))];
  }));
}
const isAdmin = (request) => sessions.has(cookies(request).nbtcg_session);
const requireAdmin = (request, response, next) => isAdmin(request) ? next() : response.status(401).json({ error: "Authentication required." });

app.get("/api/auth", (request, response) => response.json({ authenticated: isAdmin(request) }));
app.post("/api/auth", async (request, response) => {
  const { action, username, password } = request.body || {};
  if (action === "logout") {
    sessions.delete(cookies(request).nbtcg_session);
    response.clearCookie("nbtcg_session");
    return response.json({ authenticated: false });
  }
  if (action !== "login") return response.status(400).json({ error: "Invalid action." });
  const valid = username === process.env.ADMIN_USERNAME && await bcrypt.compare(String(password || ""), process.env.ADMIN_PASSWORD_HASH);
  if (!valid) return response.status(401).json({ error: "Invalid credentials." });
  const token = crypto.randomBytes(32).toString("hex");
  sessions.set(token, true);
  response.cookie("nbtcg_session", token, { httpOnly: true, sameSite: "lax", secure: process.env.SESSION_COOKIE_SECURE === "true", maxAge: 43200000 });
  return response.json({ authenticated: true });
});
app.get("/api/events", async (_request, response, next) => {
  try { const [events] = await pool.query("SELECT id, title, event_date AS date, TIME_FORMAT(event_time, '%H:%i') AS time, location, category, format, description FROM events ORDER BY event_date, event_time"); response.json(events); } catch (error) { next(error); }
});
app.post("/api/events", requireAdmin, async (request, response, next) => {
  const event = request.body || {};
  const title = String(event.title || "").trim(), date = String(event.date || ""), time = String(event.time || ""), category = String(event.category || "").trim();
  if (!title || title.length > 160 || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time) || !category) return response.status(422).json({ error: "Please provide a valid title, date, time, and category." });
  try { const [result] = await pool.execute("INSERT INTO events (title, event_date, event_time, location, category, format, description) VALUES (?, ?, ?, ?, ?, ?, ?)", [title, date, time, String(event.location || "").trim(), category, String(event.format || "").trim(), String(event.description || "").trim()]); response.status(201).json({ id: result.insertId }); } catch (error) { next(error); }
});
app.delete("/api/events/:id", requireAdmin, async (request, response, next) => {
  try { const [result] = await pool.execute("DELETE FROM events WHERE id = ?", [request.params.id]); response.json({ deleted: result.affectedRows === 1 }); } catch (error) { next(error); }
});
app.use((error, _request, response, _next) => { console.error(error); response.status(500).json({ error: "Server error." }); });

async function start() {
  try {
    const [[connection]] = await pool.query("SELECT DATABASE() AS database_name");
    console.log(`Connected to database: ${connection.database_name}`);
    const schema = await fs.readFile(path.join(__dirname, "database", "schema.sql"), "utf8");
    await pool.query(schema);
    console.log("Database schema is ready.");
  } catch (error) {
    console.error("Database migration failed:", error.message);
    process.exit(1);
  }
  if (production) {
    app.use(express.static(path.join(__dirname, "dist")));
    app.use((_request, response) => response.sendFile(path.join(__dirname, "dist", "index.html")));
  } else {
    const { createServer } = await import("vite");
    const vite = await createServer({ server: { middlewareMode: true }, appType: "spa" });
    app.use(vite.middlewares);
  }
  app.listen(port, () => console.log(`Northbound TCG running on http://127.0.0.1:${port}`));
}
start();
