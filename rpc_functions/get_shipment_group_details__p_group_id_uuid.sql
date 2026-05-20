-- Function : get_shipment_group_details
-- Arguments: p_group_id uuid
-- Type     : FUNCTION
-- =============================================================

DROP FUNCTION IF EXISTS public.get_shipment_group_details(p_group_id uuid) CASCADE;

CREATE OR REPLACE FUNCTION public.get_shipment_group_details(p_group_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
AS $function$
DECLARE
  v_group shipment_groups;
  v_memos jsonb;
BEGIN
  SELECT * INTO v_group FROM shipment_groups WHERE id = p_group_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', true, 'code', 404, 'message', 'Shipment group not found');
  END IF;

  SELECT COALESCE(jsonb_agg(_debit_memo_to_json(d) ORDER BY d.created_at), '[]'::jsonb)
  INTO v_memos
  FROM debit_memos d
  WHERE d.shipment_group_id = p_group_id;

  RETURN jsonb_build_object(
    'error', false,
    'data', jsonb_build_object(
      'group', _shipment_group_to_json(v_group),
      'memos', v_memos
    )
  );
END;
$function$;
