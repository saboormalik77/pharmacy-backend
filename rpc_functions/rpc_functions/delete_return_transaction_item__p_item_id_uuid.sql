-- Function : delete_return_transaction_item
-- Arguments: p_item_id uuid
-- Type     : FUNCTION
-- =============================================================

DROP FUNCTION IF EXISTS public.delete_return_transaction_item(p_item_id uuid) CASCADE;

CREATE OR REPLACE FUNCTION public.delete_return_transaction_item(p_item_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_item return_transaction_items;
  v_txn  RECORD;
BEGIN
  SELECT * INTO v_item FROM return_transaction_items WHERE id = p_item_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', true, 'code', 404, 'message', 'Item not found');
  END IF;

  SELECT status INTO v_txn FROM return_transactions WHERE id = v_item.transaction_id;
  IF v_txn.status IN ('finalized', 'closed_out', 'received') THEN
    RETURN jsonb_build_object('error', true, 'code', 400,
      'message', 'Cannot delete items from a finalized return');
  END IF;

  DELETE FROM return_transaction_items WHERE id = p_item_id;

  -- Update transaction totals
  UPDATE return_transactions SET
    total_items = (SELECT COUNT(*) FROM return_transaction_items 
                   WHERE transaction_id = v_item.transaction_id 
                   AND return_status IN ('returnable', 'tbd')),
    total_returnable_value = (
      SELECT COALESCE(SUM(estimated_value), 0) FROM return_transaction_items
       WHERE transaction_id = v_item.transaction_id AND return_status = 'returnable'
    ),
    total_non_returnable_value = (
      SELECT COALESCE(SUM(estimated_value), 0) FROM return_transaction_items
       WHERE transaction_id = v_item.transaction_id AND return_status = 'non_returnable'
    )
  WHERE id = v_item.transaction_id;

  RETURN jsonb_build_object('error', false, 'message', 'Item deleted');
END;
$function$;
