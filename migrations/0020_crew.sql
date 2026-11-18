-- People of the OpenYard GitHub organization: everyone who contributed to one of its public
-- repositories, and its members when the token may see them. Synced once a day by the cron;
-- they count as members of the yard and show among its faces.
CREATE TABLE crew (
  login TEXT PRIMARY KEY,
  avatar TEXT,
  kind TEXT NOT NULL,                -- member | contributor
  contributions INTEGER NOT NULL DEFAULT 0,
  synced_at INTEGER NOT NULL
);
