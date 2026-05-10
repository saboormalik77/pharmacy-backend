-- Fully revert debit memo for testing credit memo matching
-- This script reverts both the main debit memo record AND clears
-- the received_price from debit memo items so they can be re-matched
-- against credit memos during testing.

-- Replace this UUID with the actual debit memo ID you want to revert
\set DEBIT_MEMO_ID '4368eec3-cdc5-42c5-854c-70d3dc14bdf5'

-- Step 1: Clear received prices from debit memo items
-- This is crucial - without this, items won't get re-matched
UPDATE debit_memo_items
SET
  received_price = NULL,
  updated_at = NOW()
WHERE debit_memo_id = :'DEBIT_MEMO_ID';

-- Step 2: Revert the main debit memo record back to "received / pending payment" state
UPDATE debit_memos
SET
  ra_status         = 'received',
  shipped_at        = NULL,
  outbound_tracking = NULL,
  shipment_group_id = NULL,
  payment_status    = 'pending',
  amount_received   = 0,
  updated_at        = NOW()
WHERE id = :'DEBIT_MEMO_ID';

-- Step 3: Delete any existing credit memo analysis records for this debit memo
-- This ensures a fresh start when testing credit memo uploads
DELETE FROM credit_memo_analysis 
WHERE debit_memo_id = :'DEBIT_MEMO_ID';

-- Verification queries
SELECT 
  'Debit Memo Status' as check_type,
  id,
  memo_number,
  ra_status,
  payment_status,
  amount_received,
  shipped_at,
  outbound_tracking
FROM debit_memos 
WHERE id = :'DEBIT_MEMO_ID';

SELECT 
  'Debit Memo Items' as check_type,
  COUNT(*) as total_items,
  COUNT(received_price) as items_with_received_price,
  SUM(COALESCE(ask_price, 0)) as total_ask_price,
  SUM(COALESCE(received_price, 0)) as total_received_price
FROM debit_memo_items 
WHERE debit_memo_id = :'DEBIT_MEMO_ID';

SELECT 
  'Credit Memo Analysis Records' as check_type,
  COUNT(*) as remaining_records
FROM credit_memo_analysis 
WHERE debit_memo_id = :'DEBIT_MEMO_ID';