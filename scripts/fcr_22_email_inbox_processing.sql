-- ============================================================
-- FCR Email Inbox Processing — Database Schema
-- Run AFTER fcr_16_ra_request_tracking.sql & fcr_20_email_integration.sql
--
-- Creates:
--   1. processed_inbox_emails table — tracks every email read by the inbox reader
--   2. Indexes and permissions
--   3. Helper view for admin reporting
--   4. Optional: pg_cron + pg_net for automatic scheduling
-- ============================================================


-- ────────────────────────────────────────────────────────────
-- 1. processed_inbox_emails table
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS processed_inbox_emails (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email_uid         TEXT NOT NULL,
  email_message_id  TEXT,
  from_address      TEXT NOT NULL,
  to_address        TEXT,
  subject           TEXT,
  received_at       TIMESTAMPTZ,
  processed_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Matching
  memo_number       TEXT,
  debit_memo_id     UUID,
  extracted_ra_number TEXT,
  ai_confidence     NUMERIC(4,2) DEFAULT 0,
  ai_raw_response   JSONB DEFAULT '{}'::jsonb,

  -- Status: updated | already_received | no_memo_found | no_ra_found | memo_not_in_db | update_failed | error
  status            TEXT NOT NULL DEFAULT 'processed',
  error_message     TEXT,

  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add FK only if debit_memos exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'debit_memos') THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints
      WHERE constraint_name = 'fk_processed_inbox_debit_memo'
      AND table_name = 'processed_inbox_emails'
    ) THEN
      ALTER TABLE processed_inbox_emails
      ADD CONSTRAINT fk_processed_inbox_debit_memo
      FOREIGN KEY (debit_memo_id) REFERENCES debit_memos(id) ON DELETE SET NULL;
    END IF;
  END IF;
END $$;


-- ────────────────────────────────────────────────────────────
-- 2. Indexes
-- ────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_processed_inbox_email_uid   ON processed_inbox_emails(email_uid);
CREATE INDEX IF NOT EXISTS idx_processed_inbox_memo_number ON processed_inbox_emails(memo_number);
CREATE INDEX IF NOT EXISTS idx_processed_inbox_status      ON processed_inbox_emails(status);
CREATE INDEX IF NOT EXISTS idx_processed_inbox_processed   ON processed_inbox_emails(processed_at DESC);
CREATE INDEX IF NOT EXISTS idx_processed_inbox_debit_memo  ON processed_inbox_emails(debit_memo_id);


-- ────────────────────────────────────────────────────────────
-- 3. Trigger: auto-set processed_at
-- ────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION update_processed_inbox_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.processed_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_processed_inbox_timestamp ON processed_inbox_emails;
CREATE TRIGGER trg_processed_inbox_timestamp
  BEFORE UPDATE ON processed_inbox_emails
  FOR EACH ROW EXECUTE FUNCTION update_processed_inbox_timestamp();


-- ────────────────────────────────────────────────────────────
-- 4. RPC: get_inbox_processing_stats
--    Returns summary of email inbox processing
-- ────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION get_inbox_processing_stats(
  p_date_from DATE DEFAULT NULL,
  p_date_to   DATE DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_stats JSONB;
BEGIN
  SELECT jsonb_build_object(
    'total_processed',   COUNT(*),
    'ra_updated',        COUNT(*) FILTER (WHERE status = 'updated'),
    'already_received',  COUNT(*) FILTER (WHERE status = 'already_received'),
    'no_memo_found',     COUNT(*) FILTER (WHERE status = 'no_memo_found'),
    'no_ra_found',       COUNT(*) FILTER (WHERE status = 'no_ra_found'),
    'memo_not_in_db',    COUNT(*) FILTER (WHERE status = 'memo_not_in_db'),
    'update_failed',     COUNT(*) FILTER (WHERE status = 'update_failed'),
    'errors',            COUNT(*) FILTER (WHERE status = 'error'),
    'avg_confidence',    ROUND(COALESCE(AVG(ai_confidence) FILTER (WHERE extracted_ra_number IS NOT NULL), 0)::NUMERIC, 2),
    'success_rate',      CASE
      WHEN COUNT(*) FILTER (WHERE memo_number IS NOT NULL) > 0
      THEN ROUND(
        (COUNT(*) FILTER (WHERE status = 'updated')::NUMERIC /
         NULLIF(COUNT(*) FILTER (WHERE memo_number IS NOT NULL), 0) * 100
        )::NUMERIC, 2)
      ELSE 0
    END
  )
  INTO v_stats
  FROM processed_inbox_emails
  WHERE (p_date_from IS NULL OR processed_at::date >= p_date_from)
    AND (p_date_to IS NULL OR processed_at::date <= p_date_to);

  RETURN v_stats;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ────────────────────────────────────────────────────────────
-- 5. View: inbox_processing_with_memo_info
--    Joins processed emails with debit memo data for reporting
-- ────────────────────────────────────────────────────────────

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'debit_memos') THEN
    EXECUTE 'CREATE OR REPLACE VIEW inbox_processing_with_memo_info AS
    SELECT
      pie.*,
      dm.memo_number AS dm_memo_number,
      dm.labeler_name,
      dm.destination,
      dm.ra_status,
      dm.ra_number AS current_ra_number,
      dm.ra_received_at,
      p.pharmacy_name
    FROM processed_inbox_emails pie
    LEFT JOIN debit_memos dm ON pie.debit_memo_id = dm.id
    LEFT JOIN pharmacy p ON dm.pharmacy_id = p.id
    ORDER BY pie.processed_at DESC';
  ELSE
    EXECUTE 'CREATE OR REPLACE VIEW inbox_processing_with_memo_info AS
    SELECT
      pie.*,
      NULL::TEXT AS dm_memo_number,
      NULL::TEXT AS labeler_name,
      NULL::TEXT AS destination,
      NULL::TEXT AS ra_status,
      NULL::TEXT AS current_ra_number,
      NULL::TIMESTAMPTZ AS ra_received_at,
      NULL::TEXT AS pharmacy_name
    FROM processed_inbox_emails pie
    ORDER BY pie.processed_at DESC';
  END IF;
