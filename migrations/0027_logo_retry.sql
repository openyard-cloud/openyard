-- The site reader now finds logos it missed (long app store pages, oversized icons), so listings
-- without a logo are read again at the next cron run instead of a week after their last try.
UPDATE projects SET scraped_at = NULL WHERE logo IS NULL;
