-- ============================================================
-- Fix: Update Manufacturer Policies with Correct Names from Scanned Data
-- ============================================================
-- ISSUE: The manufacturer_policies table has incorrect manufacturer names,
--        but the scanned data in return_transaction_items has the correct names.
--
-- SOLUTION:
--   1. Update manufacturer_policies with correct names from scanned items
--   2. Update debit_memos.labeler_name with correct names from scanned items
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- STEP 1: View current discrepancies
-- ────────────────────────────────────────────────────────────

-- Show labeler_ids where scanned manufacturer differs from policy name
SELECT 
  COALESCE(SUBSTRING(rti.ndc FROM 1 FOR 5), 'UNKWN') AS labeler_id,
  mp.manufacturer_name AS current_policy_name,
  rti.manufacturer AS scanned_manufacturer_name,
  COUNT(*) AS item_count
FROM return_transaction_items rti
LEFT JOIN manufacturer_policies mp 
  ON COALESCE(SUBSTRING(rti.ndc FROM 1 FOR 5), 'UNKWN') = mp.labeler_id
WHERE rti.manufacturer IS NOT NULL 
  AND TRIM(rti.manufacturer) <> ''
  AND (mp.manufacturer_name IS NULL 
       OR mp.manufacturer_name IS DISTINCT FROM rti.manufacturer)
GROUP BY 
  COALESCE(SUBSTRING(rti.ndc FROM 1 FOR 5), 'UNKWN'),
  mp.manufacturer_name,
  rti.manufacturer
ORDER BY item_count DESC
LIMIT 50;

-- ────────────────────────────────────────────────────────────
-- STEP 2: Update manufacturer_policies with correct names from scanned data
-- ────────────────────────────────────────────────────────────

-- Get the most common (mode) manufacturer name for each labeler_id from scanned items
WITH correct_names AS (
  SELECT DISTINCT ON (labeler_id)
    COALESCE(SUBSTRING(rti.ndc FROM 1 FOR 5), 'UNKWN') AS labeler_id,
    rti.manufacturer AS correct_manufacturer_name,
    COUNT(*) AS usage_count
  FROM return_transaction_items rti
  WHERE rti.manufacturer IS NOT NULL 
    AND TRIM(rti.manufacturer) <> ''
  GROUP BY 
    COALESCE(SUBSTRING(rti.ndc FROM 1 FOR 5), 'UNKWN'),
    rti.manufacturer
  ORDER BY labeler_id, COUNT(*) DESC
)
UPDATE manufacturer_policies mp
SET 
  manufacturer_name = cn.correct_manufacturer_name,
  updated_at = NOW()
FROM correct_names cn
WHERE mp.labeler_id = cn.labeler_id
  AND cn.correct_manufacturer_name IS NOT NULL
  AND TRIM(cn.correct_manufacturer_name) <> ''
  AND (mp.manufacturer_name IS NULL 
       OR mp.manufacturer_name IS DISTINCT FROM cn.correct_manufacturer_name);

-- ────────────────────────────────────────────────────────────
-- STEP 3: Update debit_memos.labeler_name with correct names from scanned items
-- ────────────────────────────────────────────────────────────

-- Get correct manufacturer name for each debit memo from its items
WITH memo_correct_names AS (
  SELECT DISTINCT ON (dm.id)
    dm.id AS debit_memo_id,
    rti.manufacturer AS correct_manufacturer_name
  FROM debit_memos dm
  JOIN debit_memo_items dmi ON dmi.debit_memo_id = dm.id
  JOIN return_transaction_items rti ON rti.id = dmi.transaction_item_id
  WHERE rti.manufacturer IS NOT NULL 
    AND TRIM(rti.manufacturer) <> ''
  ORDER BY dm.id, rti.manufacturer
)
UPDATE debit_memos dm
SET 
  labeler_name = mcn.correct_manufacturer_name,
  updated_at = NOW()
FROM memo_correct_names mcn
WHERE dm.id = mcn.debit_memo_id
  AND mcn.correct_manufacturer_name IS NOT NULL
  AND (dm.labeler_name IS NULL 
       OR dm.labeler_name IS DISTINCT FROM mcn.correct_manufacturer_name);

-- ────────────────────────────────────────────────────────────
-- STEP 4: Verify the updates
-- ────────────────────────────────────────────────────────────

-- Show updated manufacturer_policies
SELECT 
  mp.labeler_id,
  mp.manufacturer_name,
  mp.updated_at
FROM manufacturer_policies mp
WHERE mp.updated_at > NOW() - INTERVAL '5 minutes'
ORDER BY mp.updated_at DESC
LIMIT 20;

-- Show updated debit_memos
SELECT 
  dm.id,
  dm.memo_number,
  dm.labeler_id,
  dm.labeler_name,
  dm.updated_at
FROM debit_memos dm
WHERE dm.updated_at > NOW() - INTERVAL '5 minutes'
ORDER BY dm.updated_at DESC
LIMIT 20;
