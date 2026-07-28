const path = require("node:path");
const fs = require("node:fs/promises");
const crypto = require("node:crypto");
const express = require("express");
const mysql = require("mysql2/promise");
const bcrypt = require("bcryptjs");
const multer = require("multer");
require("dotenv").config({ path: path.join(__dirname, ".env") });

const required = ["MYSQL_HOST", "MYSQL_DATABASE", "MYSQL_USER", "MYSQL_PASSWORD", "ADMIN_USERNAME", "ADMIN_PASSWORD_HASH"];
const missing = required.filter((name) => process.env[name] === undefined);
if (missing.length) throw new Error(`Missing environment variables: ${missing.join(", ")}`);

const app = express();
const production = process.env.NODE_ENV === "production";
const port = Number(process.env.PORT || 3000);
const sessions = new Map();
const uploadDirectory = path.join(__dirname, "uploads", "team");
const pool = mysql.createPool({ host: process.env.MYSQL_HOST, port: Number(process.env.MYSQL_PORT || 3306), database: process.env.MYSQL_DATABASE, user: process.env.MYSQL_USER, password: process.env.MYSQL_PASSWORD, connectionLimit: 5, dateStrings: true, multipleStatements: true });
app.use(express.json({ limit: "32kb" }));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

function cookies(request) {
  return Object.fromEntries((request.headers.cookie || "").split(";").filter(Boolean).map((part) => {
    const index = part.indexOf("=");
    return [part.slice(0, index).trim(), decodeURIComponent(part.slice(index + 1))];
  }));
}
const isAdmin = (request) => sessions.has(cookies(request).nbtcg_session);
const requireAdmin = (request, response, next) => isAdmin(request) ? next() : response.status(401).json({ error: "Authentication required." });
const upload = multer({
  storage: multer.diskStorage({
    destination: (_request, _file, callback) => callback(null, uploadDirectory),
    filename: (_request, file, callback) => callback(null, `${crypto.randomUUID()}${path.extname(file.originalname).toLowerCase()}`),
  }),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter: (_request, file, callback) => callback(null, ["image/jpeg", "image/png", "image/webp"].includes(file.mimetype)),
});
const uploadedTeamImage = (value) => String(value || "").startsWith("/uploads/team/");
const deleteUploadedTeamImage = async (value) => {
  if (!uploadedTeamImage(value)) return;
  await fs.unlink(path.join(uploadDirectory, path.basename(value))).catch(() => {});
};
const validImageFile = async (file) => {
  const header = await fs.readFile(file.path, { encoding: null }).then((buffer) => buffer.subarray(0, 12));
  const isJpeg = header[0] === 0xff && header[1] === 0xd8 && header[2] === 0xff;
  const isPng = header.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  const isWebp = header.subarray(0, 4).toString() === "RIFF" && header.subarray(8, 12).toString() === "WEBP";
  return isJpeg || isPng || isWebp;
};

app.get("/api/auth", (request, response) => response.json({ authenticated: isAdmin(request) }));
app.get("/api/health", async (_request, response) => {
  try {
    const [[connection]] = await pool.query("SELECT DATABASE() AS database_name");
    response.json({ databaseConnected: true, database: connection.database_name });
  } catch (_error) {
    response.status(500).json({ databaseConnected: false });
  }
});
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
app.get("/api/team-members", async (_request, response, next) => {
  try { const [members] = await pool.query("SELECT id, name, role, bio, image_url AS imageUrl, instagram_url AS instagramUrl, sort_order AS sortOrder FROM team_members ORDER BY sort_order, name"); response.json(members); } catch (error) { next(error); }
});
const validMember = (member) => {
  const name = String(member.name || "").trim(), role = String(member.role || "").trim(), bio = String(member.bio || "").trim();
  const imageUrl = String(member.imageUrl || "").trim(), instagramUrl = String(member.instagramUrl || "").trim();
  const sortOrder = Number(member.sortOrder);
  const validUrl = (value) => !value || uploadedTeamImage(value) || (() => { try { return new URL(value).protocol === "https:"; } catch { return false; } })();
  const validInstagram = !instagramUrl || /^https:\/\/(www\.)?instagram\.com\//i.test(instagramUrl);
  return name && name.length <= 80 && role.length <= 80 && bio && bio.length <= 2000 && imageUrl.length <= 2048 && instagramUrl.length <= 2048 && validUrl(imageUrl) && validInstagram && Number.isInteger(sortOrder) && sortOrder >= 0 ? { name, role, bio, imageUrl, instagramUrl, sortOrder } : null;
};
app.post("/api/uploads/team-image", requireAdmin, upload.single("image"), async (request, response, next) => {
  if (!request.file) return response.status(422).json({ error: "Please select a JPG, PNG, or WebP image up to 5 MB." });
  try {
    if (!await validImageFile(request.file)) {
      await fs.unlink(request.file.path).catch(() => {});
      return response.status(422).json({ error: "The uploaded file is not a valid JPG, PNG, or WebP image." });
    }
    response.status(201).json({ imageUrl: `/uploads/team/${request.file.filename}` });
  } catch (error) { next(error); }
});
app.post("/api/team-members", requireAdmin, async (request, response, next) => {
  const member = validMember(request.body || {});
  if (!member) return response.status(422).json({ error: "Please provide a valid name, role, bio, and display order." });
  try { const [result] = await pool.execute("INSERT INTO team_members (name, role, bio, image_url, instagram_url, sort_order) VALUES (?, ?, ?, ?, ?, ?)", [member.name, member.role, member.bio, member.imageUrl, member.instagramUrl, member.sortOrder]); response.status(201).json({ id: result.insertId }); } catch (error) { next(error); }
});
app.put("/api/team-members/:id", requireAdmin, async (request, response, next) => {
  const member = validMember(request.body || {});
  if (!member) return response.status(422).json({ error: "Please provide a valid name, role, bio, and display order." });
  try {
    const [[current]] = await pool.execute("SELECT image_url FROM team_members WHERE id = ?", [request.params.id]);
    const [result] = await pool.execute("UPDATE team_members SET name = ?, role = ?, bio = ?, image_url = ?, instagram_url = ?, sort_order = ? WHERE id = ?", [member.name, member.role, member.bio, member.imageUrl, member.instagramUrl, member.sortOrder, request.params.id]);
    if (result.affectedRows === 1 && current?.image_url !== member.imageUrl) await deleteUploadedTeamImage(current?.image_url);
    response.json({ updated: result.affectedRows === 1 });
  } catch (error) { next(error); }
});
app.delete("/api/team-members/:id", requireAdmin, async (request, response, next) => {
  try {
    const [[current]] = await pool.execute("SELECT image_url FROM team_members WHERE id = ?", [request.params.id]);
    const [result] = await pool.execute("DELETE FROM team_members WHERE id = ?", [request.params.id]);
    if (result.affectedRows === 1) await deleteUploadedTeamImage(current?.image_url);
    response.json({ deleted: result.affectedRows === 1 });
  } catch (error) { next(error); }
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
app.use((error, _request, response, _next) => {
  if (error instanceof multer.MulterError && error.code === "LIMIT_FILE_SIZE") return response.status(422).json({ error: "The image must not be larger than 5 MB." });
  console.error(error);
  response.status(500).json({ error: "Server error." });
});

async function start() {
  try {
    await fs.mkdir(uploadDirectory, { recursive: true });
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
