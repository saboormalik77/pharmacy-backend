-- Function : update_return_transaction
-- Arguments: p_id uuid, p_fedex_tracking text, p_fedex_pickup_confirmation text, p_notes text, p_service_type text
-- Type     : FUNCTION
-- =============================================================

DROP FUNCTION IF EXISTS public.update_return_transaction(p_id uuid, p_fedex_tracking text, p_fedex_pickup_confirmation text, p_notes text, p_service_type text) CASCADE;

CREATE OR REPLACE FUNCTION public.update_return_transaction(p_id uuid, p_fedex_tracking text DEFAULT NULL::text, p_fedex_pickup_confirmation text DEFAULT NULL::text, p_notes text DEFAULT NULL::text, p_service_type text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_row return_transactions;
BEGIN
  SELECT * INTO v_row FROM return_transactions WHERE id = p_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', true, 'code', 404, 'message', 'Return transaction not found');
  END IF;

  IF is_return_transaction_locked(v_row.status) THEN
    IF p_fedex_tracking IS NOT NULL OR p_fedex_pickup_confirmation IS NOT NULL OR p_service_type IS NOT NULL THEN
      RETURN jsonb_build_object('error', true, 'code', 400,
        'message', format('Cannot update tracking/service type on a "%s" return. Only notes can be updated.', v_row.status));
    END IF;
    
    IF p_notes IS NOT NULL THEN
      UPDATE return_transactions SET notes = p_notes WHERE id = p_id RETURNING * INTO v_row;
    END IF;
    
    RETURN jsonb_build_object('error', false, 'data', _rt_to_json(v_row));
  END IF;

  IF p_service_type IS NOT NULL AND p_service_type NOT IN ('in_store','self_service','express') THEN
    RETURN jsonb_build_object('error', true, 'code', 400,
      'message', 'service_type must be one of: in_store, self_service, express');
  END IF;

  UPDATE return_transactions SET
    fedex_tracking            = COALESCE(p_fedex_tracking,            fedex_tracking),
    fedex_pickup_confirmation = COALESCE(p_fedex_pickup_confirmation, fedex_pickup_confirmation),
    notes                     = COALESCE(p_notes,                     notes),
    service_type              = COALESCE(p_service_type,              service_type)
  WHERE id = p_id
  RETURNING * INTO v_row;

  RETURN jsonb_build_object('error', false, 'data', _rt_to_json(v_row));
END;
$function$;
