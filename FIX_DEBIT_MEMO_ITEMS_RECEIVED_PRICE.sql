-- ============================================================================
-- FIX: Item-level received_price tracking for debit_memo_items
-- ============================================================================
-- This script creates a new function to record received prices PER ITEM,
-- and recalculates the memo totals from the item-level data.
--
-- This enables accurate return-level tracking where:
--   - Each item can have its own received_price (or NULL if not received)
--   - Memo totals are calculated from the sum of item received prices
--   - Returns can be queried for their true ask vs received values
-- ============================================================================

-- ============================================================================
-- STEP 1: Create function to record item-level payments
-- ============================================================================
-- This function accepts a debit_memo_id and a JSONB array of item payments:
--   [{"itemId": "uuid", "receivedPrice": 123.45}, ...]
--
-- It updates each item's received_price and recalculates the memo totals.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.record_debit_memo_item_payments(
  p_debit_memo_id uuid,
  p_items jsonb,
  p_payment_date timestamp with time zone DEFAULT now(),
  p_reference text DEFAULT NULL::text,
  p_notes text DEFAULT NULL::text,
  p_credit_memo_url text DEFAULT NULL::text
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_memo              debit_memos;
  v_item              jsonb;
  v_item_id           uuid;
  v_received_price    numeric;
  v_total_received    numeric;
  v_total_ask         numeric;
  v_status            text;
  v_updated_count     int := 0;
BEGIN
  -- Fetch the debit memo
  SELECT * INTO v_memo FROM debit_memos WHERE id = p_debit_memo_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', true, 'code', 404, 'message', 'Debit memo not found');
  END IF;

  -- Validate input
  IF p_items IS NULL OR jsonb_array_length(p_items) = 0 THEN
    RETURN jsonb_build_object('error', true, 'code', 400, 'message', 'Items array is required');
  END IF;

  -- Update each item's received_price
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_item_id := (v_item ->> 'itemId')::uuid;
    v_received_price := (v_item ->> 'receivedPrice')::numeric;

    IF v_item_id IS NOT NULL THEN
      UPDATE debit_memo_items
      SET received_price = ROUND(v_received_price, 2)
      WHERE id = v_item_id
        AND debit_memo_id = p_debit_memo_id;

      IF FOUND THEN
        v_updated_count := v_updated_count + 1;
      END IF;
    END IF;
  END LOOP;

  -- Recalculate memo totals from items
  SELECT 
    COALESCE(SUM(ask_price * quantity), 0),
    COALESCE(SUM(COALESCE(received_price, 0) * quantity), 0)
  INTO v_total_ask, v_total_received
  FROM debit_memo_items
  WHERE debit_memo_id = p_debit_memo_id;

  -- Determine payment status
  IF v_total_received >= v_total_ask AND v_total_ask > 0 THEN
    v_status := 'paid';
  ELSIF v_total_received > 0 THEN
    v_status := 'partial';
  ELSE
    v_status := 'pending';
  END IF;

  -- Update the debit memo with recalculated totals
  UPDATE debit_memos SET
    amount_received      = v_total_received,
    total_received_value = v_total_received,
    payment_status       = v_status,
    payment_received_at  = CASE WHEN v_total_received > 0 THEN COALESCE(p_payment_date, now()) ELSE payment_received_at END,
    payment_reference    = COALESCE(NULLIF(TRIM(p_reference), ''), payment_reference),
    payment_notes        = COALESCE(NULLIF(TRIM(p_notes), ''), payment_notes),
    credit_memo_url      = COALESCE(p_credit_memo_url, credit_memo_url)
  WHERE id = p_debit_memo_id
  RETURNING * INTO v_memo;

  RETURN jsonb_build_object(
    'error', false,
    'data', jsonb_build_object(
      'memo', _debit_memo_to_json(v_memo),
      'updatedItemsCount', v_updated_count,
      'totalAsk', v_total_ask,
      'totalReceived', v_total_received
    )
  );
