-- The sign-in email also carries a 6-digit code, for when the link would open in another
-- browser or device. Only a hash is kept; five wrong tries and the code stops working.
ALTER TABLE login_tokens ADD COLUMN code_hash TEXT;
ALTER TABLE login_tokens ADD COLUMN tries INTEGER NOT NULL DEFAULT 0;
