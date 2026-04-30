-- ================================================================
-- EMAIL PROCESSING MONITORING SCRIPT
-- ================================================================
-- Run this script to monitor the email processing and RA extraction
-- ================================================================

-- Check if ra_receive function exists and has correct signature
SELECT 
  '✅ Function Status' as check_type,
  p.proname as function_name,
  pg_get_function_arguments(p.oid) as arguments,
  CASE WHEN pg_get_function_arguments(p.oid) LIKE '%p_debit_memo_id uuid, p_pdf_url text%p_ra_number text%' 
    THEN '✅ CORRECT SIGNATURE' 
    ELSE '❌ WRONG SIGNATURE' 
  END as status
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public' 
  AND p.proname = 'ra_receive'

UNION ALL

-- Check cron job status
SELECT 
  '🕐 Cron Job Status' as check_type,
  jobname as function_name,
  CONCAT('Schedule: ', schedule, ' | Active: ', active::text) as arguments,
  CASE WHEN active THEN '✅ ACTIVE' ELSE '❌ INACTIVE' END as status
FROM cron.job 
WHERE jobname = 'read-ra-emails-every-minute'

UNION ALL

-- Check recent cron job executions
SELECT 
  '📊 Recent Executions' as check_type,
  'Last 10 minutes' as function_name,
  CONCAT('Count: ', COUNT(*)::text, ' | Latest: ', COALESCE(MAX(start_time)::text, 'None')) as arguments,
  CASE 
    WHEN COUNT(*) > 5 THEN '✅ RUNNING REGULARLY'
    WHEN COUNT(*) > 0 THEN '⚠️ LIMITED ACTIVITY'
    ELSE '❌ NO RECENT ACTIVITY'
  END as status
FROM cron.job_run_details 
WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'read-ra-emails-every-minute')
  AND start_time > NOW() - INTERVAL '10 minutes'

UNION ALL

-- Check processed emails
SELECT 
  '📧 Email Processing' as check_type,
  'Last hour' as function_name,
  CONCAT(
    'Total: ', COUNT(*)::text,
    ' | With RA: ', COUNT(extracted_ra_number)::text,
    ' | Latest: ', COALESCE(MAX(processed_at)::text, 'None')
  ) as arguments,
  CASE 
    WHEN COUNT(*) > 0 THEN '✅ PROCESSING EMAILS'
    ELSE '⚠️ NO EMAILS PROCESSED'
  END as status
FROM processed_inbox_emails 
WHERE processed_at > NOW() - INTERVAL '1 hour'

UNION ALL

-- Check RA updates
SELECT 
  '🎯 RA Updates' as check_type,
  'Last hour' as function_name,
  CONCAT(
    'Count: ', COUNT(*)::text,
    ' | Latest: ', COALESCE(MAX(ra_received_at)::text, 'None')
  ) as arguments,
  CASE 
    WHEN COUNT(*) > 0 THEN '✅ RA NUMBERS UPDATED'
    ELSE '⚠️ NO RA UPDATES'
  END as status
FROM debit_memos 
WHERE ra_received_at > NOW() - INTERVAL '1 hour'

ORDER BY check_type;

-- ================================================================
-- DETAILED EMAIL PROCESSING LOG (Last 20 entries)
-- ================================================================

SELECT 
  '📋 RECENT EMAIL PROCESSING LOG' as log_header,
  '' as message_id,
  '' as memo_number,
  '' as extracted_ra,
  '' as processed_at;

SELECT 
  '' as log_header,
  COALESCE(message_id, 'Unknown') as message_id,
  COALESCE(memo_number, 'Not found') as memo_number,
  COALESCE(extracted_ra_number, 'None') as extracted_ra,
  processed_at::text as processed_at
FROM processed_inbox_emails 
ORDER BY processed_at DESC 
LIMIT 20;

-- ================================================================
-- RECENT CRON JOB RESULTS (Last 10 executions)
-- ================================================================

SELECT 
  '🔍 RECENT CRON EXECUTIONS' as execution_header,
  '' as start_time,
  '' as status,
  '' as return_message;

SELECT 
  '' as execution_header,
  start_time::text as start_time,
  status as status,
  COALESCE(return_message, 'No message') as return_message
FROM cron.job_run_details 
WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'read-ra-emails-every-minute')
ORDER BY start_time DESC 
LIMIT 10;

-- ================================================================
-- INSTRUCTIONS
-- ================================================================

SELECT 
  '📖 MONITORING INSTRUCTIONS' as instruction_type,
  'Run this script every few minutes to monitor email processing' as instruction;

SELECT 
  '🚨 TROUBLESHOOTING' as instruction_type,
  'If status shows issues, check Supabase Edge Function logs in dashboard' as instruction;

SELECT 
  '⚡ PERFORMANCE' as instruction_type,
  'Processing reduced to 3 emails/minute to prevent CPU timeouts' as instruction;

SELECT 
  '🎯 SUCCESS INDICATORS' as instruction_type,
  'Look for: Active cron job + Email processing + RA updates' as instruction;