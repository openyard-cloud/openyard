-- People who signed in with GitHub (public profile only; no GitHub token is kept).
CREATE TABLE users (
  id INTEGER PRIMARY KEY,          -- GitHub user id
  login TEXT NOT NULL,
  name TEXT,
  avatar TEXT,
  banned INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  seen_at INTEGER NOT NULL
);

-- Sign-in sessions; the cookie holds a random token, only its hash is stored.
CREATE TABLE sessions (
  token_hash TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL,
  expires_at INTEGER NOT NULL
);

-- Comments on project pages. parent_id makes a one-level reply.
CREATE TABLE comments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT NOT NULL,
  user_id INTEGER NOT NULL,
  parent_id INTEGER,
  body TEXT NOT NULL,
  deleted INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL
);
CREATE INDEX comments_slug ON comments (slug, created_at);
CREATE INDEX comments_user ON comments (user_id, created_at);
