-- Sign in without GitHub: a one-time link sent by email. Such accounts pick a nickname (login)
-- and get a generated picture. Their ids are negative, so they never meet a GitHub user id.
ALTER TABLE users ADD COLUMN provider TEXT NOT NULL DEFAULT 'github'; -- github | email
CREATE INDEX users_login ON users (login COLLATE NOCASE);
CREATE INDEX users_email ON users (email COLLATE NOCASE);

CREATE TABLE login_tokens (
  token_hash TEXT PRIMARY KEY,   -- only a hash of the link's secret is kept
  email TEXT NOT NULL,
  back TEXT,                     -- the page to return to
  ip_hash TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,   -- 20 minutes
  used_at INTEGER
);
CREATE INDEX login_tokens_email ON login_tokens (email, created_at);
CREATE INDEX login_tokens_ip ON login_tokens (ip_hash, created_at);
