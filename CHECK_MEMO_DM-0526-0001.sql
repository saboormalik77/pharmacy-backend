-- ================================================================
-- DIAGNOSTIC: Check Status of Memo DM-0526-0001
-- ================================================================
-- This script checks the current payment status and data for the 
-- specific memo showing in your Unpaid Memos list
-- ================================================================

-- Check the specific memo DM-0526-0001
SELECT 
  '📋 Current Status' as info,
  memo_number,
  labeler_name as manufacturer,
  destination,
  amount_requested,
  amount_received,
  (amount_requested - amount_received) as outstanding,
  payment_status,
  payment_received_at,
  payment_reference,
  payment_notes,
  created_at,
  updated_at
FROM debit_memos 
WHERE memo_number = 'DM-0526-0001';

-- Check what the payment status SHOULD be based on the amounts
SELECT 
  '🎯 Expected Status' as info,
  memo_number,
  amount_requested,
  amount_received,
  payment_status as current_status,
  CASE 
    WHEN amount_requested <= 0 AND amount_received > 0 THEN 'paid'
    WHEN amount_requested > 0 AND amount_received >= amount_requested THEN 'paid'
    WHEN amount_requested > 0 AND amount_received > 0 AND amount_received < amount_requested THEN 'partial'
    WHEN amount_received = 0 THEN 'pending'
    ELSE 'unknown'
  END as expected_status,
  CASE 
    WHEN payment_status = (
      CASE 
        WHEN amount_requested <= 0 AND amount_received > 0 THEN 'paid'
        WHEN amount_requested > 0 AND amount_received >= amount_requested THEN 'paid'
        WHEN amount_requested > 0 AND amount_received > 0 AND amount_received < amount_requested THEN 'partial'
        WHEN amount_received = 0 THEN 'pending'
        ELSE 'unknown'
      END
    ) THEN '✅ CORRECT'
    ELSE '❌ NEEDS FIX'
  END as status_check
FROM debit_memos 
WHERE memo_number = 'DM-0526-0001';

-- Check if there are other memos with similar issues
SELECT 
  '🔍 Similar Issues' as info,
  COUNT(*) as memo_count,
  'Memos with amount_requested=0 but payment_status!=paid despite receiving payment' as description
FROM debit_memos 
WHERE amount_requested <= 0 
  AND amount_received > 0 
  AND payment_status != 'paid';

-- Show details of all problematic memos
SELECT 
  '⚠️  Problem Memos' as info,
  memo_number,
  labeler_name,
  amount_requested,
  amount_received,
  payment_status,
  'Should be PAID' as note
FROM debit_memos 
WHERE amount_requested <= 0 
  AND amount_received > 0 
  AND payment_status != 'paid'
ORDER BY created_at DESC
LIMIT 10;

-- Instructions for fixing
SELECT 
  '🛠️ Fix Instructions' as info,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM debit_memos 
      WHERE memo_number = 'DM-0526-0001' 
        AND amount_requested <= 0 
        AND amount_received > 0 
        AND payment_status != 'paid'
    ) THEN 'Run FIX_PAYMENT_STATUS_LOGIC.sql to fix the payment status logic'
    WHEN EXISTS (
      SELECT 1 FROM debit_memos 
      WHERE memo_number = 'DM-0526-0001' 
        AND payment_status = 'paid'
    ) THEN 'Status is already correct - memo should disappear from Unpaid list'
    ELSE 'Memo not found or status unclear'
  END as recommendation;