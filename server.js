const path = require("node:path");
const fs = require("node:fs/promises");
const crypto = require("node:crypto");
const express = require("express");
const mysql = require("mysql2/promise");
const bcrypt = require("bcryptjs");
const multer = require("multer");
const { ensureTeamMembers } = require("./database/team-members");
const { ensureAdminUsers } = require("./database/admin-users");
require("dotenv").config({ path: path.join(__dirname, ".env") });

const required = ["MYSQL_HOST", "MYSQL_DATABASE", "MYSQL_USER", "MYSQL_PASSWORD", "ADMIN_USERNAME", "ADMIN_PASSWORD_HASH"];
const missing = required.filter((name) => process.env[name] === undefined);
if (missing.length) throw new Error(`Missing environment variables: ${missing.join(", ")}`);

const app = express();
const production = process.env.NODE_ENV === "production";
const port = Number(process.env.PORT || 3000);
const activityLogRetentionDays = Math.max(1, Number(process.env.ACTIVITY_LOG_RETENTION_DAYS || 180));
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
const currentUser = (request) => sessions.get(cookies(request).nbtcg_session);
const requireRole = (...roles) => (request, response, next) => {
  const user = currentUser(request);
  if (user?.mustChangePassword) return response.status(403).json({ error: "You must change your password before continuing." });
  return user && roles.includes(user.role) ? next() : response.status(403).json({ error: "You do not have permission for this action." });
};
const requireAdmin = requireRole("admin");
const requireTeamManager = requireRole("admin", "editor", "team_manager");
const requireEventManager = requireRole("admin", "editor", "event_manager");
const logActivity = async (request, action, target = "", details = "") => {
  const user = currentUser(request);
  if (!user) return;
  try { await pool.execute("INSERT INTO activity_logs (actor_username, action, target, details) VALUES (?, ?, ?, ?)", [user.username, action, target, details]); } catch (error) { console.error("Activity logging failed:", error.message); }
};
const cleanupActivityLogs = async () => {
  const cutoff = new Date(Date.now() - activityLogRetentionDays * 24 * 60 * 60 * 1000);
  const [result] = await pool.execute("DELETE FROM activity_logs WHERE created_at < ?", [cutoff]);
  if (result.affectedRows) console.log(`Deleted ${result.affectedRows} expired activity log entries.`);
};
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

