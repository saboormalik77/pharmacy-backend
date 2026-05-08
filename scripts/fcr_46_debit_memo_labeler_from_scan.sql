-- FCR 46 — Debit memo labeler_name fallback from scanned product data
-- When manufacturer_policies has no row (or empty name), use manufacturer stored on
-- return_transaction_items from barcode/NDC lookup so debit memos are not blank.

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

  DELETE FROM debit_memos WHERE batch_id = p_batch_id;

  FOR v_group IN
    SELECT
      rt.pharmacy_id,
      rti.destination,
      COALESCE(SUBSTRING(rti.ndc FROM 1 FOR 5), 'UNKWN') AS labeler_id,
      COUNT(*)                              AS item_count,
      COALESCE(SUM(rti.estimated_value), 0) AS ask_value,
      MAX(NULLIF(TRIM(rti.manufacturer), '')) AS scanned_manufacturer
    FROM return_transaction_items rti
    JOIN return_transactions rt ON rt.id = rti.transaction_id
    WHERE rt.batch_id = p_batch_id
      AND rti.return_status = 'returnable'
    GROUP BY rt.pharmacy_id, rti.destination,
             COALESCE(SUBSTRING(rti.ndc FROM 1 FOR 5), 'UNKWN')
    ORDER BY rt.pharmacy_id, rti.destination
  LOOP
    v_memo_number := 'DM-' || v_month_code || '-' || LPAD(v_seq::text, 4, '0');

    SELECT NULLIF(TRIM(manufacturer_name), '') INTO v_policy_name
    FROM manufacturer_policies
    WHERE labeler_id = v_group.labeler_id
    LIMIT 1;

    INSERT INTO debit_memos (
      batch_id, pharmacy_id, memo_number, destination,
      labeler_id, labeler_name, total_items, total_ask_value, amount_requested
    ) VALUES (
      p_batch_id, v_group.pharmacy_id, v_memo_number, v_group.destination,
      v_group.labeler_id,
      COALESCE(
        v_policy_name,
        NULLIF(TRIM(v_group.scanned_manufacturer), ''),
        ''
      ),
      v_group.item_count, v_group.ask_value, v_group.ask_value
    ) RETURNING * INTO v_memo;

    INSERT INTO debit_memo_items (
      debit_memo_id, transaction_item_id, ndc, product_name,
      quantity, ask_price, lot_number, expiration_date
    )
    SELECT
      v_memo.id,
      rti.id,
      rti.ndc,
      COALESCE(rti.proprietary_name, rti.generic_name, ''),
      rti.quantity,
      rti.estimated_value,
      rti.lot_number,
      rti.expiration_date
    FROM return_transaction_items rti
    JOIN return_transactions rt ON rt.id = rti.transaction_id
    WHERE rt.batch_id = p_batch_id
      AND rt.pharmacy_id = v_group.pharmacy_id
      AND rti.return_status = 'returnable'
      AND COALESCE(rti.destination, '') = COALESCE(v_group.destination, '')
      AND COALESCE(SUBSTRING(rti.ndc FROM 1 FOR 5), 'UNKWN') = v_group.labeler_id;

    v_memo_count  := v_memo_count + 1;
    v_total_value := v_total_value + v_group.ask_value;
    v_seq         := v_seq + 1;
  END LOOP;

  UPDATE return_batches SET
    total_debit_memos = v_memo_count,
    total_value       = v_total_value
  WHERE id = p_batch_id
  RETURNING * INTO v_batch;

  RETURN jsonb_build_object(
    'error',          false,
    'data',           _batch_to_json(v_batch),
    'memosGenerated', v_memo_count
  );
END;
$$;

GRANT EXECUTE ON FUNCTION generate_debit_memos_for_batch TO authenticated, anon, service_role;
