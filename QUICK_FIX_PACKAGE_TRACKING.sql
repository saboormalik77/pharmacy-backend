-- QUICK FIX: Update package tracking keys from "1" to "package1" format
-- Run this in your Supabase SQL Editor

-- Fix ALL return transactions that have numeric-only keys in package_tracking
UPDATE return_transactions 
SET package_tracking = (
    SELECT jsonb_object_agg(
        CASE 
            WHEN key ~ '^[0-9]+$' THEN 'package' || key
            ELSE key
        END, 
        value
    )
    FROM jsonb_each_text(package_tracking)
)
WHERE package_tracking IS NOT NULL
  AND package_tracking != 'null'::jsonb
  AND package_tracking != '{}'::jsonb
  AND EXISTS (
      SELECT 1 FROM jsonb_object_keys(package_tracking) k 
      WHERE k ~ '^[0-9]+$'
  );

-- Verify the fix worked
SELECT 
    id,
    license_plate,
    fedex_tracking,
    package_tracking,
    fedex_labels
FROM return_transactions 
WHERE package_tracking IS NOT NULL 
  AND package_tracking != 'null'::jsonb
  AND package_tracking != '{}'::jsonb
ORDER BY updated_at DESC
LIMIT 5;