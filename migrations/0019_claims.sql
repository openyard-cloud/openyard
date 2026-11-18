-- Claiming a listing that came in without an account: the person proves the site is theirs
-- (a meta tag on the page, a DNS TXT record, or being the owner of its GitHub repository),
-- then it is theirs to edit and they hear about comments and likes.
CREATE TABLE claims (
  slug TEXT NOT NULL,
  user_id INTEGER NOT NULL,
  token TEXT NOT NULL,             -- what goes in the meta tag or the TXT record
  created_at INTEGER NOT NULL,
  PRIMARY KEY (slug, user_id)
);
