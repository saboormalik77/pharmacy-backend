-- Function : save_fedex_pickup_confirmation
-- Arguments: p_id uuid, p_fedex_pickup_confirmation text
-- Type     : FUNCTION
-- =============================================================

DROP FUNCTION IF EXISTS public.save_fedex_pickup_confirmation(p_id uuid, p_fedex_pickup_confirmation text) CASCADE;

CREATE OR REPLACE FUNCTION public.save_fedex_pickup_confirmation(p_id uuid, p_fedex_pickup_confirmation text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_row return_transactions;
BEGIN
  SELECT * INTO v_row FROM return_transactions WHERE id = p_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', true, 'code', 404,
      'message', 'Return transaction not found');
  END IF;

  UPDATE return_transactions SET
    fedex_pickup_confirmation = p_fedex_pickup_confirmation,
    updated_at                = NOW()
  WHERE id = p_id
  RETURNING * INTO v_row;

  RETURN jsonb_build_object('error', false, 'data', _rt_to_json(v_row));
END;
$function$;
