-- =============================================================================
-- DANGER: Irreversibly removes one return and related rows.
-- Run in Supabase SQL editor or psql as a user that owns these tables.
--
-- 1) Set the license plate below.
-- 2) Review the batch / debit-memo warnings in comments.
-- 3) Run inside a transaction; COMMIT if the preview looks right.
-- =============================================================================

DO $$
DECLARE
  v_lp          TEXT := '051026-23HA-431B-B';  -- <<< change if needed
  v_rt_id       UUID;
  v_batch_id    UUID;
  v_item_count  INT;
  v_dm_ids      UUID[];
BEGIN
  SELECT id, batch_id INTO v_rt_id, v_batch_id
  FROM return_transactions
  WHERE license_plate = v_lp;

  IF v_rt_id IS NULL THEN
    RAISE EXCEPTION 'No return_transactions row for license_plate=%', v_lp;
  END IF;

  SELECT COUNT(*)::INT INTO v_item_count FROM return_transaction_items WHERE transaction_id = v_rt_id;
  RAISE NOTICE 'Deleting return % (license %) — % line items. batch_id=%',
    v_rt_id, v_lp, v_item_count, v_batch_id;

  -- Debit memo lines tied to this return’s scanned items (must go before item cascade delete).
  SELECT ARRAY_AGG(DISTINCT dmi.debit_memo_id) INTO v_dm_ids
  FROM debit_memo_items dmi
  WHERE dmi.transaction_item_id IN (
    SELECT id FROM return_transaction_items WHERE transaction_id = v_rt_id
  );

  IF v_dm_ids IS NOT NULL THEN
    RAISE NOTICE 'Touching debit_memo ids: %', v_dm_ids;
  END IF;

  -- Optional: credit memo analysis rows (if table exists in your DB)
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'credit_memo_analysis'
  ) AND v_dm_ids IS NOT NULL THEN
    DELETE FROM credit_memo_analysis ca
    WHERE ca.debit_memo_id = ANY(v_dm_ids);
  END IF;

  DELETE FROM debit_memo_items
  WHERE transaction_item_id IN (
    SELECT id FROM return_transaction_items WHERE transaction_id = v_rt_id
  );

  -- Optional: drop debit memos that now have zero lines (uncomment if you want batch memos cleaned up).
  -- DELETE FROM debit_memos dm
  -- WHERE NOT EXISTS (SELECT 1 FROM debit_memo_items d WHERE d.debit_memo_id = dm.id);

  -- Locked returns block CASCADE deletes on items — disable trigger for this maintenance delete only.
  ALTER TABLE return_transaction_items DISABLE TRIGGER prevent_locked_return_item_updates_trigger;

  DELETE FROM return_transactions WHERE id = v_rt_id;

  ALTER TABLE return_transaction_items ENABLE TRIGGER prevent_locked_return_item_updates_trigger;

  -- Refresh batch rollups if this return was assigned to a monthly batch.
  IF v_batch_id IS NOT NULL THEN
    UPDATE return_batches
    SET
      total_returns = (
        SELECT COUNT(*)::INT FROM return_transactions WHERE batch_id = v_batch_id
      ),
      total_value = (
        SELECT COALESCE(SUM(total_returnable_value), 0)
        FROM return_transactions
        WHERE batch_id = v_batch_id
      ),
      updated_at = NOW()
    WHERE id = v_batch_id;

    RAISE NOTICE 'Updated return_batches totals for batch %', v_batch_id;
  END IF;

  RAISE NOTICE 'Done. Return % removed.', v_lp;
END $$;
