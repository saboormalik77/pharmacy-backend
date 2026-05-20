-- Function : create_shipment_group
-- Arguments: p_memo_ids uuid[], p_box_count integer, p_notes text
-- Type     : FUNCTION
-- =============================================================

DROP FUNCTION IF EXISTS public.create_shipment_group(p_memo_ids uuid[], p_box_count integer, p_notes text) CASCADE;

CREATE OR REPLACE FUNCTION public.create_shipment_group(p_memo_ids uuid[], p_box_count integer DEFAULT 1, p_notes text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_destination TEXT;
  v_group_id    UUID;
  v_memo_count  INTEGER;
  v_memo        debit_memos;
  v_group       shipment_groups;
BEGIN
  -- Validate input
  IF p_memo_ids IS NULL OR array_length(p_memo_ids, 1) = 0 THEN
    RETURN jsonb_build_object('error', true, 'code', 400, 'message', 'At least one memo ID is required');
  END IF;

  -- Check all memos exist and have RA numbers
  FOR i IN 1..array_length(p_memo_ids, 1) LOOP
    SELECT * INTO v_memo FROM debit_memos WHERE id = p_memo_ids[i];
    IF NOT FOUND THEN
      RETURN jsonb_build_object('error', true, 'code', 404, 'message', 'Memo not found: ' || p_memo_ids[i]);
    END IF;
    
    IF v_memo.ra_number IS NULL OR TRIM(v_memo.ra_number) = '' THEN
      RETURN jsonb_build_object('error', true, 'code', 400, 'message', 'Memo ' || v_memo.memo_number || ' does not have an RA number');
    END IF;
    
    IF v_memo.ra_status != 'received' THEN
      RETURN jsonb_build_object('error', true, 'code', 400, 'message', 'Memo ' || v_memo.memo_number || ' RA status is not "received"');
    END IF;
    
    IF v_memo.shipped_at IS NOT NULL THEN
      RETURN jsonb_build_object('error', true, 'code', 400, 'message', 'Memo ' || v_memo.memo_number || ' is already shipped');
    END IF;
    
    IF v_memo.shipment_group_id IS NOT NULL THEN
      RETURN jsonb_build_object('error', true, 'code', 400, 'message', 'Memo ' || v_memo.memo_number || ' is already in a shipment group');
    END IF;

    -- Check destination consistency (case-insensitive, trimmed)
    IF v_destination IS NULL THEN
      v_destination := v_memo.destination;
    ELSIF LOWER(TRIM(COALESCE(v_destination, ''))) IS DISTINCT FROM LOWER(TRIM(COALESCE(v_memo.destination, ''))) THEN
      RETURN jsonb_build_object('error', true, 'code', 400, 'message', 'All memos must have the same destination');
    END IF;
  END LOOP;

  -- Create shipment group
  v_memo_count := array_length(p_memo_ids, 1);
  
  INSERT INTO shipment_groups (destination, box_count, total_memos, notes)
  VALUES (v_destination, p_box_count, v_memo_count, p_notes)
  RETURNING id INTO v_group_id;

  -- Assign memos to group
  UPDATE debit_memos 
  SET shipment_group_id = v_group_id
  WHERE id = ANY(p_memo_ids);

  -- Return the created group with memo details
  SELECT * INTO v_group FROM shipment_groups WHERE id = v_group_id;

  RETURN jsonb_build_object(
    'error', false,
    'data', jsonb_build_object(
      'group', _shipment_group_to_json(v_group),
      'memoIds', to_jsonb(p_memo_ids),
      'memoCount', v_memo_count
    )
  );
END;
$function$;
