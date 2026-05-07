-- FCR 45 — create_shipment_group: treat destination as same when names match case-insensitively
-- (e.g. "Inmar" vs "inmar"). Stored shipment_groups.destination remains the first memo's value.

CREATE OR REPLACE FUNCTION create_shipment_group(
  p_memo_ids     UUID[],
  p_box_count    INTEGER DEFAULT 1,
  p_notes        TEXT DEFAULT NULL
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_destination TEXT;
  v_group_id    UUID;
  v_memo_count  INTEGER;
  v_memo        debit_memos;
  v_group       shipment_groups;
  v_group_ids   UUID[];
  v_single_id   UUID;
BEGIN
  IF p_memo_ids IS NULL OR array_length(p_memo_ids, 1) = 0 THEN
    RETURN jsonb_build_object('error', true, 'code', 400, 'message', 'At least one memo ID is required');
  END IF;

  FOR i IN 1..array_length(p_memo_ids, 1) LOOP
    SELECT * INTO v_memo FROM debit_memos WHERE id = p_memo_ids[i];
    IF NOT FOUND THEN
      RETURN jsonb_build_object('error', true, 'code', 404, 'message', 'Memo not found: ' || p_memo_ids[i]);
    END IF;

    IF v_memo.ra_number IS NULL OR TRIM(v_memo.ra_number) = '' THEN
      RETURN jsonb_build_object('error', true, 'code', 400, 'message', 'Memo ' || v_memo.memo_number || ' does not have an RA number');
    END IF;

    IF LOWER(TRIM(COALESCE(v_memo.ra_status, ''))) != 'received' THEN
      RETURN jsonb_build_object('error', true, 'code', 400, 'message', 'Memo ' || v_memo.memo_number || ' RA status is not "received"');
    END IF;

    IF v_memo.shipped_at IS NOT NULL THEN
      RETURN jsonb_build_object('error', true, 'code', 400, 'message', 'Memo ' || v_memo.memo_number || ' is already shipped');
    END IF;

    IF v_destination IS NULL THEN
      v_destination := v_memo.destination;
    ELSIF LOWER(TRIM(COALESCE(v_destination, ''))) IS DISTINCT FROM LOWER(TRIM(COALESCE(v_memo.destination, ''))) THEN
      RETURN jsonb_build_object('error', true, 'code', 400, 'message', 'All memos must have the same destination');
    END IF;
  END LOOP;

  v_memo_count := array_length(p_memo_ids, 1);

  SELECT ARRAY_AGG(DISTINCT d.shipment_group_id)
  INTO v_group_ids
  FROM debit_memos d
  WHERE d.id = ANY(p_memo_ids)
    AND d.shipment_group_id IS NOT NULL;

  IF v_group_ids IS NULL THEN
    INSERT INTO shipment_groups (destination, box_count, total_memos, notes)
    VALUES (v_destination, COALESCE(p_box_count, 1), v_memo_count, p_notes)
    RETURNING id INTO v_group_id;

    UPDATE debit_memos
    SET shipment_group_id = v_group_id
    WHERE id = ANY(p_memo_ids);

    SELECT * INTO v_group FROM shipment_groups WHERE id = v_group_id;

    RETURN jsonb_build_object(
      'error', false,
      'data', jsonb_build_object(
        'group', _shipment_group_to_json(v_group),
        'memoIds', to_jsonb(p_memo_ids),
        'memoCount', v_memo_count
      )
    );
  END IF;

  IF array_length(v_group_ids, 1) > 1 THEN
    RETURN jsonb_build_object('error', true, 'code', 400, 'message', 'Selected memos belong to different shipment groups');
  END IF;

  v_single_id := v_group_ids[1];

  IF EXISTS (
    SELECT 1 FROM debit_memos d
    WHERE d.id = ANY(p_memo_ids)
      AND d.shipment_group_id IS DISTINCT FROM v_single_id
  ) THEN
    RETURN jsonb_build_object('error', true, 'code', 400, 'message', 'Some selected memos are not in the same shipment group');
  END IF;

  SELECT * INTO v_group FROM shipment_groups WHERE id = v_single_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', true, 'code', 404, 'message', 'Shipment group not found');
  END IF;

  IF v_group.shipped_at IS NOT NULL THEN
    RETURN jsonb_build_object('error', true, 'code', 400, 'message', 'This shipment group has already been shipped');
  END IF;

  UPDATE shipment_groups SET
    box_count = COALESCE(NULLIF(p_box_count, 0), box_count),
    total_memos = v_memo_count,
    notes = COALESCE(p_notes, notes)
  WHERE id = v_single_id;

  SELECT * INTO v_group FROM shipment_groups WHERE id = v_single_id;

  RETURN jsonb_build_object(
    'error', false,
    'data', jsonb_build_object(
      'group', _shipment_group_to_json(v_group),
      'memoIds', to_jsonb(p_memo_ids),
      'memoCount', v_memo_count
    )
  );
END;
$$;