END;
$$;

ALTER FUNCTION public.record_debit_memo_item_payments(uuid, jsonb, timestamp with time zone, text, text, text) OWNER TO postgres;

-- ============================================================================
-- STEP 2: Create function to update a single item's received_price
-- ============================================================================
-- Simpler function for updating one item at a time

CREATE OR REPLACE FUNCTION public.update_debit_memo_item_received(
  p_item_id uuid,
  p_received_price numeric
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_item              debit_memo_items;
  v_memo              debit_memos;
  v_total_received    numeric;
  v_total_ask         numeric;
  v_status            text;
BEGIN
  -- Fetch the item
  SELECT * INTO v_item FROM debit_memo_items WHERE id = p_item_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', true, 'code', 404, 'message', 'Debit memo item not found');
  END IF;

  -- Validate amount
  IF p_received_price IS NOT NULL AND p_received_price < 0 THEN
    RETURN jsonb_build_object('error', true, 'code', 400, 'message', 'received_price must be >= 0');
  END IF;

  -- Update the item's received_price
  UPDATE debit_memo_items
  SET received_price = ROUND(p_received_price, 2)
  WHERE id = p_item_id
  RETURNING * INTO v_item;

  -- Recalculate memo totals from all items
  SELECT 
    COALESCE(SUM(ask_price * quantity), 0),
    COALESCE(SUM(COALESCE(received_price, 0) * quantity), 0)
  INTO v_total_ask, v_total_received
  FROM debit_memo_items
  WHERE debit_memo_id = v_item.debit_memo_id;

  -- Determine payment status
  IF v_total_received >= v_total_ask AND v_total_ask > 0 THEN
    v_status := 'paid';
  ELSIF v_total_received > 0 THEN
    v_status := 'partial';
  ELSE
    v_status := 'pending';
  END IF;

  -- Update the debit memo with recalculated totals
  UPDATE debit_memos SET
    amount_received      = v_total_received,
    total_received_value = v_total_received,
    payment_status       = v_status
  WHERE id = v_item.debit_memo_id
  RETURNING * INTO v_memo;

  RETURN jsonb_build_object(
    'error', false,
    'data', jsonb_build_object(
      'item', jsonb_build_object(
        'id', v_item.id,
        'ndc', v_item.ndc,
        'productName', v_item.product_name,
        'quantity', v_item.quantity,
        'askPrice', v_item.ask_price,
        'receivedPrice', v_item.received_price
      ),
      'memoTotalAsk', v_total_ask,
      'memoTotalReceived', v_total_received,
      'memoPaymentStatus', v_status
    )
  );
END;
$$;

ALTER FUNCTION public.update_debit_memo_item_received(uuid, numeric) OWNER TO postgres;

-- ============================================================================
-- STEP 3: Create a function to recalculate memo totals from items
-- ============================================================================
-- Utility function to sync memo totals with item-level received_prices
-- Useful if items were updated directly or for data consistency

CREATE OR REPLACE FUNCTION public.recalculate_debit_memo_totals(
  p_debit_memo_id uuid
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_memo              debit_memos;
  v_total_received    numeric;
  v_total_ask         numeric;
  v_status            text;
BEGIN
  -- Fetch the debit memo
  SELECT * INTO v_memo FROM debit_memos WHERE id = p_debit_memo_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', true, 'code', 404, 'message', 'Debit memo not found');
  END IF;

  -- Calculate totals from items
  SELECT 
    COALESCE(SUM(ask_price * quantity), 0),
    COALESCE(SUM(COALESCE(received_price, 0) * quantity), 0)
  INTO v_total_ask, v_total_received
  FROM debit_memo_items
  WHERE debit_memo_id = p_debit_memo_id;

  -- Determine payment status
  IF v_total_received >= v_total_ask AND v_total_ask > 0 THEN
    v_status := 'paid';
  ELSIF v_total_received > 0 THEN
    v_status := 'partial';
  ELSE
    v_status := 'pending';
  END IF;

  -- Update the debit memo
  UPDATE debit_memos SET
    amount_received      = v_total_received,
    total_received_value = v_total_received,
    payment_status       = v_status
  WHERE id = p_debit_memo_id
  RETURNING * INTO v_memo;

  RETURN jsonb_build_object(
    'error', false,
    'data', jsonb_build_object(
      'memoId', v_memo.id,
      'totalAsk', v_total_ask,
      'totalReceived', v_total_received,
      'paymentStatus', v_status
    )
  );
END;
$$;

ALTER FUNCTION public.recalculate_debit_memo_totals(uuid) OWNER TO postgres;

-- ============================================================================
-- STEP 4: Keep existing payment_record functions but update to use item sum
-- ============================================================================
-- When a bulk amount_received is passed, we still update the memo total
-- but we DON'T auto-populate item received_prices (that should be done via
-- the new item-level functions above)

-- No changes needed to payment_record - it still works for memo-level
-- totals. The item-level tracking is done via the new functions.

-- ============================================================================
-- VERIFICATION QUERIES (run these after the script)
-- ============================================================================
-- 
-- 1. Check items with received_price populated:
--    SELECT dmi.id, dmi.ndc, dmi.product_name, dmi.ask_price, dmi.received_price
--    FROM debit_memo_items dmi
--    WHERE dmi.received_price IS NOT NULL;
-- 
-- 2. Return-wise ask vs received (TRUE item-level tracking):
--    SELECT
--        rt.id                    AS return_id,
--        p.pharmacy_name          AS pharmacy,
--        rt.created_at            AS return_date,
--        rti.proprietary_name     AS drug_name,
--        rti.ndc,
--        dmi.ask_price,
--        dmi.received_price,
--        dmi.ask_price - COALESCE(dmi.received_price, 0) AS difference
--    FROM return_transactions rt
--    JOIN pharmacy p ON p.id = rt.pharmacy_id
--    JOIN return_transaction_items rti ON rti.transaction_id = rt.id
--    JOIN debit_memo_items dmi ON dmi.transaction_item_id = rti.id
--    ORDER BY rt.created_at DESC;
--
-- 3. Aggregated per return:
--    SELECT
--        rt.id                    AS return_id,
--        p.pharmacy_name          AS pharmacy,
--        COUNT(dmi.id)            AS item_count,
--        SUM(dmi.ask_price)       AS total_ask,
--        SUM(COALESCE(dmi.received_price, 0)) AS total_received,
--        SUM(dmi.ask_price - COALESCE(dmi.received_price, 0)) AS difference
--    FROM return_transactions rt
--    JOIN pharmacy p ON p.id = rt.pharmacy_id
--    JOIN return_transaction_items rti ON rti.transaction_id = rt.id
--    JOIN debit_memo_items dmi ON dmi.transaction_item_id = rti.id
--    GROUP BY rt.id, p.pharmacy_name
--    ORDER BY rt.created_at DESC;
--
-- ============================================================================
-- USAGE EXAMPLES
-- ============================================================================
--
-- 1. Update multiple items at once:
--    SELECT record_debit_memo_item_payments(
--      'memo-uuid-here',
--      '[
--        {"itemId": "item1-uuid", "receivedPrice": 95.00},
--        {"itemId": "item2-uuid", "receivedPrice": 180.00}
--      ]'::jsonb,
--      now(),
--      'CHECK-12345',
--      'Partial payment received'
--    );
--
-- 2. Update a single item:
--    SELECT update_debit_memo_item_received('item-uuid-here', 95.00);
--
-- 3. Recalculate memo totals from items:
--    SELECT recalculate_debit_memo_totals('memo-uuid-here');
--
-- ============================================================================
-- DONE
-- ============================================================================
