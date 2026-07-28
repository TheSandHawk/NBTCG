const initialMembers = [
  ["MisterDefy", "Founder", "Hey, I'm MisterDefy, and I feel right at home among birds, dogs, cats, and Poros. That's why Ivern is my go-to Legend. I'm excited to bring some good vibes to Team Northbound and cause some chaos with my birds.", 1],
  ["Daro", "Co-founder", "Hi, I'm Daro, and I'm a big fan of Riftbound's unique Legends and their abilities. I love to experiment with different decks and strategies, and I'm always looking for new ways to challenge myself and my opponents.", 2],
  ["Piggy", "Team member", "Hey, I'm Piggy, and I'm probably the biggest Teemo fan in the group. I'm primarily responsible for the technical side of things, including the podcast and livestreams. Aside from Teemo, Azir is my go-to Legend.", 3],
];

async function ensureTeamMembers(pool) {
  const [columns] = await pool.query("SHOW COLUMNS FROM team_members");
  const existing = new Set(columns.map((column) => column.Field));
  if (!existing.has("image_url")) await pool.query("ALTER TABLE team_members ADD COLUMN image_url VARCHAR(2048) NOT NULL DEFAULT ''");
  if (!existing.has("instagram_url")) await pool.query("ALTER TABLE team_members ADD COLUMN instagram_url VARCHAR(2048) NOT NULL DEFAULT ''");

  const [[count]] = await pool.query("SELECT COUNT(*) AS count FROM team_members");
  if (count.count === 0) {
    await pool.query("INSERT INTO team_members (name, role, bio, sort_order) VALUES ?", [initialMembers]);
  }
}

module.exports = { ensureTeamMembers };
