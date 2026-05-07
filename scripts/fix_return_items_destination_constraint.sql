-- FIX: Remove hardcoded CHECK constraint on return_transaction_items.destination
-- Before: destination TEXT CHECK (destination IS NULL OR destination IN ('inmar', 'qualanex', 'pharmalink', 'other'))
-- After:  destination TEXT  (free-text, any reverse distributor name allowed)

ALTER TABLE return_transaction_items
  DROP CONSTRAINT IF EXISTS return_transaction_items_destination_check;
