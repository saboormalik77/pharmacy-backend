-- Function : warehouse_list_all_surplus
-- Arguments: p_status text, p_search text, p_page integer, p_limit integer
-- Type     : FUNCTION
-- =============================================================

DROP FUNCTION IF EXISTS public.warehouse_list_all_surplus(p_status text, p_search text, p_page integer, p_limit integer) CASCADE;

CREATE OR REPLACE FUNCTION public.warehouse_list_all_surplus(p_status text DEFAULT NULL::text, p_search text DEFAULT NULL::text, p_page integer DEFAULT 1, p_limit integer DEFAULT 20)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
AS $function$
DECLARE
  v_offset  INTEGER;
  v_total   INTEGER;
  v_results jsonb;
BEGIN
  v_offset := (GREATEST(p_page, 1) - 1) * p_limit;

  SELECT COUNT(*) INTO v_total
  FROM warehouse_surplus_items wsi
  WHERE (p_status IS NULL OR wsi.status = p_status)
    AND (p_search IS NULL
      OR wsi.product_name ILIKE '%' || p_search || '%'
      OR wsi.ndc ILIKE '%' || p_search || '%'
      OR wsi.warehouse_location ILIKE '%' || p_search || '%'
    );

  SELECT COALESCE(jsonb_agg(row_json ORDER BY created_at DESC), '[]'::jsonb)
  INTO v_results
  FROM (
    SELECT jsonb_build_object(
      'id',                wsi.id,
      'transactionId',     wsi.transaction_id,
      'licensePlate',      (SELECT license_plate FROM return_transactions WHERE id = wsi.transaction_id),
      'pharmacyName',      (SELECT pharmacy_name FROM pharmacy WHERE id = (
                              SELECT pharmacy_id FROM return_transactions WHERE id = wsi.transaction_id
                           )),
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
      'assignedReturnId',  wsi.assigned_return_id,
      'createdAt',         wsi.created_at
    ) AS row_json, wsi.created_at
    FROM warehouse_surplus_items wsi
    WHERE (p_status IS NULL OR wsi.status = p_status)
      AND (p_search IS NULL
        OR wsi.product_name ILIKE '%' || p_search || '%'
        OR wsi.ndc ILIKE '%' || p_search || '%'
        OR wsi.warehouse_location ILIKE '%' || p_search || '%'
      )
    ORDER BY wsi.created_at DESC
    LIMIT p_limit OFFSET v_offset
  ) sub;

  RETURN jsonb_build_object(
    'error', false,
    'data', v_results,
    'pagination', jsonb_build_object(
      'page',       p_page,
      'limit',      p_limit,
      'total',      v_total,
      'totalPages', CEIL(v_total::numeric / p_limit)
    )
  );
END;
$function$;
