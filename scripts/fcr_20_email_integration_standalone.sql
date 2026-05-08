-- ============================================================
-- FCR Email Integration - Standalone Version
-- This version can be run independently for testing
-- ============================================================

-- ============================================================
-- 1. EMAIL LOGS TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS email_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ra_request_id UUID, -- FK will be added later if ra_requests exists
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
-- 2. BASIC RPC FUNCTIONS
-- ============================================================

-- Function to log email status (works without other tables)
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
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get email stats
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
-- 3. SIMPLE VIEW (without dependencies)
-- ============================================================

CREATE OR REPLACE VIEW email_logs_simple AS
SELECT 
  id,
  ra_request_id,
  resend_email_id,
  email_type,
  recipient_email,
  subject,
  status,
  sent_at,
  delivered_at,
  bounced_at,
  error_message,
  created_at,
  updated_at
FROM email_logs
ORDER BY sent_at DESC;

-- ============================================================
-- 4. GRANT PERMISSIONS
-- ============================================================

-- Grant permissions for the service role to access these functions
GRANT EXECUTE ON FUNCTION log_email_status TO service_role;
GRANT EXECUTE ON FUNCTION get_email_stats TO service_role;

-- Grant table permissions
GRANT ALL ON email_logs TO service_role;
GRANT SELECT ON email_logs_simple TO service_role;

-- ============================================================
-- 5. TEST DATA (optional)
-- ============================================================

-- Insert a test email log entry
INSERT INTO email_logs (
  resend_email_id,
  email_type,
  recipient_email,
  subject,
  status
) VALUES (
  'test-email-001',
  'ra-request',
  'test@example.com',
  'Test RA Request Email',
  'sent'
) ON CONFLICT DO NOTHING;

-- ============================================================
-- 6. COMMENTS
-- ============================================================

COMMENT ON TABLE email_logs IS 'Tracks all emails sent through the system with delivery status';
COMMENT ON FUNCTION log_email_status IS 'Updates email delivery status from webhook callbacks';
COMMENT ON FUNCTION get_email_stats IS 'Returns email delivery statistics for reporting';
COMMENT ON VIEW email_logs_simple IS 'Simple view of email logs without external dependencies';

-- ============================================================
-- 7. VERIFICATION QUERIES
-- ============================================================

-- Check the test data first
SELECT * FROM email_logs_simple LIMIT 5;

-- Test basic stats without rates
SELECT 
  COUNT(*) as total_sent,
  COUNT(*) FILTER (WHERE status = 'delivered') as delivered,
  COUNT(*) FILTER (WHERE status = 'bounced') as bounced,
  COUNT(*) FILTER (WHERE status = 'failed') as failed,
  COUNT(*) FILTER (WHERE status = 'sent') as pending
FROM email_logs;

-- Test the function (this should work now)
SELECT get_email_stats(NULL, NULL) as email_stats;