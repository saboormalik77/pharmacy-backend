-- ============================================================
-- FCR-54: Exclude non-returnable items from debit memo generation
-- ============================================================
-- Business rule change: Non-returnable items should NOT be included
-- in debit memos at all. Previously they were included with ask_price=0
-- but now they should be completely excluded from memo generation.
--
-- This reverses the FCR-52 logic that added non-returnable items to memos.

-- ────────────────────────────────────────────────────────────
-- 1. Update generate_debit_memos_for_batch to exclude non-returnable items
-- ────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION generate_debit_memos_for_batch(p_batch_id UUID)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_batch       return_batches;
  v_memo_count  INTEGER := 0;
  v_total_value DECIMAL(12,2) := 0;
  v_group       RECORD;
  v_memo        debit_memos;
  v_memo_number TEXT;
  v_seq         INTEGER := 1;
  v_month_code  TEXT;
  v_policy_name TEXT;
  v_labeler_id  TEXT;
BEGIN
  SELECT * INTO v_batch FROM return_batches WHERE id = p_batch_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', true, 'code', 404, 'message', 'Batch not found');
  END IF;

  IF v_batch.status NOT IN ('closed', 'submitted') THEN
    RETURN jsonb_build_object('error', true, 'code', 400,
      'message', format('Batch must be closed before generating debit memos. Current status: "%s".', v_batch.status));
  END IF;

  v_month_code := TO_CHAR(v_batch.batch_month, 'MMYY');

  -- Delete existing memos for this batch
  DELETE FROM debit_memos WHERE batch_id = p_batch_id;

  -- ONLY process returnable items (completely exclude non-returnable)
  FOR v_group IN
    SELECT
      rt.pharmacy_id,
      rti.destination,
      COALESCE(NULLIF(TRIM(rti.manufacturer), ''), 'Unknown Manufacturer') AS manufacturer_name,
      COUNT(*)                                            AS item_count,
      COALESCE(SUM(rti.estimated_value), 0)               AS ask_value,
      MODE() WITHIN GROUP (ORDER BY COALESCE(SUBSTRING(rti.ndc FROM 1 FOR 5), 'UNKWN')) AS primary_labeler_id
    FROM return_transaction_items rti
    JOIN return_transactions rt ON rt.id = rti.transaction_id
    WHERE rt.batch_id = p_batch_id
      AND rti.return_status = 'returnable'  -- ONLY returnable items
    GROUP BY rt.pharmacy_id, rti.destination,
             COALESCE(NULLIF(TRIM(rti.manufacturer), ''), 'Unknown Manufacturer')
    ORDER BY rt.pharmacy_id, rti.destination, manufacturer_name
  LOOP
    v_memo_number := 'DM-' || v_month_code || '-' || LPAD(v_seq::text, 4, '0');
    v_labeler_id := v_group.primary_labeler_id;

    -- Get policy name
    SELECT NULLIF(TRIM(manufacturer_name), '') INTO v_policy_name
    FROM manufacturer_policies
    WHERE labeler_id = v_labeler_id
    LIMIT 1;

    -- Create debit memo
    INSERT INTO debit_memos (
      batch_id, pharmacy_id, memo_number, destination,
      labeler_id, labeler_name, total_items, total_ask_value, amount_requested
    ) VALUES (
      p_batch_id, v_group.pharmacy_id, v_memo_number, v_group.destination,
      v_labeler_id,
      COALESCE(v_policy_name, v_group.manufacturer_name, ''),
      v_group.item_count, v_group.ask_value, v_group.ask_value
    ) RETURNING * INTO v_memo;

    -- Add ONLY returnable items to memo
    INSERT INTO debit_memo_items (
      debit_memo_id, transaction_item_id, ndc, product_name,
      quantity, ask_price, lot_number, expiration_date,
      is_non_returnable, non_returnable_reason
    )
    SELECT
      v_memo.id,
      rti.id,
      rti.ndc,
      COALESCE(rti.proprietary_name, rti.generic_name, ''),
      rti.quantity,
      rti.estimated_value,  -- Use actual price for returnable items
      rti.lot_number,
      rti.expiration_date,
      FALSE,  -- Always false since we only include returnable items
      NULL    -- Always null since we only include returnable items
    FROM return_transaction_items rti
    JOIN return_transactions rt ON rt.id = rti.transaction_id
    WHERE rt.batch_id = p_batch_id
      AND rt.pharmacy_id = v_group.pharmacy_id
      AND rti.return_status = 'returnable'  -- ONLY returnable items
      AND COALESCE(rti.destination, '') = COALESCE(v_group.destination, '')
      AND COALESCE(NULLIF(TRIM(rti.manufacturer), ''), 'Unknown Manufacturer') = v_group.manufacturer_name;

    v_memo_count  := v_memo_count + 1;
    v_total_value := v_total_value + v_group.ask_value;
    v_seq         := v_seq + 1;
  END LOOP;

  -- Note: Removed the "Non-returnable-only groups" logic entirely
  -- Non-returnable items are now completely excluded from debit memos

  RETURN jsonb_build_object(
    'error', false,
    'batchId', p_batch_id,
    'totalValue', v_total_value,
    'memosGenerated', v_memo_count
  );
END;
$$;

GRANT EXECUTE ON FUNCTION generate_debit_memos_for_batch TO authenticated, anon, service_role;

