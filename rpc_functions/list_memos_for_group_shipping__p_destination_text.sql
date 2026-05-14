-- Function : list_memos_for_group_shipping
-- Arguments: p_destination text
-- Type     : FUNCTION
-- =============================================================

DROP FUNCTION IF EXISTS public.list_memos_for_group_shipping(p_destination text) CASCADE;

CREATE OR REPLACE FUNCTION public.list_memos_for_group_shipping(p_destination text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
AS $function$
DECLARE
  v_rows jsonb;
BEGIN
  SELECT COALESCE(jsonb_agg(_debit_memo_to_json(d) ORDER BY d.destination, d.created_at), '[]'::jsonb)
  INTO v_rows
  FROM debit_memos d
  WHERE d.ra_status = 'received'
    AND d.shipped_at IS NULL
    AND d.shipment_group_id IS NULL
    AND d.ra_number IS NOT NULL
    AND TRIM(d.ra_number) != ''
    AND (p_destination IS NULL OR LOWER(d.destination) = LOWER(p_destination));

  RETURN jsonb_build_object(
    'error', false,
    'data', v_rows
  );
END;
$function$;
