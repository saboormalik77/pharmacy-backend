-- Safe to run in Supabase SQL Editor (no pg_cron required).
-- If this fails with "relation processed_inbox_emails does not exist",
-- run scripts/fcr_22_email_inbox_processing.sql first.

SELECT
  from_address,
  subject,
  memo_number,
  status,
  processed_at
FROM processed_inbox_emails
ORDER BY processed_at DESC
LIMIT 10;
