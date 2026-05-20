-- Function : list_return_transaction_items
-- Arguments: p_transaction_id uuid, p_return_status text, p_search text
-- Type     : FUNCTION
-- =============================================================

DROP FUNCTION IF EXISTS public.list_return_transaction_items(p_transaction_id uuid, p_return_status text, p_search text) CASCADE;

CREATE OR REPLACE FUNCTION public.list_return_transaction_items(p_transaction_id uuid, p_return_status text DEFAULT NULL::text, p_search text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
AS $function$
DECLARE
  v_items  jsonb;
  v_total  INT;
  v_ret_val DECIMAL;
  v_nonret_val DECIMAL;
BEGIN
  -- Verify transaction exists
  IF NOT EXISTS (SELECT 1 FROM return_transactions WHERE id = p_transaction_id) THEN
    RETURN jsonb_build_object('error', true, 'code', 404, 'message', 'Return transaction not found');
  END IF;

  SELECT
    COALESCE(jsonb_agg(_rti_to_json(rti) ORDER BY rti.created_at DESC), '[]'::jsonb),
    COUNT(*),
    COALESCE(SUM(CASE WHEN rti.return_status = 'returnable' THEN rti.estimated_value ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN rti.return_status = 'non_returnable' THEN rti.estimated_value ELSE 0 END), 0)
  INTO v_items, v_total, v_ret_val, v_nonret_val
  FROM return_transaction_items rti
  WHERE rti.transaction_id = p_transaction_id
    AND (p_return_status IS NULL OR rti.return_status = p_return_status)
    AND (p_search IS NULL
         OR rti.ndc ILIKE '%' || p_search || '%'
         OR rti.proprietary_name ILIKE '%' || p_search || '%'
         OR rti.manufacturer ILIKE '%' || p_search || '%'
         OR rti.lot_number ILIKE '%' || p_search || '%');

  RETURN jsonb_build_object(
    'items', v_items,
    'summary', jsonb_build_object(
      'totalItems',             v_total,
      'totalReturnableValue',   v_ret_val,
      'totalNonReturnableValue', v_nonret_val,
      'totalValue',             v_ret_val + v_nonret_val
    )
  );
END;
$function$;
