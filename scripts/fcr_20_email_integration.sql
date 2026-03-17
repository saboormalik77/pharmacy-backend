-- ============================================================
-- FCR Email Integration - Database Schema Updates
-- Run this in Supabase SQL Editor
--
-- PREREQUISITES: 
-- - fcr_15_batch_closeout.sql (for debit_memos table)
-- - fcr_16_ra_request_tracking.sql (for ra_requests table)
-- - Basic pharmacy table must exist
-- ============================================================

-- ============================================================
-- 1. EMAIL LOGS TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS email_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ra_request_id UUID, -- Will add FK constraint after ensuring ra_requests table exists
  resend_email_id VARCHAR(255), -- Resend's email ID
  email_type VARCHAR(50) DEFAULT 'ra-request', -- 'ra-request', 'ra-reminder'
  recipient_email VARCHAR(255) NOT NULL,
  subject TEXT,
  status VARCHAR(50) DEFAULT 'sent', -- 'sent', 'delivered', 'bounced', 'failed'
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  delivered_at TIMESTAMPTZ,
  bounced_at TIMESTAMPTZ,
  error_message TEXT,
  resend_response JSONB, -- Store full Resend API response
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add foreign key constraint if ra_requests table exists
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ra_requests') THEN
    -- Add foreign key constraint if it doesn't exist
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints 
      WHERE constraint_name = 'fk_email_logs_ra_request' 
      AND table_name = 'email_logs'
    ) THEN
      ALTER TABLE email_logs 
      ADD CONSTRAINT fk_email_logs_ra_request 
      FOREIGN KEY (ra_request_id) REFERENCES ra_requests(id) ON DELETE CASCADE;
    END IF;
  END IF;
END $$;

-- Indexes for email_logs
CREATE INDEX IF NOT EXISTS idx_email_logs_ra_request ON email_logs(ra_request_id);
CREATE INDEX IF NOT EXISTS idx_email_logs_resend_id ON email_logs(resend_email_id);
CREATE INDEX IF NOT EXISTS idx_email_logs_status ON email_logs(status);
CREATE INDEX IF NOT EXISTS idx_email_logs_sent_at ON email_logs(sent_at DESC);

-- Auto-update trigger for email_logs
CREATE OR REPLACE FUNCTION update_email_logs_updated_at()
RETURNS TRIGGER AS $$
BEGIN 
  NEW.updated_at = NOW(); 
  RETURN NEW; 
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_email_logs_updated_at ON email_logs;
CREATE TRIGGER trg_email_logs_updated_at
  BEFORE UPDATE ON email_logs
  FOR EACH ROW EXECUTE FUNCTION update_email_logs_updated_at();

-- ============================================================
-- 2. UPDATE RA_REQUESTS TABLE
-- ============================================================

-- Add columns for email tracking if they don't exist
DO $$ 
BEGIN
  -- Add resend_email_id column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'ra_requests' AND column_name = 'resend_email_id'
  ) THEN
    ALTER TABLE ra_requests ADD COLUMN resend_email_id VARCHAR(255);
  END IF;

  -- Add updated_at column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'ra_requests' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE ra_requests ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
  END IF;
END $$;

-- Index for resend_email_id
CREATE INDEX IF NOT EXISTS idx_ra_requests_resend_email_id ON ra_requests(resend_email_id);

-- ============================================================
-- 3. RPC FUNCTION: ra_update_request_status
-- ============================================================

CREATE OR REPLACE FUNCTION ra_update_request_status(
  p_request_id UUID,
  p_status TEXT,
  p_error_message TEXT DEFAULT NULL,
  p_resend_email_id TEXT DEFAULT NULL
) RETURNS VOID AS $$
BEGIN
  UPDATE ra_requests 
  SET 
    status = p_status,
    error_message = p_error_message,
    resend_email_id = COALESCE(p_resend_email_id, resend_email_id),
    updated_at = NOW()
  WHERE id = p_request_id;
  
  -- Log the status update
  INSERT INTO email_logs (
    ra_request_id, 
    resend_email_id, 
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

-- ============================================================
-- 4. RPC FUNCTION: log_email_status
-- ============================================================

CREATE OR REPLACE FUNCTION log_email_status(
  p_resend_email_id TEXT,
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
  WHERE resend_email_id = p_resend_email_id;
  
  -- Also update the RA request status if it's a delivery confirmation
  IF p_status = 'delivered' THEN
    UPDATE ra_requests 
    SET updated_at = NOW()
    WHERE resend_email_id = p_resend_email_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 5. RPC FUNCTION: get_email_stats
-- ============================================================

CREATE OR REPLACE FUNCTION get_email_stats(
  p_date_from DATE DEFAULT NULL,
  p_date_to DATE DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
  v_stats JSONB;
BEGIN
  SELECT jsonb_build_object(
    'total_sent', COUNT(*),
    'delivered', COUNT(*) FILTER (WHERE status = 'delivered'),
    'bounced', COUNT(*) FILTER (WHERE status = 'bounced'),
    'failed', COUNT(*) FILTER (WHERE status = 'failed'),
    'pending', COUNT(*) FILTER (WHERE status = 'sent'),
    'delivery_rate', ROUND(
      (COUNT(*) FILTER (WHERE status = 'delivered')::NUMERIC / 
       NULLIF(COUNT(*), 0) * 100)::NUMERIC, 2
    ),
    'bounce_rate', ROUND(
      (COUNT(*) FILTER (WHERE status = 'bounced')::NUMERIC / 
       NULLIF(COUNT(*), 0) * 100)::NUMERIC, 2
    )
  )
  INTO v_stats
  FROM email_logs
  WHERE (p_date_from IS NULL OR sent_at::date >= p_date_from)
    AND (p_date_to IS NULL OR sent_at::date <= p_date_to);
    
  RETURN v_stats;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 6. VIEW: email_logs_with_memo_info
-- ============================================================

-- Create view only if all required tables exist
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ra_requests') 
     AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'debit_memos')
     AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'pharmacy') THEN
    
    EXECUTE 'CREATE OR REPLACE VIEW email_logs_with_memo_info AS
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
    -- Create a simple view if related tables don't exist yet
    EXECUTE 'CREATE OR REPLACE VIEW email_logs_with_memo_info AS
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

-- ============================================================
-- 7. GRANT PERMISSIONS
-- ============================================================

-- Grant permissions for the service role to access these functions
GRANT EXECUTE ON FUNCTION ra_update_request_status TO service_role;
GRANT EXECUTE ON FUNCTION log_email_status TO service_role;
GRANT EXECUTE ON FUNCTION get_email_stats TO service_role;

-- Grant table permissions
GRANT ALL ON email_logs TO service_role;
GRANT SELECT ON email_logs_with_memo_info TO service_role;

-- ============================================================
-- 8. COMMENTS
-- ============================================================

COMMENT ON TABLE email_logs IS 'Tracks all emails sent through the system with delivery status';
COMMENT ON FUNCTION ra_update_request_status IS 'Updates RA request status and logs email activity';
COMMENT ON FUNCTION log_email_status IS 'Updates email delivery status from webhook callbacks';
COMMENT ON FUNCTION get_email_stats IS 'Returns email delivery statistics for reporting';
COMMENT ON VIEW email_logs_with_memo_info IS 'Email logs joined with debit memo information for reporting';