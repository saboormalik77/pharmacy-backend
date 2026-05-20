-- Function : list_return_transaction_items
-- Arguments: p_transaction_id uuid, p_return_status text, p_search text, p_page integer, p_limit integer
-- Type     : FUNCTION
-- =============================================================

DROP FUNCTION IF EXISTS public.list_return_transaction_items(p_transaction_id uuid, p_return_status text, p_search text, p_page integer, p_limit integer) CASCADE;

CREATE OR REPLACE FUNCTION public.list_return_transaction_items(p_transaction_id uuid, p_return_status text DEFAULT NULL::text, p_search text DEFAULT NULL::text, p_page integer DEFAULT 1, p_limit integer DEFAULT 10)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
AS $function$
DECLARE
  v_items  jsonb;
  v_total  INT;
  v_ret_val DECIMAL;
  v_nonret_val DECIMAL;
  v_offset INT;
  v_total_pages INT;
BEGIN
  -- Verify transaction exists
  IF NOT EXISTS (SELECT 1 FROM return_transactions WHERE id = p_transaction_id) THEN
    RETURN jsonb_build_object('error', true, 'code', 404, 'message', 'Return transaction not found');
  END IF;

  -- Validate pagination params
  p_page := GREATEST(p_page, 1);
  p_limit := GREATEST(LEAST(p_limit, 100), 1);
  v_offset := (p_page - 1) * p_limit;

  -- Get total count for pagination metadata
  SELECT COUNT(*)
  INTO v_total
  FROM return_transaction_items rti
  WHERE rti.transaction_id = p_transaction_id
    AND (p_return_status IS NULL OR rti.return_status = p_return_status)
    AND (p_search IS NULL
         OR rti.ndc ILIKE '%' || p_search || '%'
         OR rti.proprietary_name ILIKE '%' || p_search || '%'
         OR rti.manufacturer ILIKE '%' || p_search || '%'
         OR rti.lot_number ILIKE '%' || p_search || '%');

  v_total_pages := CEIL(v_total::DECIMAL / p_limit);

  -- Get paginated items with descending order by created_at
  SELECT
    COALESCE(jsonb_agg(_rti_to_json(rti)), '[]'::jsonb)
  INTO v_items
  FROM (
    SELECT rti.*
    FROM return_transaction_items rti
    WHERE rti.transaction_id = p_transaction_id
      AND (p_return_status IS NULL OR rti.return_status = p_return_status)
      AND (p_search IS NULL
           OR rti.ndc ILIKE '%' || p_search || '%'
           OR rti.proprietary_name ILIKE '%' || p_search || '%'
           OR rti.manufacturer ILIKE '%' || p_search || '%'
           OR rti.lot_number ILIKE '%' || p_search || '%')
    ORDER BY rti.created_at DESC
    LIMIT p_limit OFFSET v_offset
  ) rti;

  -- Get value totals (for all items, not just current page)
  SELECT
    COALESCE(SUM(CASE WHEN rti.return_status = 'returnable' THEN rti.estimated_value ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN rti.return_status = 'non_returnable' THEN rti.estimated_value ELSE 0 END), 0)
  INTO v_ret_val, v_nonret_val
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
    'pagination', jsonb_build_object(
      'page', p_page,
      'limit', p_limit,
      'totalItems', v_total,
      'totalPages', v_total_pages
    ),
    'summary', jsonb_build_object(
      'totalItems',             v_total,
      'totalReturnableValue',   v_ret_val,
      'totalNonReturnableValue', v_nonret_val,
      'totalValue',             v_ret_val + v_nonret_val
    )
  );
END;
$function$;
