-- Checks of any public GitHub repository, asked for on /check. Same result fields as vets.
CREATE TABLE repo_checks (
  repo_key TEXT PRIMARY KEY,         -- owner/name in lower case
  repo TEXT NOT NULL,                -- owner/name as typed or as GitHub spells it
  status TEXT NOT NULL,              -- queued | running | done | failed
  requested_at INTEGER NOT NULL,
  error TEXT,
  commit_sha TEXT, version TEXT, scanned_at INTEGER, verdict TEXT, files INTEGER NOT NULL DEFAULT 0,
  label TEXT NOT NULL DEFAULT '[]', notes TEXT NOT NULL DEFAULT '[]', skipped TEXT NOT NULL DEFAULT '{}',
  changed TEXT NOT NULL DEFAULT '[]', changed_at INTEGER, changed_from TEXT
);
CREATE INDEX repo_checks_done ON repo_checks (status, scanned_at);
CREATE TABLE check_hits (ip_hash TEXT NOT NULL, created_at INTEGER NOT NULL);
CREATE INDEX check_hits_ip ON check_hits (ip_hash, created_at);
