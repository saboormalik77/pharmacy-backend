-- ============================================================
-- FCR Email: Nodemailer Migration
-- Run AFTER fcr_20_email_integration.sql
--
-- Renames resend_email_id → smtp_message_id in both
-- email_logs and ra_requests to reflect the switch from
-- Resend API to Nodemailer/SMTP.
-- ============================================================

-- 1. email_logs: rename column (safe — skips if already renamed)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'email_logs' AND column_name = 'resend_email_id'
  ) THEN
    ALTER TABLE email_logs RENAME COLUMN resend_email_id TO smtp_message_id;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'email_logs' AND column_name = 'resend_response'
  ) THEN
    ALTER TABLE email_logs RENAME COLUMN resend_response TO smtp_response;
  END IF;
END $$;

-- 2. ra_requests: rename column
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ra_requests' AND column_name = 'resend_email_id'
  ) THEN
    ALTER TABLE ra_requests RENAME COLUMN resend_email_id TO smtp_message_id;
  END IF;
END $$;

-- 3. Update indexes
DROP INDEX IF EXISTS idx_email_logs_resend_id;
CREATE INDEX IF NOT EXISTS idx_email_logs_smtp_message_id ON email_logs(smtp_message_id);

DROP INDEX IF EXISTS idx_ra_requests_resend_email_id;
CREATE INDEX IF NOT EXISTS idx_ra_requests_smtp_message_id ON ra_requests(smtp_message_id);

-- 4. Update ra_update_request_status function
CREATE OR REPLACE FUNCTION ra_update_request_status(
  p_request_id UUID,
  p_status TEXT,
  p_error_message TEXT DEFAULT NULL,
  p_resend_email_id TEXT DEFAULT NULL  -- param name kept for backward compat
) RETURNS VOID AS $$
BEGIN
  UPDATE ra_requests
  SET
    status = p_status,
    error_message = p_error_message,
    smtp_message_id = COALESCE(p_resend_email_id, smtp_message_id),
    updated_at = NOW()
  WHERE id = p_request_id;

  INSERT INTO email_logs (
    ra_request_id,
    smtp_message_id,
    email_type,
    recipient_email,
    status,
    error_message
  )
  SELECT
    p_request_id,
    p_resend_email_id,
    'ra-request',
    COALESCE(r.destination_email, 'unknown@example.com'),
    p_status,
    p_error_message
  FROM ra_requests r
  WHERE r.id = p_request_id
  ON CONFLICT DO NOTHING;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Update log_email_status function
CREATE OR REPLACE FUNCTION log_email_status(
  p_resend_email_id TEXT,  -- param name kept for backward compat
  p_status TEXT,
  p_delivered_at TIMESTAMPTZ DEFAULT NULL,
  p_bounced_at TIMESTAMPTZ DEFAULT NULL,
  p_error_message TEXT DEFAULT NULL
) RETURNS VOID AS $$
BEGIN
  UPDATE email_logs
  SET
    status = p_status,
    delivered_at = COALESCE(p_delivered_at, delivered_at),
    bounced_at = COALESCE(p_bounced_at, bounced_at),
    error_message = COALESCE(p_error_message, error_message),
    updated_at = NOW()
  WHERE smtp_message_id = p_resend_email_id;

  IF p_status = 'delivered' THEN
    UPDATE ra_requests
    SET updated_at = NOW()
    WHERE smtp_message_id = p_resend_email_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Drop and recreate the view (required when renaming columns)
DROP VIEW IF EXISTS email_logs_with_memo_info;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ra_requests')
     AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'debit_memos')
     AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'pharmacy') THEN

    EXECUTE 'CREATE VIEW email_logs_with_memo_info AS
    SELECT
      el.*,
      r.debit_memo_id,
      dm.memo_number,
      p.pharmacy_name,
      dm.destination,
      dm.labeler_name,
      dm.total_ask_value
    FROM email_logs el
    JOIN ra_requests r ON el.ra_request_id = r.id
    LEFT JOIN debit_memos dm ON r.debit_memo_id = dm.id
    LEFT JOIN pharmacy p ON dm.pharmacy_id = p.id
    ORDER BY el.sent_at DESC';

  ELSE
    EXECUTE 'CREATE VIEW email_logs_with_memo_info AS
    SELECT
      el.*,
      NULL::UUID as debit_memo_id,
      NULL::TEXT as memo_number,
      NULL::TEXT as pharmacy_name,
      NULL::TEXT as destination,
      NULL::TEXT as labeler_name,
      NULL::DECIMAL as total_ask_value
    FROM email_logs el
    ORDER BY el.sent_at DESC';
  END IF;
END $$;

-- 7. Grant permissions
GRANT EXECUTE ON FUNCTION ra_update_request_status TO service_role;
GRANT EXECUTE ON FUNCTION log_email_status TO service_role;
GRANT SELECT ON email_logs_with_memo_info TO service_role;

COMMENT ON FUNCTION ra_update_request_status IS 'Updates RA request status and logs email activity (nodemailer)';
COMMENT ON FUNCTION log_email_status IS 'Updates email delivery status from SMTP webhook or callback';
