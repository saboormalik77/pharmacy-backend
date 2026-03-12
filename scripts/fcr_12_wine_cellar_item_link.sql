-- ============================================================
-- FCR Module 12: Wine Cellar ↔ Return Transaction Item Link
-- ============================================================
-- This migration adds wine_cellar_id support to the
-- update_return_transaction_item RPC so the auto-add and
-- manual-move flows can link items to their wine cellar entry.
-- ============================================================

-- 1. Add FK constraint (if not exists) on return_transaction_items.wine_cellar_id
-- ────────────────────────────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_rti_wine_cellar'
      AND table_name = 'return_transaction_items'
  ) THEN
    ALTER TABLE return_transaction_items
      ADD CONSTRAINT fk_rti_wine_cellar
      FOREIGN KEY (wine_cellar_id) REFERENCES wine_cellar(id)
      ON DELETE SET NULL;
  END IF;
END $$;

-- 2. Create index on wine_cellar_id for efficient lookups
-- ────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_rti_wine_cellar_id
  ON return_transaction_items (wine_cellar_id)
  WHERE wine_cellar_id IS NOT NULL;

-- 3. Update RPC: update_return_transaction_item
--    Add wine_cellar_id to the UPDATE clause
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_return_transaction_item(p_item_id UUID, p_updates jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_item return_transaction_items;
  v_txn  RECORD;
  v_price DECIMAL;
  v_qty   INTEGER;
BEGIN
  SELECT * INTO v_item FROM return_transaction_items WHERE id = p_item_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', true, 'code', 404, 'message', 'Item not found');
  END IF;

  SELECT status INTO v_txn FROM return_transactions WHERE id = v_item.transaction_id;
  IF v_txn.status IN ('finalized', 'closed_out', 'received') THEN
    RETURN jsonb_build_object('error', true, 'code', 400,
      'message', 'Cannot update items on a finalized return');
  END IF;

  -- Apply updates (only non-null fields from p_updates)
  UPDATE return_transaction_items SET
    ndc                   = COALESCE(NULLIF(TRIM(p_updates->>'ndc'), ''),               ndc),
    ndc_10                = COALESCE(NULLIF(TRIM(p_updates->>'ndc10'), ''),              ndc_10),
    proprietary_name      = COALESCE(NULLIF(TRIM(p_updates->>'proprietaryName'), ''),    proprietary_name),
    generic_name          = COALESCE(NULLIF(TRIM(p_updates->>'genericName'), ''),        generic_name),
    manufacturer          = COALESCE(NULLIF(TRIM(p_updates->>'manufacturer'), ''),       manufacturer),
    package_description   = COALESCE(NULLIF(TRIM(p_updates->>'packageDescription'), ''), package_description),
    dosage_form           = COALESCE(NULLIF(TRIM(p_updates->>'dosageForm'), ''),          dosage_form),
    strength              = COALESCE(NULLIF(TRIM(p_updates->>'strength'), ''),            strength),
    route                 = COALESCE(NULLIF(TRIM(p_updates->>'route'), ''),               route),
    lot_number            = COALESCE(NULLIF(TRIM(p_updates->>'lotNumber'), ''),           lot_number),
    serial_number         = COALESCE(NULLIF(TRIM(p_updates->>'serialNumber'), ''),        serial_number),
    expiration_date       = CASE WHEN p_updates ? 'expirationDate'
                                 THEN (p_updates->>'expirationDate')::date
                                 ELSE expiration_date END,
    standard_price        = CASE WHEN p_updates ? 'standardPrice'
                                 THEN (p_updates->>'standardPrice')::decimal
                                 ELSE standard_price END,
    quantity              = CASE WHEN p_updates ? 'quantity'
                                 THEN (p_updates->>'quantity')::int
                                 ELSE quantity END,
    full_package_size     = CASE WHEN p_updates ? 'fullPackageSize'
                                 THEN (p_updates->>'fullPackageSize')::int
                                 ELSE full_package_size END,
    is_partial            = CASE WHEN p_updates ? 'isPartial'
                                 THEN (p_updates->>'isPartial')::boolean
                                 ELSE is_partial END,
    partial_percentage    = CASE WHEN p_updates ? 'partialPercentage'
                                 THEN (p_updates->>'partialPercentage')::decimal
                                 ELSE partial_percentage END,
    return_status         = COALESCE(NULLIF(TRIM(p_updates->>'returnStatus'), ''),       return_status),
    non_returnable_reason = CASE WHEN p_updates ? 'nonReturnableReason'
                                 THEN NULLIF(TRIM(p_updates->>'nonReturnableReason'), '')
                                 ELSE non_returnable_reason END,
    return_reason         = COALESCE(NULLIF(TRIM(p_updates->>'returnReason'), ''),       return_reason),
    destination           = CASE WHEN p_updates ? 'destination'
                                 THEN NULLIF(TRIM(p_updates->>'destination'), '')
                                 ELSE destination END,
    dea_schedule          = COALESCE(NULLIF(TRIM(p_updates->>'deaSchedule'), ''),        dea_schedule),
    dea_form_222_required = CASE WHEN p_updates ? 'deaForm222Required'
                                 THEN (p_updates->>'deaForm222Required')::boolean
                                 ELSE dea_form_222_required END,
    memo                  = COALESCE(NULLIF(TRIM(p_updates->>'memo'), ''),               memo),
    co_status             = COALESCE(NULLIF(TRIM(p_updates->>'coStatus'), ''),           co_status),
    bmp_status            = COALESCE(NULLIF(TRIM(p_updates->>'bmpStatus'), ''),          bmp_status),
    -- NEW: wine_cellar_id link
    wine_cellar_id        = CASE WHEN p_updates ? 'wineCellarId'
                                 THEN (p_updates->>'wineCellarId')::UUID
                                 ELSE wine_cellar_id END
  WHERE id = p_item_id
  RETURNING * INTO v_item;

  -- Recalculate estimated_value considering partials
  v_price := COALESCE(v_item.standard_price, 0);
  v_qty   := COALESCE(v_item.quantity, 1);
  
  UPDATE return_transaction_items 
  SET estimated_value = CASE 
    WHEN is_partial = true AND partial_percentage IS NOT NULL 
    THEN v_price * v_qty * (partial_percentage / 100)
    ELSE v_price * v_qty 
  END
  WHERE id = p_item_id
  RETURNING * INTO v_item;

  -- Update transaction totals
  UPDATE return_transactions SET
    total_items = (SELECT COUNT(*) FROM return_transaction_items WHERE transaction_id = v_item.transaction_id),
    total_returnable_value = (
      SELECT COALESCE(SUM(estimated_value), 0) FROM return_transaction_items
       WHERE transaction_id = v_item.transaction_id AND return_status = 'returnable'
    ),
    total_non_returnable_value = (
      SELECT COALESCE(SUM(estimated_value), 0) FROM return_transaction_items
       WHERE transaction_id = v_item.transaction_id AND return_status = 'non_returnable'
    )
  WHERE id = v_item.transaction_id;

  RETURN jsonb_build_object('error', false, 'data', _rti_to_json(v_item));
END;
$$;
