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

ALTER TABLE team_members ADD COLUMN IF NOT EXISTS image_url VARCHAR(2048) NOT NULL DEFAULT '';
ALTER TABLE team_members ADD COLUMN IF NOT EXISTS instagram_url VARCHAR(2048) NOT NULL DEFAULT '';

INSERT INTO team_members (name, role, bio, sort_order)
SELECT name, role, bio, sort_order FROM (
  SELECT 'MisterDefy' AS name, 'Founder' AS role, 'Hey, I''m MisterDefy, and I feel right at home among birds, dogs, cats, and Poros. That''s why Ivern is my go-to Legend. I''m excited to bring some good vibes to Team Northbound and cause some chaos with my birds.' AS bio, 1 AS sort_order
  UNION ALL SELECT 'Daro', 'Co-founder', 'Hi, I''m Daro, and I''m a big fan of Riftbound''s unique Legends and their abilities. I love to experiment with different decks and strategies, and I''m always looking for new ways to challenge myself and my opponents.', 2
  UNION ALL SELECT 'Piggy', 'Team member', 'Hey, I''m Piggy, and I''m probably the biggest Teemo fan in the group. I''m primarily responsible for the technical side of things, including the podcast and livestreams. Aside from Teemo, Azir is my go-to Legend.', 3
) AS initial_members
WHERE NOT EXISTS (SELECT 1 FROM team_members);
