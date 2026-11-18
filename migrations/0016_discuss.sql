-- Discussions on openyard.cloud instead of Discord. A topic sits in a category; its replies are
-- comments whose slug is "t-<topic id>", so they share the comment code, likes aside.
-- New projects are the Showcase category: they are listed from projects, not copied here.
CREATE TABLE topics (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  cat TEXT NOT NULL,               -- help | ideas | progress | general
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  user_id INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  last_at INTEGER NOT NULL,        -- the latest reply, for ordering
  pinned INTEGER NOT NULL DEFAULT 0,
  deleted INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX topics_recent ON topics (deleted, last_at);
CREATE INDEX topics_user ON topics (user_id, created_at);
