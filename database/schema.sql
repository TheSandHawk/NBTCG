CREATE TABLE IF NOT EXISTS events (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  title VARCHAR(160) NOT NULL,
  event_date DATE NOT NULL,
  event_time TIME NOT NULL,
  location VARCHAR(255) NOT NULL DEFAULT '',
  category VARCHAR(80) NOT NULL,
  format VARCHAR(160) NOT NULL DEFAULT '',
  description TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX events_schedule (event_date, event_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS team_members (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(80) NOT NULL,
  role VARCHAR(80) NOT NULL DEFAULT '',
  bio TEXT NOT NULL,
  image_url VARCHAR(2048) NOT NULL DEFAULT '',
  instagram_url VARCHAR(2048) NOT NULL DEFAULT '',
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY team_members_name (name),
  INDEX team_members_sort (sort_order, name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS admin_users (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  username VARCHAR(80) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('admin', 'editor', 'team_manager', 'event_manager') NOT NULL DEFAULT 'editor',
  must_change_password TINYINT(1) NOT NULL DEFAULT 0,
  is_protected TINYINT(1) NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY admin_users_username (username)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS activity_logs (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  actor_username VARCHAR(80) NOT NULL,
  action VARCHAR(120) NOT NULL,
  target VARCHAR(255) NOT NULL DEFAULT '',
  details VARCHAR(500) NOT NULL DEFAULT '',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX activity_logs_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
