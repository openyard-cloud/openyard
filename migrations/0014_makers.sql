-- Looking after makers. The submit form asks for an email (never shown on the site); OpenYard
-- writes to it about that listing only: it is live (with the private edit link), comments,
-- likes, a few tips in the first week. contact_token is the one-click unsubscribe secret.
ALTER TABLE projects ADD COLUMN contact_email TEXT;
ALTER TABLE projects ADD COLUMN contact_ok INTEGER NOT NULL DEFAULT 1;
ALTER TABLE projects ADD COLUMN contact_lang TEXT NOT NULL DEFAULT 'en';
ALTER TABLE projects ADD COLUMN contact_token TEXT;
CREATE UNIQUE INDEX projects_contact_token ON projects (contact_token);

-- One like per signed-in person per project.
CREATE TABLE likes (
  slug TEXT NOT NULL,
  user_id INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  PRIMARY KEY (slug, user_id)
);
CREATE INDEX likes_recent ON likes (created_at);

-- Mail to a project's contact address instead of an account: user_id is 0 and this names the project.
ALTER TABLE outbox ADD COLUMN contact_slug TEXT;
