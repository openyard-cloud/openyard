-- Email through Resend. Messages wait in outbox and go out from the Worker (right away, and
-- each hour from the cron) within a daily budget: Resend's free plan allows 100 a day.
ALTER TABLE users ADD COLUMN lang TEXT NOT NULL DEFAULT 'en';  -- language for email, from the site toggle
ALTER TABLE users ADD COLUMN unsub_token TEXT;                 -- the secret in one-click unsubscribe links
CREATE UNIQUE INDEX users_unsub ON users (unsub_token);

CREATE TABLE outbox (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  dedupe TEXT NOT NULL UNIQUE,     -- e.g. welcome:<user>, reply:<comment>:<user>; a second copy is ignored
  user_id INTEGER NOT NULL,
  kind TEXT NOT NULL,              -- welcome | reply | comment | check | digest
  subject TEXT NOT NULL,
  html TEXT NOT NULL,
  text TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  claimed_at INTEGER,              -- a sender picked it up (another one waits 15 minutes before retrying)
  sent_at INTEGER,
  tries INTEGER NOT NULL DEFAULT 0,
  error TEXT
);
CREATE INDEX outbox_pending ON outbox (sent_at, id);
