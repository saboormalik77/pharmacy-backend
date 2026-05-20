-- Function : warehouse_get_verification_summary
-- Arguments: p_transaction_id uuid
-- Type     : FUNCTION
-- =============================================================

DROP FUNCTION IF EXISTS public.warehouse_get_verification_summary(p_transaction_id uuid) CASCADE;

CREATE OR REPLACE FUNCTION public.warehouse_get_verification_summary(p_transaction_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
AS $function$
DECLARE
  v_txn             return_transactions;
  v_items           jsonb;
  v_total_items     INTEGER;
  v_correct         INTEGER;
  v_damaged         INTEGER;
  v_missing         INTEGER;
  v_wrong           INTEGER;
  v_verified_total  INTEGER;  -- NEW: total verified items (any verification_status)
  v_unverified      INTEGER;
  v_surplus         jsonb;
  v_surplus_count   INTEGER;
  v_discrepancies   jsonb;
  v_disc_open       INTEGER;
  v_disc_total      INTEGER;
BEGIN
  SELECT * INTO v_txn FROM return_transactions WHERE id = p_transaction_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', true, 'code', 404,
      'message', 'Return transaction not found');
  END IF;

  -- Items with verification status
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'id',                 rti.id,
      'ndc',                rti.ndc,
      'proprietaryName',    rti.proprietary_name,
      'genericName',        rti.generic_name,
      'manufacturer',       rti.manufacturer,
      'lotNumber',          rti.lot_number,
      'expirationDate',     rti.expiration_date,
      'quantity',           rti.quantity,
      'actualQuantity',     rti.actual_quantity,
      'verified',           rti.verified,
      'verificationStatus', rti.verification_status,
      'conditionNotes',     rti.condition_notes,
      'returnStatus',       rti.return_status,
      'estimatedValue',     rti.estimated_value,
      'wineCellarId',       rti.wine_cellar_id,
      'destination',        rti.destination,
      'nonReturnableReason', rti.non_returnable_reason
    ) ORDER BY rti.created_at
  ), '[]'::jsonb)
  INTO v_items
  FROM return_transaction_items rti
  WHERE rti.transaction_id = p_transaction_id;

  SELECT COUNT(*) INTO v_total_items
    FROM return_transaction_items WHERE transaction_id = p_transaction_id;
  SELECT COUNT(*) INTO v_correct
    FROM return_transaction_items WHERE transaction_id = p_transaction_id AND verification_status = 'correct';
  SELECT COUNT(*) INTO v_damaged
    FROM return_transaction_items WHERE transaction_id = p_transaction_id AND verification_status = 'damaged';
  SELECT COUNT(*) INTO v_missing
    FROM return_transaction_items WHERE transaction_id = p_transaction_id AND verification_status = 'missing';
  SELECT COUNT(*) INTO v_wrong
    FROM return_transaction_items WHERE transaction_id = p_transaction_id AND verification_status = 'wrong_item';
  
  -- FCR-52 Fix: Count all items that have been through verification
  -- (i.e., have a verification_status set) as "verified"
  SELECT COUNT(*) INTO v_verified_total
    FROM return_transaction_items 
   WHERE transaction_id = p_transaction_id 
     AND verification_status IS NOT NULL;
  
  -- Calculate unverified as total minus verified (not minus specific statuses)
  v_unverified := v_total_items - v_verified_total;

  -- Surplus
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'id',                wsi.id,
      'ndc',               wsi.ndc,
      'productName',       wsi.product_name,
      'manufacturer',      wsi.manufacturer,
      'lotNumber',         wsi.lot_number,
      'expirationDate',    wsi.expiration_date,
      'quantity',          wsi.quantity,
      'warehouseLocation', wsi.warehouse_location,
      'condition',         wsi.condition,
      'notes',             wsi.notes,
      'status',            wsi.status,
      'createdAt',         wsi.created_at
    ) ORDER BY wsi.created_at
  ), '[]'::jsonb), COUNT(*)
  INTO v_surplus, v_surplus_count
  FROM warehouse_surplus_items wsi
  WHERE wsi.transaction_id = p_transaction_id;

  -- Discrepancies
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'id',               wd.id,
      'itemId',           wd.item_id,
      'type',             wd.type,
      'ndc',              wd.ndc,
      'productName',      wd.product_name,
      'expectedQuantity', wd.expected_quantity,
      'actualQuantity',   wd.actual_quantity,
      'notes',            wd.notes,
      'status',           wd.status,
      'resolutionNotes',  wd.resolution_notes,
      'resolvedBy',       wd.resolved_by,
      'resolvedAt',       wd.resolved_at,
      'createdAt',        wd.created_at
    ) ORDER BY wd.created_at DESC
  ), '[]'::jsonb), COUNT(*),
  COUNT(*) FILTER (WHERE wd.status = 'open')
  INTO v_discrepancies, v_disc_total, v_disc_open
  FROM warehouse_discrepancies wd
  WHERE wd.transaction_id = p_transaction_id;

  RETURN jsonb_build_object(
    'error', false,
    'data', jsonb_build_object(
      'transaction', _rt_to_json(v_txn),
      'items',       v_items,
      'counts', jsonb_build_object(
        'totalItems',    v_total_items,
        'correct',       v_correct,
        'damaged',       v_damaged,
        'missing',       v_missing,
        'wrongItem',     v_wrong,
        'unverified',    v_unverified,
        'surplus',       v_surplus_count
      ),
      'surplus',        v_surplus,
      'discrepancies',  v_discrepancies,
      'discrepancyCounts', jsonb_build_object(
        'total', v_disc_total,
        'open',  v_disc_open
      )
    )
  );
END;
$function$;
