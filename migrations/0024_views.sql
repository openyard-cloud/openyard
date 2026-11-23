-- Project page views, counted by day. A visitor counts once per project per day: we keep a hash
-- of (IP, browser, project, day) for two days to tell repeat views apart, then delete it.
CREATE TABLE views (slug TEXT NOT NULL, day TEXT NOT NULL, n INTEGER NOT NULL DEFAULT 0, PRIMARY KEY (slug, day));
CREATE TABLE view_seen (hash TEXT PRIMARY KEY, created_at INTEGER NOT NULL);
CREATE INDEX view_seen_at ON view_seen (created_at);
