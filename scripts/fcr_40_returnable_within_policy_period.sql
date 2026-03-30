-- FCR 40 — Flag: within the stated months-before/after window, is the product actually returnable?
-- Run on Supabase after prior policy migrations.

ALTER TABLE manufacturer_return_policies
  ADD COLUMN IF NOT EXISTS returnable_within_policy_period BOOLEAN NOT NULL DEFAULT true;

COMMENT ON COLUMN manufacturer_return_policies.returnable_within_policy_period IS
  'If true, items with expiration dates inside the computed window are returnable (subject to partial rules). If false, the window is informational only and items remain non-returnable while in-window.';

-- Existing rows: explicitly set true (same as default; safe if column already existed null)
UPDATE manufacturer_return_policies
SET returnable_within_policy_period = true
WHERE returnable_within_policy_period IS DISTINCT FROM true;

-- Prefer destinations from return policies that allow returns in-window
CREATE OR REPLACE FUNCTION get_destination_for_ndc(p_ndc TEXT)
RETURNS TEXT LANGUAGE plpgsql STABLE SECURITY DEFINER AS $$
DECLARE
  v_labeler_id TEXT;
  v_destination TEXT;
BEGIN
  v_labeler_id := SUBSTRING(REGEXP_REPLACE(COALESCE(p_ndc, ''), '[^0-9]', '', 'g') FROM 1 FOR 5);
  IF v_labeler_id IS NULL OR LENGTH(TRIM(v_labeler_id)) < 5 THEN
    RETURN NULL;
  END IF;

  SELECT mrp.destination INTO v_destination
  FROM manufacturer_policies mp
  JOIN manufacturer_return_policies mrp ON mp.id = mrp.manufacturer_policy_id
  WHERE mp.labeler_id = v_labeler_id
    AND COALESCE(mrp.returnable_within_policy_period, true) = true
  ORDER BY mrp.created_at ASC
  LIMIT 1;

  RETURN v_destination;
END;
$$;
