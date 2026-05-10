-- ============================================================
-- FIX: Pharmacy Name Display Everywhere (MINIMAL SAFE VERSION)
-- ============================================================
-- This script ONLY does:
--   1. Backfills pharmacy.pharmacy_name where missing
--   2. Adds a trigger to keep it populated on future writes
--   3. Creates a helper function for future use
--
-- We DO NOT rewrite the _to_json functions because:
--   - They already work when pharmacy_name has data
--   - Rewriting risks column mismatches with the live DB schema
--
-- Once pharmacy_name is backfilled, ALL lists/tables automatically
-- show proper pharmacy names — no helper rewrite needed.
-- ============================================================


-- ============================================================
-- STEP 1: Backfill pharmacy_name
-- ============================================================

-- Use `name` column where pharmacy_name is empty
UPDATE public.pharmacy
SET pharmacy_name = name
WHERE (pharmacy_name IS NULL OR TRIM(pharmacy_name) = '')
  AND name IS NOT NULL
  AND TRIM(name) <> '';

-- Fall back to email prefix where both are empty
UPDATE public.pharmacy
SET pharmacy_name = COALESCE(
    NULLIF(TRIM(SPLIT_PART(email, '@', 1)), ''),
    'Pharmacy ' || SUBSTRING(id::text, 1, 8)
)
WHERE (pharmacy_name IS NULL OR TRIM(pharmacy_name) = '');


-- ============================================================
-- STEP 2: Trigger to keep pharmacy_name populated on future writes
-- ============================================================

CREATE OR REPLACE FUNCTION public._ensure_pharmacy_name()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.pharmacy_name IS NULL OR TRIM(NEW.pharmacy_name) = '' THEN
    NEW.pharmacy_name := COALESCE(
      NULLIF(TRIM(NEW.name), ''),
      NULLIF(TRIM(SPLIT_PART(NEW.email, '@', 1)), ''),
      'Pharmacy ' || SUBSTRING(NEW.id::text, 1, 8)
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_ensure_pharmacy_name ON public.pharmacy;
CREATE TRIGGER trg_ensure_pharmacy_name
BEFORE INSERT OR UPDATE ON public.pharmacy
FOR EACH ROW
EXECUTE FUNCTION public._ensure_pharmacy_name();


-- ============================================================
-- STEP 3: Centralized helper (optional, for future use)
-- ============================================================

CREATE OR REPLACE FUNCTION public._resolve_pharmacy_name(p_pharmacy_id uuid)
RETURNS text
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(
    NULLIF(TRIM(p.pharmacy_name), ''),
    NULLIF(TRIM(p.name), ''),
    NULLIF(TRIM(SPLIT_PART(p.email, '@', 1)), ''),
    'Unknown Pharmacy'
  )
  FROM public.pharmacy p
  WHERE p.id = p_pharmacy_id;
$$;

GRANT EXECUTE ON FUNCTION public._resolve_pharmacy_name(uuid) TO anon, authenticated, service_role;


-- ============================================================
-- VERIFICATION
-- ============================================================
-- After running this, verify with:
--
-- 1) No pharmacies with empty name (should return 0 rows):
--    SELECT id, name, pharmacy_name, email FROM public.pharmacy
--    WHERE pharmacy_name IS NULL OR TRIM(pharmacy_name) = '';
--
-- 2) All existing _to_json helpers now return proper names:
--    SELECT _rt_to_json(rt)->'pharmacyName' FROM return_transactions rt LIMIT 5;
--    SELECT _debit_memo_to_json(d)->'pharmacyName' FROM debit_memos d LIMIT 5;
--    SELECT _wc_to_json(w)->'pharmacyName' FROM wine_cellar w LIMIT 5;
--
-- ============================================================
