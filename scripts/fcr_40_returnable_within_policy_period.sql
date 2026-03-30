-- FCR 40 — Flag: within the stated months-before/after window, is the product actually returnable?
-- Run on Supabase after prior policy migrations.

ALTER TABLE manufacturer_return_policies
  ADD COLUMN IF NOT EXISTS returnable_within_policy_period BOOLEAN NOT NULL DEFAULT true;

COMMENT ON COLUMN manufacturer_return_policies.returnable_within_policy_period IS
  'Standard (true): returnable inside the calendar window. Inverted (false): returnable outside the window; inside → Wine Cellar until after window end. See policy engine + fcr_41 for get_destination_for_ndc.';

-- Existing rows: explicitly set true (same as default; safe if column already existed null)
UPDATE manufacturer_return_policies
SET returnable_within_policy_period = true
WHERE returnable_within_policy_period IS DISTINCT FROM true;

-- Destination from primary return policy (any returnable_within_policy_period). If DB already
-- deployed with the old filtered function, run scripts/fcr_41_get_destination_inverted_return_window.sql.
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
  ORDER BY mrp.created_at ASC
  LIMIT 1;

  RETURN v_destination;
END;
$$;
