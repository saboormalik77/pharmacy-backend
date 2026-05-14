-- Function : get_return_transaction_by_id
-- Arguments: p_id uuid
-- Type     : FUNCTION
-- =============================================================

DROP FUNCTION IF EXISTS public.get_return_transaction_by_id(p_id uuid) CASCADE;

CREATE OR REPLACE FUNCTION public.get_return_transaction_by_id(p_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
AS $function$
DECLARE
  v_row return_transactions;
BEGIN
  SELECT * INTO v_row FROM return_transactions WHERE id = p_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', true, 'code', 404, 'message', 'Return transaction not found');
  END IF;
  RETURN jsonb_build_object('error', false, 'data', _rt_to_json(v_row));
END;
$function$;
