-- ============================================================
-- Debug read-ra-emails function (why no emails processed?)
-- ============================================================
-- This helps diagnose why the read-ra-emails edge function runs
-- but doesn't process any emails or write rows to processed_inbox_emails.
--
-- Common issues:
--   1. IMAP credentials wrong (function returns 500)
--   2. No unread emails in inbox
--   3. Emails don't contain memo numbers (DM-XXXX-XXXX pattern)
--   4. Memo numbers in emails don't match debit_memos table
--   5. Azure OpenAI secrets missing/wrong
--   6. Edge function secrets not deployed to this project
-- ============================================================

-- 1) Recent function activity (any rows = function ran and wrote something)
SELECT
  from_address,
  subject,
  memo_number,
  status,
  error_message,
  processed_at
FROM processed_inbox_emails
ORDER BY processed_at DESC
LIMIT 10;

-- 2) Status breakdown (what happened to emails that were processed?)
SELECT
  status,
  COUNT(*) as count,
  MAX(processed_at) as latest
FROM processed_inbox_emails
GROUP BY status
ORDER BY latest DESC NULLS LAST;

-- 3) Recent debit memos (do any exist that could match incoming emails?)
SELECT
  memo_number,
  ra_number,
  ra_status,
  ra_requested_at,
  created_at
FROM debit_memos
ORDER BY created_at DESC
LIMIT 10;

-- 4) Memos waiting for RA (should match incoming email subjects like "RE: DM-0126-0001")
SELECT
  memo_number,
  pharmacy_id,
  (SELECT pharmacy_name FROM pharmacy WHERE id = debit_memos.pharmacy_id) as pharmacy_name,
  destination,
  ra_requested_at,
  ra_status
FROM debit_memos
WHERE ra_status IS NULL OR ra_status != 'received'
ORDER BY ra_requested_at DESC NULLS LAST
LIMIT 20;