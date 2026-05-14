-- Function : get_pharmacy_destruction_non_controls
-- Arguments: p_pharmacy_id uuid, p_ref_num text
-- Type     : FUNCTION
-- =============================================================

DROP FUNCTION IF EXISTS public.get_pharmacy_destruction_non_controls(p_pharmacy_id uuid, p_ref_num text) CASCADE;

CREATE OR REPLACE FUNCTION public.get_pharmacy_destruction_non_controls(p_pharmacy_id uuid, p_ref_num text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
AS $function$
DECLARE
  v_txn   return_transactions;
  v_items jsonb;
  v_count INT;
  v_total DECIMAL(12,2);
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

  SELECT COALESCE(jsonb_agg(_rti_to_json(rti) ORDER BY
                    COALESCE(NULLIF(TRIM(rti.manufacturer), ''), 'ZZZ'),
                    COALESCE(rti.proprietary_name, rti.generic_name, ''),
                    COALESCE(rti.ndc, '')), '[]'::jsonb),
         COUNT(*)::int,
         COALESCE(SUM(rti.estimated_value), 0)
    INTO v_items, v_count, v_total
    FROM return_transaction_items rti
   WHERE rti.transaction_id = v_txn.id
     AND _normalize_dea_schedule(rti.dea_schedule) IS NULL
     AND (
       rti.return_status = 'non_returnable'
       OR rti.destination = 'destruction'
     );

  RETURN jsonb_build_object(
    'error',       false,
    'reportType',  'destruction_non_controls',
    'reportTitle', 'Proof of Destruction — Non Controls',
    'pharmacy',    _pharmacy_reports_header(p_pharmacy_id),
    'processor',   _pharmacy_reports_processor(v_txn.processor_id),
    'return', jsonb_build_object(
      'refNum',       v_txn.license_plate,
      'licensePlate', v_txn.license_plate,
      'status',       v_txn.status,
      'createdAt',    v_txn.created_at,
      'finalizedAt',  v_txn.finalized_at,
      'reportDate',   TO_CHAR(COALESCE(v_txn.finalized_at, v_txn.time_out, v_txn.created_at), 'YYYY-MM-DD'),
      'serviceDate',  TO_CHAR(COALESCE(v_txn.finalized_at, v_txn.time_out, v_txn.created_at), 'MM/DD/YYYY'),
      'receivedAt',   TO_CHAR(COALESCE(v_txn.time_in, v_txn.created_at), 'MM/DD/YYYY'),
      'verifiedAt',   CASE WHEN v_txn.verified_at IS NOT NULL
                           THEN TO_CHAR(v_txn.verified_at, 'MM/DD/YYYY') ELSE '' END,
      'shippedAt',    CASE WHEN v_txn.finalized_at IS NOT NULL
                           THEN TO_CHAR(v_txn.finalized_at, 'MM/DD/YYYY')
                           WHEN v_txn.time_out IS NOT NULL
                           THEN TO_CHAR(v_txn.time_out, 'MM/DD/YYYY')
                           ELSE '' END,
      'destroyedAt',  ''
    ),
    'items',         v_items,
    'totals', jsonb_build_object(
      'totalItems',         v_count,
      'totalEstimatedValue', ROUND(v_total::numeric, 2)
    )
  );
END;
$function$;
