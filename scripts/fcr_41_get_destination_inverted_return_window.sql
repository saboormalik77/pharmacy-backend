-- FCR 41 — get_destination_for_ndc must return a destination for inverted return windows
-- (returnable_within_policy_period = false). FCR 40 filtered those rows out, so NDCs under
-- such policies never got a destination. Inverted policies still define destination for returnable items.

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

COMMENT ON COLUMN manufacturer_return_policies.returnable_within_policy_period IS
  'If true (standard): returnable during the computed calendar window; before = too early (Wine Cellar), after = too late. If false (inverted): returnable outside that window; inside the window = Wine Cellar until the day after window end.';
