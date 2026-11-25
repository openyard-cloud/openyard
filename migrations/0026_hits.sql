-- Rate limits that need a count over time: sign-in codes typed per connection, edits per project
-- and per connection, GitHub look-ups per connection. `key` is a slug or a hash, never an IP;
-- rows older than two days are deleted by the cron.
CREATE TABLE hits (kind TEXT NOT NULL, key TEXT NOT NULL, created_at INTEGER NOT NULL);
CREATE INDEX hits_key ON hits (kind, key, created_at);
CREATE INDEX hits_at ON hits (created_at);
