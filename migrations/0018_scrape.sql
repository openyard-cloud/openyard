-- Logos and banners read from a project's own site: when it was last tried (the cron fills in
-- listings without pictures, at most once a week each), and a per-account limit on look-ups
-- from the submit form.
ALTER TABLE projects ADD COLUMN scraped_at INTEGER;
CREATE TABLE scrape_hits (user_id INTEGER NOT NULL, created_at INTEGER NOT NULL);
CREATE INDEX scrape_hits_user ON scrape_hits (user_id, created_at);
