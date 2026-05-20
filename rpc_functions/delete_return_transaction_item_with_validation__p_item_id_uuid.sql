-- Function : delete_return_transaction_item_with_validation
-- Arguments: p_item_id uuid
-- Type     : FUNCTION
-- =============================================================

DROP FUNCTION IF EXISTS public.delete_return_transaction_item_with_validation(p_item_id uuid) CASCADE;

CREATE OR REPLACE FUNCTION public.delete_return_transaction_item_with_validation(p_item_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_transaction_id UUID;
  v_return_status    TEXT;
BEGIN
  SELECT rti.transaction_id, rt.status
  INTO v_transaction_id, v_return_status
  FROM return_transaction_items rti
  JOIN return_transactions rt ON rt.id = rti.transaction_id
  WHERE rti.id = p_item_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', true, 'code', 404, 'message', 'Item not found');
  END IF;

  IF is_return_transaction_locked(v_return_status) THEN
    RETURN jsonb_build_object('error', true, 'code', 400,
      'message', format('Cannot delete items from return with status "%s". Return is locked after finalization.', v_return_status));
  END IF;

  DELETE FROM return_transaction_items WHERE id = p_item_id;

  UPDATE return_transactions SET
    total_items = (
      SELECT COUNT(*)::INTEGER FROM return_transaction_items WHERE transaction_id = v_transaction_id
    ),
    total_returnable_value = (
      SELECT COALESCE(SUM(estimated_value), 0)
        FROM return_transaction_items
       WHERE transaction_id = v_transaction_id AND return_status = 'returnable'
    ),
    total_non_returnable_value = (
      SELECT COALESCE(SUM(estimated_value), 0)
        FROM return_transaction_items
       WHERE transaction_id = v_transaction_id AND return_status = 'non_returnable'
    )
  WHERE id = v_transaction_id;

  RETURN jsonb_build_object('error', false, 'message', 'Item deleted successfully');
END;
$function$;
