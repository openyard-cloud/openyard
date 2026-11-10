-- Code checks: each project with a GitHub repository is read by vetcode (never run) and the
-- result is shown on its page and in a README badge. Written by the scanner workflow through
-- POST /api/vet/<slug>.
CREATE TABLE vets (
  slug TEXT PRIMARY KEY,
  commit_sha TEXT NOT NULL,          -- the commit that was read
  version TEXT NOT NULL,             -- vetcode version
  scanned_at INTEGER NOT NULL,
  verdict TEXT NOT NULL,             -- clear | review | warning
  files INTEGER NOT NULL DEFAULT 0,
  label TEXT NOT NULL DEFAULT '[]',  -- JSON [{cap, files}]: what the code can do
  notes TEXT NOT NULL DEFAULT '[]',  -- JSON [{severity, rule, title, file, line}]: malware and supply-chain findings only
  skipped TEXT NOT NULL DEFAULT '{}',-- JSON {patterns: [], lines}: what the project's .vetcodeignore and inline comments skip
  changed TEXT NOT NULL DEFAULT '[]',-- JSON [cap]: abilities that appeared in the last change of commit
  changed_at INTEGER,
  changed_from TEXT                  -- commit before that change
);
