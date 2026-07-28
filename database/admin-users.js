async function ensureAdminUsers(pool, environment) {
  await pool.query("ALTER TABLE admin_users MODIFY role ENUM('admin', 'editor', 'team_manager', 'event_manager') NOT NULL DEFAULT 'editor'");
  const [columns] = await pool.query("SHOW COLUMNS FROM admin_users");
  if (!columns.some((column) => column.Field === "must_change_password")) {
    await pool.query("ALTER TABLE admin_users ADD COLUMN must_change_password TINYINT(1) NOT NULL DEFAULT 0");
  }
  if (!columns.some((column) => column.Field === "is_protected")) {
    await pool.query("ALTER TABLE admin_users ADD COLUMN is_protected TINYINT(1) NOT NULL DEFAULT 0");
  }
  const [[count]] = await pool.query("SELECT COUNT(*) AS count FROM admin_users");
  const username = String(environment.ADMIN_USERNAME || "").trim();
  const passwordHash = String(environment.ADMIN_PASSWORD_HASH || "").trim();
  if (!username || !passwordHash) throw new Error("An initial administrator account is required.");
  if (count.count === 0) {
    await pool.execute("INSERT INTO admin_users (username, password_hash, role, is_protected) VALUES (?, ?, 'admin', 1)", [username, passwordHash]);
  } else {
    await pool.execute("UPDATE admin_users SET is_protected = 1 WHERE username = ?", [username]);
  }
}

module.exports = { ensureAdminUsers };
