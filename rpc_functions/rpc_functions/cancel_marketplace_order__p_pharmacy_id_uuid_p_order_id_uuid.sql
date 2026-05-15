-- Function : cancel_marketplace_order
-- Arguments: p_pharmacy_id uuid, p_order_id uuid
-- Type     : FUNCTION
-- =============================================================

DROP FUNCTION IF EXISTS public.cancel_marketplace_order(p_pharmacy_id uuid, p_order_id uuid) CASCADE;

CREATE OR REPLACE FUNCTION public.cancel_marketplace_order(p_pharmacy_id uuid, p_order_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_order RECORD;
BEGIN
  -- Get order
  SELECT id, order_number, status
  INTO v_order
  FROM marketplace_orders
  WHERE id = p_order_id AND pharmacy_id = p_pharmacy_id;
  
  IF v_order.id IS NULL THEN
    RETURN jsonb_build_object(
      'error', true,
      'message', 'Order not found'
    );
  END IF;
  
  IF v_order.status NOT IN ('pending', 'processing') THEN
    RETURN jsonb_build_object(
      'error', true,
      'message', 'Cannot cancel order with status: ' || v_order.status
    );
  END IF;
  
  -- Cancel the order
  UPDATE marketplace_orders
  SET 
    status = 'cancelled',
    cancelled_at = NOW(),
    updated_at = NOW()
  WHERE id = p_order_id;
  
  RETURN jsonb_build_object(
    'error', false,
    'message', 'Order cancelled successfully',
    'orderNumber', v_order.order_number
  );
END;
$function$;
