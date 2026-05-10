-- Simple script to revert debit memo 4368eec3-cdc5-42c5-854c-70d3dc14bdf5 for testing
-- Run this before uploading credit memos to test the matching again

-- IMPORTANT: Clear received prices from items first
UPDATE debit_memo_items
SET received_price = NULL
WHERE debit_memo_id = '4368eec3-cdc5-42c5-854c-70d3dc14bdf5';

-- Then revert the main debit memo
UPDATE debit_memos
SET
  ra_status         = 'received',
  shipped_at        = NULL,
  outbound_tracking = NULL,
  shipment_group_id = NULL,
  payment_status    = 'pending',
  amount_received   = 0,
  updated_at        = NOW()
WHERE id = '4368eec3-cdc5-42c5-854c-70d3dc14bdf5';

-- Clean up any existing credit memo analysis records
DELETE FROM credit_memo_analysis 
WHERE debit_memo_id = '4368eec3-cdc5-42c5-854c-70d3dc14bdf5';

-- Verify the changes
SELECT 'Debit Memo' as type, ra_status, payment_status, amount_received FROM debit_memos WHERE id = '4368eec3-cdc5-42c5-854c-70d3dc14bdf5'
UNION ALL
SELECT 'Items with received_price' as type, COUNT(*)::text, '', 0 FROM debit_memo_items WHERE debit_memo_id = '4368eec3-cdc5-42c5-854c-70d3dc14bdf5' AND received_price IS NOT NULL;