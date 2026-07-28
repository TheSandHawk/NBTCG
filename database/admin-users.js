async function ensureAdminUsers(pool, environment) {
  await pool.query("ALTER TABLE admin_users MODIFY role ENUM('admin', 'editor', 'team_manager', 'event_manager') NOT NULL DEFAULT 'editor'");
  const [[count]] = await pool.query("SELECT COUNT(*) AS count FROM admin_users");
  if (count.count > 0) return;

  const username = String(environment.ADMIN_USERNAME || "").trim();
  const passwordHash = String(environment.ADMIN_PASSWORD_HASH || "").trim();
  if (!username || !passwordHash) throw new Error("An initial administrator account is required.");
  await pool.execute("INSERT INTO admin_users (username, password_hash, role) VALUES (?, ?, 'admin')", [username, passwordHash]);
}

module.exports = { ensureAdminUsers };
