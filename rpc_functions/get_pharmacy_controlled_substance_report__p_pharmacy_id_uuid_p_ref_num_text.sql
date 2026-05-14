-- Function : get_pharmacy_controlled_substance_report
-- Arguments: p_pharmacy_id uuid, p_ref_num text
-- Type     : FUNCTION
-- =============================================================

DROP FUNCTION IF EXISTS public.get_pharmacy_controlled_substance_report(p_pharmacy_id uuid, p_ref_num text) CASCADE;

CREATE OR REPLACE FUNCTION public.get_pharmacy_controlled_substance_report(p_pharmacy_id uuid, p_ref_num text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
AS $function$
DECLARE
  v_txn     return_transactions;
  v_items   jsonb;
  v_count   INT;
  v_total   DECIMAL(12,2);
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

  -- All DEA-scheduled items, normalized and ordered by schedule
  -- (II first, then III, IV, V, I).
  SELECT COALESCE(jsonb_agg(_rti_to_json(rti) ORDER BY
                    CASE _normalize_dea_schedule(rti.dea_schedule)
                      WHEN 'II'  THEN 1
                      WHEN 'III' THEN 2
                      WHEN 'IV'  THEN 3
                      WHEN 'V'   THEN 4
                      WHEN 'I'   THEN 5
                      ELSE 9 END,
                    COALESCE(rti.proprietary_name, rti.generic_name, '')), '[]'::jsonb),
         COUNT(*)::int,
         COALESCE(SUM(rti.estimated_value), 0)
    INTO v_items, v_count, v_total
    FROM return_transaction_items rti
   WHERE rti.transaction_id = v_txn.id
     AND _normalize_dea_schedule(rti.dea_schedule) IS NOT NULL;

  RETURN jsonb_build_object(
    'error',       false,
    'reportType',  'controlled_substance',
    'reportTitle', 'Controlled Substance Report',
    'pharmacy',    _pharmacy_reports_header(p_pharmacy_id),
    'processor',   _pharmacy_reports_processor(v_txn.processor_id),
    'return', jsonb_build_object(
      'refNum',        v_txn.license_plate,
      'debitMemoNum',  v_txn.license_plate,
      'licensePlate',  v_txn.license_plate,
      'status',        v_txn.status,
      'createdAt',     v_txn.created_at,
      'finalizedAt',   v_txn.finalized_at,
      'reportDate',    TO_CHAR(COALESCE(v_txn.finalized_at, v_txn.time_out, v_txn.created_at), 'YYYY-MM-DD'),
      'serviceDate',   TO_CHAR(COALESCE(v_txn.finalized_at, v_txn.time_out, v_txn.created_at), 'MM/DD/YYYY')
    ),
    'items',         v_items,
    'totals', jsonb_build_object(
      'totalItems',         v_count,
      'totalEstimatedValue', ROUND(v_total::numeric, 2)
    )
  );
END;
$function$;
