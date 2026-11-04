-- Projects listed on openyard.cloud. Text fields with translations are JSON objects like {"en": "...", "vi": "..."}.
CREATE TABLE projects (
  slug TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL,              -- app | open-source
  kinds TEXT NOT NULL,             -- JSON array of people | wild | dev
  status TEXT NOT NULL,            -- live | beta | soon
  tagline TEXT NOT NULL,           -- JSON {en, vi}
  description TEXT NOT NULL,       -- JSON {en, vi}
  url TEXT NOT NULL,
  repo TEXT,
  license TEXT,
  logo TEXT,                       -- path or URL
  logo_style TEXT,                 -- tile | mark
  image TEXT,                      -- path or URL
  og TEXT,                         -- share image path, if one was rendered
  color TEXT,
  maintainers TEXT NOT NULL DEFAULT '[]',
  tags TEXT NOT NULL DEFAULT '[]',
  team INTEGER NOT NULL DEFAULT 0,
  featured INTEGER NOT NULL DEFAULT 0,
  swarm TEXT,                      -- JSON, hero animation settings for team projects
  added TEXT NOT NULL,             -- YYYY-MM-DD
  hidden INTEGER NOT NULL DEFAULT 0,
  edit_hash TEXT,                  -- SHA-256 of the submitter's edit token
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

-- Latest GitHub numbers and recent activity per project, refreshed by the cron trigger.
CREATE TABLE stats (
  slug TEXT PRIMARY KEY,
  stars INTEGER, forks INTEGER, open_issues INTEGER, pushed_at TEXT,
  stars_7d INTEGER NOT NULL DEFAULT 0,
  prs_7d INTEGER NOT NULL DEFAULT 0,
  issues_7d INTEGER NOT NULL DEFAULT 0,
  commits_7d INTEGER NOT NULL DEFAULT 0,
  discussions_7d INTEGER NOT NULL DEFAULT 0,
  activity TEXT NOT NULL DEFAULT '{}', -- JSON {prs: [], issues: [], discussions: []}
  score REAL NOT NULL DEFAULT 0,
  updated_at INTEGER NOT NULL
);

CREATE TABLE star_history (slug TEXT NOT NULL, day TEXT NOT NULL, stars INTEGER NOT NULL, PRIMARY KEY (slug, day));
CREATE TABLE clicks (slug TEXT NOT NULL, day TEXT NOT NULL, n INTEGER NOT NULL DEFAULT 0, PRIMARY KEY (slug, day));
CREATE TABLE uploads (id TEXT PRIMARY KEY, type TEXT NOT NULL, data BLOB NOT NULL, created_at INTEGER NOT NULL);
CREATE TABLE submits (ip_hash TEXT NOT NULL, created_at INTEGER NOT NULL);
CREATE INDEX submits_ip ON submits (ip_hash, created_at);
