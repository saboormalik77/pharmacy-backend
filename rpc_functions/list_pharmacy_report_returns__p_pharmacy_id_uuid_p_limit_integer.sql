-- Function : list_pharmacy_report_returns
-- Arguments: p_pharmacy_id uuid, p_limit integer
-- Type     : FUNCTION
-- =============================================================

DROP FUNCTION IF EXISTS public.list_pharmacy_report_returns(p_pharmacy_id uuid, p_limit integer) CASCADE;

CREATE OR REPLACE FUNCTION public.list_pharmacy_report_returns(p_pharmacy_id uuid, p_limit integer DEFAULT 200)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
AS $function$
DECLARE
  v_items jsonb;
BEGIN
  IF p_pharmacy_id IS NULL THEN
    RETURN jsonb_build_object('error', true, 'code', 400, 'message', 'pharmacy_id is required');
  END IF;

  SELECT COALESCE(jsonb_agg(row_json ORDER BY ordering DESC), '[]'::jsonb)
    INTO v_items
    FROM (
      SELECT
        jsonb_build_object(
          'refNum',       rt.license_plate,
          'licensePlate', rt.license_plate,
          'date',         TO_CHAR(COALESCE(rt.finalized_at, rt.time_out, rt.created_at), 'YYYY-MM-DD'),
          'rawDate',      COALESCE(rt.finalized_at, rt.time_out, rt.created_at),
          'amount',       ROUND(COALESCE(rt.total_returnable_value, 0)
                             + COALESCE(rt.total_non_returnable_value, 0), 2),
          'returnableValue',     COALESCE(rt.total_returnable_value, 0),
          'nonReturnableValue',  COALESCE(rt.total_non_returnable_value, 0),
          'totalItems',          COALESCE(rt.total_items, 0),
          'status',              rt.status,
          'serviceType',         rt.service_type,
          'transactionId',       rt.id,
          -- Pre-formatted label (matches reports.html exactly)
          'label', TO_CHAR(COALESCE(rt.finalized_at, rt.time_out, rt.created_at), 'YYYY-MM-DD')
                || ' | ' || rt.license_plate
                || ' | $' || TO_CHAR(
                     COALESCE(rt.total_returnable_value, 0) + COALESCE(rt.total_non_returnable_value, 0),
                     'FM999,999,990.00')
        ) AS row_json,
        COALESCE(rt.finalized_at, rt.time_out, rt.created_at) AS ordering
      FROM return_transactions rt
      WHERE rt.pharmacy_id = p_pharmacy_id
        AND rt.status IN ('completed', 'finalized', 'received', 'verified', 'closed_out')
      ORDER BY COALESCE(rt.finalized_at, rt.time_out, rt.created_at) DESC
      LIMIT GREATEST(LEAST(p_limit, 1000), 1)
    ) sub;

  RETURN jsonb_build_object('error', false, 'returns', v_items);
END;
$function$;