END $$;


-- ────────────────────────────────────────────────────────────
-- 6. Permissions
-- ────────────────────────────────────────────────────────────

GRANT ALL ON processed_inbox_emails TO service_role;
GRANT SELECT ON inbox_processing_with_memo_info TO service_role;
GRANT EXECUTE ON FUNCTION get_inbox_processing_stats TO service_role;


-- ────────────────────────────────────────────────────────────
-- 7. RLS
-- ────────────────────────────────────────────────────────────

ALTER TABLE processed_inbox_emails ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role full access on processed_inbox_emails" ON processed_inbox_emails;
CREATE POLICY "Service role full access on processed_inbox_emails"
  ON processed_inbox_emails
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);


-- ────────────────────────────────────────────────────────────
-- 8. Optional: pg_cron schedule (call read-ra-emails on a timer)
--    Requires pg_cron + pg_net enabled (Dashboard → Extensions).
--    Ready-to-run template with placeholders:
--      scripts/setup_read_ra_emails_pg_cron.sql
-- ────────────────────────────────────────────────────────────

-- Example (replace URL and Bearer token before running):
--
-- SELECT cron.schedule(
--   'read-ra-emails-cron-1min',
--   '* * * * *',
--   $$
--   SELECT net.http_post(
--     url := 'https://<PROJECT_REF>.supabase.co/functions/v1/read-ra-emails',
--     headers := jsonb_build_object(
--       'Content-Type', 'application/json',
--       'Authorization', 'Bearer <SERVICE_ROLE_KEY>'
--     ),
--     body := '{"maxEmails": 50, "markAsRead": true}'::jsonb
--   );
--   $$
-- );


-- ────────────────────────────────────────────────────────────
-- 9. Comments
-- ────────────────────────────────────────────────────────────

COMMENT ON TABLE processed_inbox_emails IS 'Tracks emails read from inbox by the RA auto-reader Edge Function';
COMMENT ON FUNCTION get_inbox_processing_stats IS 'Returns statistics on inbox email processing';
COMMENT ON VIEW inbox_processing_with_memo_info IS 'Processed inbox emails joined with debit memo info for reporting';


-- ────────────────────────────────────────────────────────────
-- 10. Safe diagnostics (SQL Editor) — run this block ONLY
--     Do NOT query cron.job unless you enabled pg_cron:
--       Database → Extensions → pg_cron → Enable
--     Without pg_cron, "relation cron.job does not exist" is expected.
-- ────────────────────────────────────────────────────────────

-- Recent processed emails (works on any project that ran section 1–7 above):
-- SELECT
--   from_address,
--   subject,
--   memo_number,
--   status,
--   processed_at
-- FROM processed_inbox_emails
-- ORDER BY processed_at DESC
-- LIMIT 10;

-- Optional: only after CREATE EXTENSION pg_cron; has been run successfully:
-- SELECT * FROM cron.job WHERE jobname LIKE 'read-ra-emails%';