-- ────────────────────────────────────────────────────────────
-- 2. Update close_batch to exclude non-returnable items as well
-- ────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION close_batch(p_batch_id UUID)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_batch       return_batches;
  v_memo_count  INTEGER := 0;
  v_total_value DECIMAL(12,2) := 0;
  v_group       RECORD;
  v_memo        debit_memos;
  v_memo_number TEXT;
  v_seq         INTEGER := 1;
  v_month_code  TEXT;
  v_policy_name TEXT;
  v_labeler_id  TEXT;
BEGIN
  SELECT * INTO v_batch FROM return_batches WHERE id = p_batch_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', true, 'code', 404, 'message', 'Batch not found');
  END IF;

  IF v_batch.status != 'open' THEN
    RETURN jsonb_build_object('error', true, 'code', 400,
      'message', format('Cannot close batch with status "%s". Must be open.', v_batch.status));
  END IF;

  -- Update batch status to closed
  UPDATE return_batches SET status = 'closed', closed_at = NOW() WHERE id = p_batch_id;

  v_month_code := TO_CHAR(v_batch.batch_month, 'MMYY');

  -- ONLY process returnable items (completely exclude non-returnable)
  FOR v_group IN
    SELECT
      rt.pharmacy_id,
      rti.destination,
      COALESCE(NULLIF(TRIM(rti.manufacturer), ''), 'Unknown Manufacturer') AS manufacturer_name,
      COUNT(*)                                            AS item_count,
      COALESCE(SUM(rti.estimated_value), 0)               AS ask_value,
      MODE() WITHIN GROUP (ORDER BY COALESCE(SUBSTRING(rti.ndc FROM 1 FOR 5), 'UNKWN')) AS primary_labeler_id
    FROM return_transaction_items rti
    JOIN return_transactions rt ON rt.id = rti.transaction_id
    WHERE rt.batch_id = p_batch_id
      AND rti.return_status = 'returnable'  -- ONLY returnable items
    GROUP BY rt.pharmacy_id, rti.destination,
             COALESCE(NULLIF(TRIM(rti.manufacturer), ''), 'Unknown Manufacturer')
    ORDER BY rt.pharmacy_id, rti.destination, manufacturer_name
  LOOP
    v_memo_number := 'DM-' || v_month_code || '-' || LPAD(v_seq::text, 4, '0');
    v_labeler_id := v_group.primary_labeler_id;

    -- Get policy name
    SELECT NULLIF(TRIM(manufacturer_name), '') INTO v_policy_name
    FROM manufacturer_policies
    WHERE labeler_id = v_labeler_id
    LIMIT 1;

    -- Create debit memo
    INSERT INTO debit_memos (
      batch_id, pharmacy_id, memo_number, destination,
      labeler_id, labeler_name, total_items, total_ask_value, amount_requested
    ) VALUES (
      p_batch_id, v_group.pharmacy_id, v_memo_number, v_group.destination,
      v_labeler_id,
      COALESCE(v_policy_name, v_group.manufacturer_name, ''),
      v_group.item_count, v_group.ask_value, v_group.ask_value
    ) RETURNING * INTO v_memo;

    -- Add ONLY returnable items to memo
    INSERT INTO debit_memo_items (
      debit_memo_id, transaction_item_id, ndc, product_name,
      quantity, ask_price, lot_number, expiration_date,
      is_non_returnable, non_returnable_reason
    )
    SELECT
      v_memo.id,
      rti.id,
      rti.ndc,
      COALESCE(rti.proprietary_name, rti.generic_name, ''),
      rti.quantity,
      rti.estimated_value,  -- Use actual price for returnable items
      rti.lot_number,
      rti.expiration_date,
      FALSE,  -- Always false since we only include returnable items
      NULL    -- Always null since we only include returnable items
    FROM return_transaction_items rti
    JOIN return_transactions rt ON rt.id = rti.transaction_id
    WHERE rt.batch_id = p_batch_id
      AND rt.pharmacy_id = v_group.pharmacy_id
      AND rti.return_status = 'returnable'  -- ONLY returnable items
      AND COALESCE(rti.destination, '') = COALESCE(v_group.destination, '')
      AND COALESCE(NULLIF(TRIM(rti.manufacturer), ''), 'Unknown Manufacturer') = v_group.manufacturer_name;

    v_memo_count  := v_memo_count + 1;
    v_total_value := v_total_value + v_group.ask_value;
    v_seq         := v_seq + 1;
  END LOOP;

  -- Note: Removed the "Non-returnable-only groups" logic entirely
  -- Non-returnable items are now completely excluded from debit memos

  RETURN jsonb_build_object(
    'error', false,
    'batchId', p_batch_id,
    'totalValue', v_total_value,
    'memosGenerated', v_memo_count
  );
END;
$$;

GRANT EXECUTE ON FUNCTION close_batch TO authenticated, anon, service_role;

-- ────────────────────────────────────────────────────────────
-- 3. Update comments to reflect the new behavior
-- ────────────────────────────────────────────────────────────

COMMENT ON FUNCTION close_batch(UUID) IS
  'Close a batch + generate debit memos; FCR-54: non-returnable items are now completely excluded from memos.';
COMMENT ON FUNCTION generate_debit_memos_for_batch(UUID) IS
  'Re-generate memos for a closed batch; FCR-54: non-returnable items are completely excluded.';
COMMENT ON FUNCTION get_debit_memo(UUID) IS
  'Returns memo + returnable items + non_returnable items split arrays (FCR-52); FCR-54: non-returnable items excluded from memo generation but still returned for display.';