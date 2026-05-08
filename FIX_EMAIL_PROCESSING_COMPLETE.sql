-- ================================================================
-- COMPREHENSIVE FIX: EMAIL PROCESSING AND RA EXTRACTION ISSUES
-- ================================================================
-- This script fixes all the issues with the email reading cron job:
-- 1. Creates missing ra_receive function with correct signature
-- 2. Updates cron job to process fewer emails per run
-- 3. Ensures all necessary helper functions exist
-- ================================================================

-- ══════════════════════════════════════════════════════════════
-- Fix 1: Create Missing ra_receive Function
-- ══════════════════════════════════════════════════════════════

-- Drop any existing version to avoid signature conflicts
DROP FUNCTION IF EXISTS public.ra_receive(uuid, text, text);
DROP FUNCTION IF EXISTS public.ra_receive(uuid, text);

-- Create ra_receive with exact signature expected by Edge Function
CREATE OR REPLACE FUNCTION public.ra_receive(
  p_debit_memo_id uuid, 
  p_pdf_url text DEFAULT NULL::text, 
  p_ra_number text
) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
  v_memo debit_memos;
  v_result jsonb;
BEGIN
  -- Log the call for debugging
  RAISE NOTICE 'ra_receive called with: memo_id=%, pdf_url=%, ra_number=%', p_debit_memo_id, p_pdf_url, p_ra_number;

  -- Find the debit memo
  SELECT * INTO v_memo FROM debit_memos WHERE id = p_debit_memo_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'error', true, 
      'code', 404, 
      'message', 'Debit memo not found'
    );
  END IF;

  -- Validate RA number
  IF p_ra_number IS NULL OR TRIM(p_ra_number) = '' THEN
    RETURN jsonb_build_object(
      'error', true, 
      'code', 400, 
      'message', 'RA number is required'
    );
  END IF;

  -- Update the debit memo with RA information
  UPDATE debit_memos SET
    ra_number = TRIM(p_ra_number),
    ra_received_at = NOW(),
    ra_status = 'received',
    updated_at = NOW()
  WHERE id = p_debit_memo_id;

  -- Get the updated memo
  SELECT * INTO v_memo FROM debit_memos WHERE id = p_debit_memo_id;

  -- Build success response
  v_result := jsonb_build_object(
    'error', false,
    'data', jsonb_build_object(
      'id', v_memo.id,
      'memo_number', v_memo.memo_number,
      'ra_number', v_memo.ra_number,
      'ra_status', v_memo.ra_status,
      'ra_received_at', v_memo.ra_received_at,
      'updated_at', v_memo.updated_at
    )
  );

  RAISE NOTICE 'ra_receive successful: %', v_result;
  RETURN v_result;

EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'ra_receive error: %', SQLERRM;
    RETURN jsonb_build_object(
      'error', true,
      'code', 500,
      'message', SQLERRM
    );
END;
$$;

-- Set ownership and permissions
ALTER FUNCTION public.ra_receive(uuid, text, text) OWNER TO postgres;
GRANT EXECUTE ON FUNCTION public.ra_receive(uuid, text, text) TO authenticated, anon, service_role;

-- ══════════════════════════════════════════════════════════════
-- Fix 2: Ensure debit_memos Table Has Required Columns
-- ══════════════════════════════════════════════════════════════

-- Add RA-related columns to debit_memos if they don't exist
ALTER TABLE public.debit_memos 
ADD COLUMN IF NOT EXISTS ra_number text,
ADD COLUMN IF NOT EXISTS ra_status text CHECK (ra_status IN ('pending', 'sent', 'received', 'approved', 'denied')),
ADD COLUMN IF NOT EXISTS ra_received_at timestamptz,
ADD COLUMN IF NOT EXISTS ra_requested_at timestamptz,
ADD COLUMN IF NOT EXISTS tickler_date date;

-- ══════════════════════════════════════════════════════════════
-- Fix 3: Update Cron Job to Process Fewer Emails (Prevent Timeout)
-- ══════════════════════════════════════════════════════════════

-- Remove existing cron job
SELECT cron.unschedule('read-ra-emails-every-minute');

