-- Accounts: what a person tells us after signing in with GitHub, and who owns which project.
-- email is the primary verified address GitHub gives with the user:email scope; nothing is
-- sent to it unless email_ok is 1 (asked on /welcome, changed on /settings).
ALTER TABLE users ADD COLUMN email TEXT;
ALTER TABLE users ADD COLUMN email_ok INTEGER NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN email_ok_at INTEGER;                  -- when consent was last given or withdrawn
ALTER TABLE users ADD COLUMN interests TEXT NOT NULL DEFAULT '[]'; -- JSON array of people | wild | dev
ALTER TABLE users ADD COLUMN bio TEXT;                             -- from the public GitHub profile
ALTER TABLE users ADD COLUMN onboarded_at INTEGER;                 -- set when /welcome is done
ALTER TABLE users ADD COLUMN deleted_at INTEGER;                   -- account deleted: profile gone, comments emptied

-- The signed-in person who submitted a project. People listed in maintainers can edit it too.
ALTER TABLE projects ADD COLUMN owner_id INTEGER;
CREATE INDEX projects_owner ON projects (owner_id);
