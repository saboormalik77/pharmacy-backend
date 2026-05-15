-- Function : warehouse_receive_return
-- Arguments: p_fedex_tracking text
-- Type     : FUNCTION
-- =============================================================

DROP FUNCTION IF EXISTS public.warehouse_receive_return(p_fedex_tracking text) CASCADE;

CREATE OR REPLACE FUNCTION public.warehouse_receive_return(p_fedex_tracking text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_row return_transactions;
BEGIN
  IF p_fedex_tracking IS NULL OR TRIM(p_fedex_tracking) = '' THEN
    RETURN jsonb_build_object('error', true, 'code', 400,
      'message', 'FedEx tracking number is required');
  END IF;

  SELECT * INTO v_row
    FROM return_transactions
   WHERE LOWER(TRIM(fedex_tracking)) = LOWER(TRIM(p_fedex_tracking));

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', true, 'code', 404,
      'message', format('No return found with tracking number "%s"', TRIM(p_fedex_tracking)));
  END IF;

  IF v_row.status NOT IN ('finalized') THEN
    RETURN jsonb_build_object('error', true, 'code', 400,
      'message', format('Return has status "%s". Only finalized returns can be received.', v_row.status));
  END IF;

  IF v_row.received_in_warehouse_date IS NOT NULL THEN
    RETURN jsonb_build_object('error', true, 'code', 400,
      'message', 'This return has already been received in the warehouse.');
  END IF;

  UPDATE return_transactions SET
    status                      = 'received',
    received_in_warehouse_date  = NOW()
  WHERE id = v_row.id
  RETURNING * INTO v_row;

  RETURN jsonb_build_object('error', false, 'data', _rt_to_json(v_row));
END;
$function$;
