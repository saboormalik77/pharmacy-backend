-- ============================================================
-- FCR-30: Auto Destination Assignment for Returnable Items
-- ============================================================
-- This script ONLY adds:
--   1. get_destination_for_ndc() helper
--   2. resolve_transaction_item_with_auto_destination() RPC
--   3. fix_missing_destinations() bulk fix
--   4. fix_batch_destinations() batch-specific fix
--
-- NOTE: update_return_transaction_item is defined in fcr_31_granular_locking.sql
--       DO NOT redefine it here.
-- ============================================================

-- 1. Function to get destination for an NDC based on manufacturer policies
CREATE OR REPLACE FUNCTION get_destination_for_ndc(p_ndc TEXT)
RETURNS TEXT LANGUAGE plpgsql STABLE SECURITY DEFINER AS $$
DECLARE
  v_labeler_id TEXT;
  v_destination TEXT;
BEGIN
  v_labeler_id := SUBSTRING(p_ndc FROM 1 FOR 5);
  
  SELECT mrp.destination INTO v_destination
  FROM manufacturer_policies mp
  JOIN manufacturer_return_policies mrp ON mp.id = mrp.manufacturer_policy_id
  WHERE mp.labeler_id = v_labeler_id
  LIMIT 1;
  
  RETURN v_destination;
END;
$$;

-- 2. Resolve item with auto-destination assignment
CREATE OR REPLACE FUNCTION resolve_transaction_item_with_auto_destination(
  p_item_id UUID, 
  p_new_status TEXT, 
  p_reason TEXT DEFAULT NULL,
  p_destination TEXT DEFAULT NULL,
  p_memo TEXT DEFAULT NULL
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_item return_transaction_items;
  v_auto_destination TEXT;
  v_updates jsonb;
BEGIN
  SELECT * INTO v_item FROM return_transaction_items WHERE id = p_item_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', true, 'code', 404, 'message', 'Item not found');
  END IF;

  IF v_item.return_status != 'tbd' THEN
    RETURN jsonb_build_object('error', true, 'code', 400, 
      'message', format('Item is already classified as "%s". Only TBD items can be resolved.', v_item.return_status));
  END IF;

  v_updates := jsonb_build_object('returnStatus', p_new_status);
  
  IF p_reason IS NOT NULL THEN
    v_updates := v_updates || jsonb_build_object('nonReturnableReason', p_reason);
  END IF;
  
  IF p_memo IS NOT NULL THEN
    v_updates := v_updates || jsonb_build_object('memo', p_memo);
  END IF;

  IF p_new_status = 'returnable' AND (p_destination IS NULL OR TRIM(p_destination) = '') THEN
    v_auto_destination := get_destination_for_ndc(v_item.ndc);
    IF v_auto_destination IS NOT NULL THEN
      v_updates := v_updates || jsonb_build_object('destination', v_auto_destination);
    END IF;
  ELSIF p_destination IS NOT NULL THEN
    v_updates := v_updates || jsonb_build_object('destination', p_destination);
  END IF;

  RETURN update_return_transaction_item(p_item_id, v_updates);
END;
$$;

-- 3. Bulk fix existing returnable items without destinations
CREATE OR REPLACE FUNCTION fix_missing_destinations()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_item RECORD;
  v_destination TEXT;
  v_updated_count INTEGER := 0;
  v_skipped_count INTEGER := 0;
BEGIN
  FOR v_item IN 
    SELECT rti.id, rti.ndc, rt.status as return_status
    FROM return_transaction_items rti
    JOIN return_transactions rt ON rt.id = rti.transaction_id
    WHERE rti.return_status = 'returnable' 
    AND (rti.destination IS NULL OR TRIM(rti.destination) = '')
  LOOP
    v_destination := get_destination_for_ndc(v_item.ndc);
    
    IF v_destination IS NOT NULL THEN
      -- Use the RPC function which handles granular locking properly
      PERFORM update_return_transaction_item(
        v_item.id, 
        jsonb_build_object('destination', v_destination)
      );
      v_updated_count := v_updated_count + 1;
    ELSE
      v_skipped_count := v_skipped_count + 1;
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'error', false, 
    'message', format('Updated %s items. Skipped %s (no matching policy).', v_updated_count, v_skipped_count),
    'updated_count', v_updated_count,
    'skipped_count', v_skipped_count
  );
END;
$$;

-- 4. Fix destinations for a specific batch
CREATE OR REPLACE FUNCTION fix_batch_destinations(p_batch_id UUID)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_item RECORD;
  v_destination TEXT;
  v_updated_count INTEGER := 0;
BEGIN
  FOR v_item IN 
    SELECT rti.id, rti.ndc
    FROM return_transaction_items rti
    JOIN return_transactions rt ON rt.id = rti.transaction_id
    WHERE rt.batch_id = p_batch_id
    AND rti.return_status = 'returnable' 
    AND (rti.destination IS NULL OR TRIM(rti.destination) = '')
  LOOP
    v_destination := get_destination_for_ndc(v_item.ndc);
    
    IF v_destination IS NOT NULL THEN
      PERFORM update_return_transaction_item(
        v_item.id, 
        jsonb_build_object('destination', v_destination)
      );
      v_updated_count := v_updated_count + 1;
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'error', false, 
    'message', format('Fixed %s items in batch with auto-assigned destinations', v_updated_count),
    'updated_count', v_updated_count
  );
END;
$$;