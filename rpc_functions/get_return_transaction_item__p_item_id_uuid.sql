-- Function : get_return_transaction_item
-- Arguments: p_item_id uuid
-- Type     : FUNCTION
-- =============================================================

DROP FUNCTION IF EXISTS public.get_return_transaction_item(p_item_id uuid) CASCADE;

CREATE OR REPLACE FUNCTION public.get_return_transaction_item(p_item_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
AS $function$
DECLARE
  v_row return_transaction_items;
BEGIN
  SELECT * INTO v_row FROM return_transaction_items WHERE id = p_item_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', true, 'code', 404, 'message', 'Item not found');
  END IF;
  RETURN jsonb_build_object('error', false, 'data', _rti_to_json(v_row));
END;
$function$;
