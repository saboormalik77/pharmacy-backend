-- Function : get_pharmacy_return_packet
-- Arguments: p_pharmacy_id uuid, p_ref_num text
-- Type     : FUNCTION
-- =============================================================

DROP FUNCTION IF EXISTS public.get_pharmacy_return_packet(p_pharmacy_id uuid, p_ref_num text) CASCADE;

CREATE OR REPLACE FUNCTION public.get_pharmacy_return_packet(p_pharmacy_id uuid, p_ref_num text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
AS $function$
DECLARE
  v_txn          return_transactions;
  v_items        jsonb;
  v_ret_items    jsonb;
  v_nonret_items jsonb;
  v_mfg_credits  jsonb;
  v_needs_review jsonb;
  v_returnable   DECIMAL(12,2);
  v_nonret       DECIMAL(12,2);
  v_total_items  INT;
  v_total_ret_items INT;
  v_total_nonret_items INT;
BEGIN
  IF p_pharmacy_id IS NULL THEN
    RETURN jsonb_build_object('error', true, 'code', 400, 'message', 'pharmacy_id is required');
  END IF;
  IF p_ref_num IS NULL OR LENGTH(TRIM(p_ref_num)) = 0 THEN
    RETURN jsonb_build_object('error', true, 'code', 400, 'message', 'refNum is required');
  END IF;

  v_txn := _pharmacy_reports_find_txn(p_pharmacy_id, p_ref_num);
  IF v_txn.id IS NULL THEN
    RETURN jsonb_build_object('error', true, 'code', 404, 'message', 'Return not found for this pharmacy');
  END IF;

  -- All items (for raw access + total count)
  SELECT COALESCE(jsonb_agg(_rti_to_json(rti) ORDER BY
                    COALESCE(rti.proprietary_name, rti.generic_name, ''),
                    COALESCE(rti.ndc, '')), '[]'::jsonb),
         COUNT(*)::int
    INTO v_items, v_total_items
    FROM return_transaction_items rti
   WHERE rti.transaction_id = v_txn.id;

  -- Returnable items only (flat list + subtotal)
  SELECT COALESCE(jsonb_agg(_rti_to_json(rti) ORDER BY
                    COALESCE(NULLIF(TRIM(rti.manufacturer), ''), 'ZZZ'),
                    COALESCE(rti.proprietary_name, rti.generic_name, ''),
                    COALESCE(rti.ndc, '')), '[]'::jsonb),
         COALESCE(SUM(rti.estimated_value), 0),
         COUNT(*)::int
    INTO v_ret_items, v_returnable, v_total_ret_items
    FROM return_transaction_items rti
   WHERE rti.transaction_id = v_txn.id
     AND rti.return_status = 'returnable';

  -- Non-returnable items only (flat list + subtotal)
  SELECT COALESCE(jsonb_agg(_rti_to_json(rti) ORDER BY
                    COALESCE(rti.non_returnable_reason, 'Other'),
                    COALESCE(rti.proprietary_name, rti.generic_name, ''),
                    COALESCE(rti.ndc, '')), '[]'::jsonb),
         COALESCE(SUM(rti.estimated_value), 0),
         COUNT(*)::int
    INTO v_nonret_items, v_nonret, v_total_nonret_items
    FROM return_transaction_items rti
   WHERE rti.transaction_id = v_txn.id
     AND rti.return_status = 'non_returnable';

  -- Manufacturer Credit Summary — returnable items grouped by manufacturer
  SELECT COALESCE(jsonb_agg(grp ORDER BY grp->>'manufacturer'), '[]'::jsonb)
    INTO v_mfg_credits
    FROM (
      SELECT jsonb_build_object(
        'manufacturer', COALESCE(NULLIF(TRIM(manufacturer), ''), 'UNKNOWN'),
        'itemCount',    COUNT(*)::int,
        'totalValue',   ROUND(COALESCE(SUM(estimated_value), 0)::numeric, 2),
        'items',        jsonb_agg(_rti_to_json(rti) ORDER BY
                          COALESCE(proprietary_name, generic_name, ''),
                          COALESCE(ndc, ''))
      ) AS grp
      FROM return_transaction_items rti
      WHERE transaction_id = v_txn.id
        AND return_status = 'returnable'
      GROUP BY COALESCE(NULLIF(TRIM(manufacturer), ''), 'UNKNOWN')
    ) mfg;

  -- Needs Review — non-returnable items grouped by reason
  SELECT COALESCE(jsonb_agg(grp ORDER BY grp->>'reason'), '[]'::jsonb)
    INTO v_needs_review
    FROM (
      SELECT jsonb_build_object(
        'reason',       COALESCE(NULLIF(TRIM(non_returnable_reason), ''), 'Other'),
        'itemCount',    COUNT(*)::int,
        'totalValue',   ROUND(COALESCE(SUM(estimated_value), 0)::numeric, 2),
        'items',        jsonb_agg(_rti_to_json(rti) ORDER BY
                          COALESCE(proprietary_name, generic_name, ''),
                          COALESCE(ndc, ''))
      ) AS grp
      FROM return_transaction_items rti
      WHERE transaction_id = v_txn.id
        AND return_status = 'non_returnable'
      GROUP BY COALESCE(NULLIF(TRIM(non_returnable_reason), ''), 'Other')
    ) rr;

  RETURN jsonb_build_object(
    'error',       false,
    'reportType',  'return_packet',
    'reportTitle', 'Return Packet',
    'pharmacy',    _pharmacy_reports_header(p_pharmacy_id),
    'processor',   _pharmacy_reports_processor(v_txn.processor_id),
    'return', jsonb_build_object(
      'refNum',               v_txn.license_plate,
      'licensePlate',         v_txn.license_plate,
      'status',               v_txn.status,
      'serviceType',          v_txn.service_type,
      'createdAt',            v_txn.created_at,
      'finalizedAt',          v_txn.finalized_at,
      'timeIn',               v_txn.time_in,
      'timeOut',              v_txn.time_out,
      'reportDate',           TO_CHAR(COALESCE(v_txn.finalized_at, v_txn.time_out, v_txn.created_at), 'YYYY-MM-DD'),
      'serviceDate',          TO_CHAR(COALESCE(v_txn.finalized_at, v_txn.time_out, v_txn.created_at), 'MM/DD/YYYY'),
      'fedexTracking',        v_txn.fedex_tracking,
      'notes',                v_txn.notes,
      'totalItems',           v_total_items,
      'totalReturnableItems', v_total_ret_items,
      'totalNonReturnableItems', v_total_nonret_items,
      'totalReturnableValue', ROUND(v_returnable::numeric, 2),
      'totalNonReturnableValue', ROUND(v_nonret::numeric, 2),
      'totalEstimate',        ROUND((v_returnable + v_nonret)::numeric, 2)
    ),
    'items',              v_items,
    'returnableItems',    v_ret_items,
    'nonReturnableItems', v_nonret_items,
    'manufacturerCredits', v_mfg_credits,
    'needsReviewByReason', v_needs_review,
    'totals', jsonb_build_object(
      'totalItems',               v_total_items,
      'totalReturnableItems',     v_total_ret_items,
      'totalNonReturnableItems',  v_total_nonret_items,
      'totalReturnableValue',     ROUND(v_returnable::numeric, 2),
      'totalNonReturnableValue',  ROUND(v_nonret::numeric, 2),
      'grandTotal',               ROUND((v_returnable + v_nonret)::numeric, 2)
    )
  );
END;
$function$;