-- Create optimized cron job with reduced email processing
SELECT cron.schedule(
  'read-ra-emails-every-minute',
  '* * * * *',  -- Every minute
  $$
    SELECT net.http_post(
      url := 'https://pgvldtxzasmuxirnlkao.supabase.co/functions/v1/read-ra-emails',
      headers := '{"Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBndmxkdHh6YXNtdXhpcm5sa2FvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTcwODk4MTcyNiwiZXhwIjoyMDI0NTU3NzI2fQ.M1MJHZJCHVJYJHlpLVJSM4EKdJr_k2zfJ_0xGz8-zw4", "Content-Type": "application/json"}',
      body := '{"maxEmails": 3, "markAsRead": true}'
    ) as result;
  $$
);

-- ══════════════════════════════════════════════════════════════
-- Fix 4: Create processed_inbox_emails Table for Email Tracking
-- ══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.processed_inbox_emails (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  message_id text NOT NULL,
  subject text,
  sender text,
  received_at timestamptz,
  processed_at timestamptz DEFAULT NOW(),
  memo_number text,
  debit_memo_id uuid REFERENCES public.debit_memos(id),
  extracted_ra_number text,
  ai_confidence real,
  ai_raw_response jsonb,
  created_at timestamptz DEFAULT NOW(),
  updated_at timestamptz DEFAULT NOW()
);

-- Add primary key if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'processed_inbox_emails_pkey' 
    AND contype = 'p'
  ) THEN
    ALTER TABLE public.processed_inbox_emails 
    ADD CONSTRAINT processed_inbox_emails_pkey PRIMARY KEY (id);
  END IF;
END $$;

-- Add unique constraint on message_id if it doesn't exist  
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'processed_inbox_emails_message_id_key' 
    AND contype = 'u'
  ) THEN
    ALTER TABLE public.processed_inbox_emails 
    ADD CONSTRAINT processed_inbox_emails_message_id_key UNIQUE (message_id);
  END IF;
END $$;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_processed_inbox_emails_memo_number 
ON public.processed_inbox_emails(memo_number);

CREATE INDEX IF NOT EXISTS idx_processed_inbox_emails_processed_at 
ON public.processed_inbox_emails(processed_at);

CREATE INDEX IF NOT EXISTS idx_processed_inbox_emails_debit_memo_id 
ON public.processed_inbox_emails(debit_memo_id);

-- Set permissions
ALTER TABLE public.processed_inbox_emails OWNER TO postgres;
GRANT ALL ON TABLE public.processed_inbox_emails TO postgres;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.processed_inbox_emails TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.processed_inbox_emails TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.processed_inbox_emails TO service_role;

-- Disable RLS (service role needs full access)
ALTER TABLE public.processed_inbox_emails DISABLE ROW LEVEL SECURITY;

-- ══════════════════════════════════════════════════════════════
-- Fix 5: Verification and Monitoring Queries
-- ══════════════════════════════════════════════════════════════

-- Check if ra_receive function exists with correct signature
SELECT 
  p.proname as function_name,
  pg_get_function_arguments(p.oid) as arguments,
  pg_get_function_result(p.oid) as return_type
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public' 
  AND p.proname = 'ra_receive';

-- Check cron job status
SELECT 
  jobname, 
  schedule, 
  active,
  jobid
FROM cron.job 
WHERE jobname = 'read-ra-emails-every-minute';

-- Check recent email processing activity
SELECT 
  COUNT(*) as total_processed_emails,
  COUNT(extracted_ra_number) as emails_with_ra,
  MAX(processed_at) as last_processed
FROM processed_inbox_emails 
WHERE processed_at > NOW() - INTERVAL '1 hour';

-- Check recent RA updates
SELECT 
  COUNT(*) as recent_ra_updates,
  MAX(ra_received_at) as last_ra_received
FROM debit_memos 
WHERE ra_received_at > NOW() - INTERVAL '1 hour';

-- ══════════════════════════════════════════════════════════════
-- SUCCESS MESSAGE
-- ══════════════════════════════════════════════════════════════

DO $$
BEGIN
  RAISE NOTICE '✅ EMAIL PROCESSING FIXES COMPLETE!';
  RAISE NOTICE '📧 ra_receive function created with correct signature';
  RAISE NOTICE '⚡ Cron job updated to process only 3 emails per minute';
  RAISE NOTICE '📊 processed_inbox_emails table created/updated';
  RAISE NOTICE '🔍 Monitor progress with the verification queries above';
  RAISE NOTICE '';
  RAISE NOTICE '⏱️  Wait 2-3 minutes and check if emails are being processed without CPU timeout errors';
END $$;