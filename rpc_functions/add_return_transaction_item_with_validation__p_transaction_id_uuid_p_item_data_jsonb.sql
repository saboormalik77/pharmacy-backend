-- Function : add_return_transaction_item_with_validation
-- Arguments: p_transaction_id uuid, p_item_data jsonb
-- Type     : FUNCTION
-- =============================================================

DROP FUNCTION IF EXISTS public.add_return_transaction_item_with_validation(p_transaction_id uuid, p_item_data jsonb) CASCADE;

CREATE OR REPLACE FUNCTION public.add_return_transaction_item_with_validation(p_transaction_id uuid, p_item_data jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_return_status TEXT;
  v_result JSONB;
  v_merged_data JSONB;
BEGIN
  -- Check if return is locked
  SELECT status INTO v_return_status FROM return_transactions WHERE id = p_transaction_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', true, 'code', 404, 'message', 'Return transaction not found');
  END IF;
  
  IF is_return_transaction_locked(v_return_status) THEN
    RETURN jsonb_build_object('error', true, 'code', 400,
      'message', format('Cannot add items to return with status "%s". Return is locked after finalization.', v_return_status));
  END IF;
  
  -- Inject transactionId into the item data and call original single-arg function
  v_merged_data := p_item_data || jsonb_build_object('transactionId', p_transaction_id::text);
  SELECT add_return_transaction_item(v_merged_data) INTO v_result;
  RETURN v_result;
END;
$function$;
