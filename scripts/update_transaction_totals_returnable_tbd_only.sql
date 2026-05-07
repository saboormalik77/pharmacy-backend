-- Update all existing transaction totals to only count returnable and TBD items
-- This fixes the return list table to show correct item counts

UPDATE return_transactions SET
  total_items = (
    SELECT COUNT(*) 
    FROM return_transaction_items 
    WHERE transaction_id = return_transactions.id 
    AND return_status IN ('returnable', 'tbd')
  )
WHERE id IN (
  SELECT DISTINCT transaction_id 
  FROM return_transaction_items
);