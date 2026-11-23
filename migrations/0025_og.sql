-- Share images rendered automatically (scripts/og.mjs --auto in GitHub Actions): when a project's
-- was made, so an edit makes a new one, and a share image for each discussion topic.
ALTER TABLE projects ADD COLUMN og_at INTEGER;
ALTER TABLE topics ADD COLUMN og TEXT;