app.get("/api/auth", (request, response) => {
  const user = currentUser(request);
  response.json(user ? { authenticated: true, username: user.username, role: user.role, mustChangePassword: user.mustChangePassword } : { authenticated: false });
});
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
  if (action === "change-password") {
    const user = currentUser(request);
    const newPassword = String(request.body.newPassword || "");
    if (!user) return response.status(401).json({ error: "Authentication required." });
    if (newPassword.length < 10) return response.status(422).json({ error: "The new password must have at least 10 characters." });
    try {
      const passwordHash = await bcrypt.hash(newPassword, 12);
      await pool.execute("UPDATE admin_users SET password_hash = ?, must_change_password = 0 WHERE id = ?", [passwordHash, user.id]);
      user.mustChangePassword = false;
      await logActivity(request, "Changed password", user.username);
      return response.json({ authenticated: true, username: user.username, role: user.role, mustChangePassword: false });
    } catch (_error) { return response.status(500).json({ error: "Unable to update password." }); }
  }
  if (action !== "login") return response.status(400).json({ error: "Invalid action." });
  const [[user]] = await pool.execute("SELECT id, username, password_hash, role, must_change_password AS mustChangePassword FROM admin_users WHERE username = ?", [String(username || "").trim()]);
  const valid = user && await bcrypt.compare(String(password || ""), user.password_hash);
  if (!valid) return response.status(401).json({ error: "Invalid credentials." });
  const token = crypto.randomBytes(32).toString("hex");
  sessions.set(token, { id: user.id, username: user.username, role: user.role, mustChangePassword: Boolean(user.mustChangePassword) });
  await logActivity(request, "Signed in", user.username);
  response.cookie("nbtcg_session", token, { httpOnly: true, sameSite: "lax", secure: process.env.SESSION_COOKIE_SECURE === "true", maxAge: 43200000 });
  return response.json({ authenticated: true, username: user.username, role: user.role, mustChangePassword: Boolean(user.mustChangePassword) });
});
const validUsername = (value) => /^[a-zA-Z0-9._-]{3,80}$/.test(String(value || "").trim());
const validRole = (value) => ["admin", "editor", "team_manager", "event_manager"].includes(value);
app.get("/api/activity-logs", requireAdmin, async (_request, response, next) => {
  try { const [logs] = await pool.query("SELECT id, actor_username AS actorUsername, action, target, details, created_at AS createdAt FROM activity_logs ORDER BY created_at DESC, id DESC LIMIT 200"); response.json(logs); } catch (error) { next(error); }
});
app.get("/api/users", requireAdmin, async (_request, response, next) => {
  try { const [users] = await pool.query("SELECT id, username, role, must_change_password AS mustChangePassword, is_protected AS isProtected, created_at AS createdAt FROM admin_users ORDER BY username"); response.json(users); } catch (error) { next(error); }
});
app.post("/api/users", requireAdmin, async (request, response, next) => {
  const { username, password, role, mustChangePassword } = request.body || {};
  if (!validUsername(username) || String(password || "").length < 10 || !validRole(role)) return response.status(422).json({ error: "Use a valid username, a password with at least 10 characters, and a role." });
  try {
    const passwordHash = await bcrypt.hash(password, 12);
    const [result] = await pool.execute("INSERT INTO admin_users (username, password_hash, role, must_change_password) VALUES (?, ?, ?, ?)", [String(username).trim(), passwordHash, role, Boolean(mustChangePassword)]);
    await logActivity(request, "Created user", String(username).trim(), role);
    response.status(201).json({ id: result.insertId });
  } catch (error) { next(error); }
});
app.put("/api/users/:id", requireAdmin, async (request, response, next) => {
  const { username, password, role, mustChangePassword } = request.body || {};
  if (!validUsername(username) || !validRole(role) || (password && String(password).length < 10)) return response.status(422).json({ error: "Use a valid username, an optional password with at least 10 characters, and a role." });
  try {
    const [[target]] = await pool.execute("SELECT id, username, role, is_protected AS isProtected FROM admin_users WHERE id = ?", [request.params.id]);
    if (!target) return response.status(404).json({ error: "User not found." });
    if (target.role === "admin" && role !== "admin") {
      const [[admins]] = await pool.query("SELECT COUNT(*) AS count FROM admin_users WHERE role = 'admin'");
      if (admins.count <= 1) return response.status(422).json({ error: "At least one administrator must remain." });
    }
    const passwordHash = password ? await bcrypt.hash(password, 12) : null;
    await pool.execute("UPDATE admin_users SET username = ?, role = ?, password_hash = COALESCE(?, password_hash), must_change_password = ? WHERE id = ?", [String(username).trim(), role, passwordHash, Boolean(mustChangePassword), request.params.id]);
    await logActivity(request, "Updated user", String(username).trim(), role);
    response.json({ updated: true });
  } catch (error) { next(error); }
});
app.delete("/api/users/:id", requireAdmin, async (request, response, next) => {
  if (Number(request.params.id) === currentUser(request).id) return response.status(422).json({ error: "You cannot delete your own account." });
  try {
    const [[target]] = await pool.execute("SELECT id, username, role, is_protected AS isProtected FROM admin_users WHERE id = ?", [request.params.id]);
    if (!target) return response.json({ deleted: false });
    if (target.isProtected) return response.status(422).json({ error: "The primary administrator account cannot be deleted." });
    if (target.role === "admin") {
      const [[admins]] = await pool.query("SELECT COUNT(*) AS count FROM admin_users WHERE role = 'admin'");
      if (admins.count <= 1) return response.status(422).json({ error: "At least one administrator must remain." });
    }
    await pool.execute("DELETE FROM admin_users WHERE id = ?", [request.params.id]);
    await logActivity(request, "Deleted user", target.username);
    response.json({ deleted: true });
  } catch (error) { next(error); }
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
app.post("/api/uploads/team-image", requireTeamManager, upload.single("image"), async (request, response, next) => {
  if (!request.file) return response.status(422).json({ error: "Please select a JPG, PNG, or WebP image up to 5 MB." });
  try {
    if (!await validImageFile(request.file)) {
      await fs.unlink(request.file.path).catch(() => {});
      return response.status(422).json({ error: "The uploaded file is not a valid JPG, PNG, or WebP image." });
    }
    const imageUrl = `/uploads/team/${request.file.filename}`;
    await logActivity(request, "Uploaded team image", request.file.originalname);
    response.status(201).json({ imageUrl });
  } catch (error) { next(error); }
});
app.post("/api/team-members", requireTeamManager, async (request, response, next) => {
  const member = validMember(request.body || {});
  if (!member) return response.status(422).json({ error: "Please provide a valid name, role, bio, and display order." });
  try { const [result] = await pool.execute("INSERT INTO team_members (name, role, bio, image_url, instagram_url, sort_order) VALUES (?, ?, ?, ?, ?, ?)", [member.name, member.role, member.bio, member.imageUrl, member.instagramUrl, member.sortOrder]); await logActivity(request, "Created team member", member.name); response.status(201).json({ id: result.insertId }); } catch (error) { next(error); }
});
app.put("/api/team-members/:id", requireTeamManager, async (request, response, next) => {
  const member = validMember(request.body || {});
  if (!member) return response.status(422).json({ error: "Please provide a valid name, role, bio, and display order." });
  try {
    const [[current]] = await pool.execute("SELECT image_url FROM team_members WHERE id = ?", [request.params.id]);
    const [result] = await pool.execute("UPDATE team_members SET name = ?, role = ?, bio = ?, image_url = ?, instagram_url = ?, sort_order = ? WHERE id = ?", [member.name, member.role, member.bio, member.imageUrl, member.instagramUrl, member.sortOrder, request.params.id]);
    if (result.affectedRows === 1 && current?.image_url !== member.imageUrl) await deleteUploadedTeamImage(current?.image_url);
    if (result.affectedRows === 1) await logActivity(request, "Updated team member", member.name);
    response.json({ updated: result.affectedRows === 1 });
  } catch (error) { next(error); }
});
app.delete("/api/team-members/:id", requireTeamManager, async (request, response, next) => {
  try {
    const [[current]] = await pool.execute("SELECT name, image_url FROM team_members WHERE id = ?", [request.params.id]);
    const [result] = await pool.execute("DELETE FROM team_members WHERE id = ?", [request.params.id]);
    if (result.affectedRows === 1) await deleteUploadedTeamImage(current?.image_url);
    if (result.affectedRows === 1) await logActivity(request, "Deleted team member", current?.name || String(request.params.id));
    response.json({ deleted: result.affectedRows === 1 });
  } catch (error) { next(error); }
});
app.post("/api/events", requireEventManager, async (request, response, next) => {
  const event = request.body || {};
  const title = String(event.title || "").trim(), date = String(event.date || ""), time = String(event.time || ""), category = String(event.category || "").trim();
  if (!title || title.length > 160 || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time) || !category) return response.status(422).json({ error: "Please provide a valid title, date, time, and category." });
  try { const [result] = await pool.execute("INSERT INTO events (title, event_date, event_time, location, category, format, description) VALUES (?, ?, ?, ?, ?, ?, ?)", [title, date, time, String(event.location || "").trim(), category, String(event.format || "").trim(), String(event.description || "").trim()]); await logActivity(request, "Created event", title); response.status(201).json({ id: result.insertId }); } catch (error) { next(error); }
});
app.delete("/api/events/:id", requireEventManager, async (request, response, next) => {
  try { const [[event]] = await pool.execute("SELECT title FROM events WHERE id = ?", [request.params.id]); const [result] = await pool.execute("DELETE FROM events WHERE id = ?", [request.params.id]); if (result.affectedRows === 1) await logActivity(request, "Deleted event", event?.title || String(request.params.id)); response.json({ deleted: result.affectedRows === 1 }); } catch (error) { next(error); }
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
    await ensureTeamMembers(pool);
    await ensureAdminUsers(pool, process.env);
    await cleanupActivityLogs();
    setInterval(() => cleanupActivityLogs().catch((error) => console.error("Activity log cleanup failed:", error.message)), 24 * 60 * 60 * 1000).unref();
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
