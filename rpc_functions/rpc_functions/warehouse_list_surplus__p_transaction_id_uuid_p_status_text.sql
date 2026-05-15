-- Function : warehouse_list_surplus
-- Arguments: p_transaction_id uuid, p_status text
-- Type     : FUNCTION
-- =============================================================

DROP FUNCTION IF EXISTS public.warehouse_list_surplus(p_transaction_id uuid, p_status text) CASCADE;

CREATE OR REPLACE FUNCTION public.warehouse_list_surplus(p_transaction_id uuid, p_status text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
AS $function$
DECLARE
  v_results jsonb;
  v_total   INTEGER;
BEGIN
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'id',                wsi.id,
      'transactionId',     wsi.transaction_id,
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
      'reportedBy',        wsi.reported_by,
      'createdAt',         wsi.created_at
    ) ORDER BY wsi.created_at DESC
  ), '[]'::jsonb), COUNT(*)
  INTO v_results, v_total
  FROM warehouse_surplus_items wsi
  WHERE wsi.transaction_id = p_transaction_id
    AND (p_status IS NULL OR wsi.status = p_status);

  RETURN jsonb_build_object(
    'error', false,
    'data', v_results,
    'total', v_total
  );
END;
$function$;
