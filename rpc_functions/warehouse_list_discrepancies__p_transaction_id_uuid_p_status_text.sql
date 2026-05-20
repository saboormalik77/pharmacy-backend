-- Function : warehouse_list_discrepancies
-- Arguments: p_transaction_id uuid, p_status text
-- Type     : FUNCTION
-- =============================================================

DROP FUNCTION IF EXISTS public.warehouse_list_discrepancies(p_transaction_id uuid, p_status text) CASCADE;

CREATE OR REPLACE FUNCTION public.warehouse_list_discrepancies(p_transaction_id uuid, p_status text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
AS $function$
DECLARE
  v_results jsonb;
  v_total   INTEGER;
BEGIN
  SELECT COUNT(*), COALESCE(jsonb_agg(
    jsonb_build_object(
      'id',               wd.id,
      'transactionId',    wd.transaction_id,
      'itemId',           wd.item_id,
      'type',             wd.type,
      'ndc',              wd.ndc,
      'productName',      wd.product_name,
      'expectedQuantity', wd.expected_quantity,
      'actualQuantity',   wd.actual_quantity,
      'notes',            wd.notes,
      'status',           wd.status,
      'reportedBy',       wd.reported_by,
      'resolvedBy',       wd.resolved_by,
      'resolvedAt',       wd.resolved_at,
      'resolutionNotes',  wd.resolution_notes,
      'createdAt',        wd.created_at
    ) ORDER BY wd.created_at DESC
  ), '[]'::jsonb)
  INTO v_total, v_results
  FROM warehouse_discrepancies wd
  WHERE wd.transaction_id = p_transaction_id
    AND (p_status IS NULL OR wd.status = p_status);

  RETURN jsonb_build_object(
    'error', false,
    'data', v_results,
    'total', v_total
  );
END;
$function$;
