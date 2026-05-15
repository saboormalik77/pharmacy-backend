-- Function : update_pharmacy_cart_item
-- Arguments: p_pharmacy_id uuid, p_item_id uuid, p_quantity integer
-- Type     : FUNCTION
-- =============================================================

DROP FUNCTION IF EXISTS public.update_pharmacy_cart_item(p_pharmacy_id uuid, p_item_id uuid, p_quantity integer) CASCADE;

CREATE OR REPLACE FUNCTION public.update_pharmacy_cart_item(p_pharmacy_id uuid, p_item_id uuid, p_quantity integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_cart_id UUID;
  v_deal_id UUID;
  v_available_quantity INTEGER;
  v_deal_status TEXT;
BEGIN
  -- Validate quantity
  IF p_quantity < 1 THEN
    RETURN jsonb_build_object(
      'error', true,
      'message', 'Quantity must be at least 1. Use remove endpoint to delete item.'
    );
  END IF;
  
  -- Get cart ID
  SELECT id INTO v_cart_id
  FROM pharmacy_cart
  WHERE pharmacy_id = p_pharmacy_id;
  
  IF v_cart_id IS NULL THEN
    RETURN jsonb_build_object(
      'error', true,
      'message', 'Cart not found'
    );
  END IF;
  
  -- Get item's deal info
  SELECT ci.deal_id, d.quantity, d.status
  INTO v_deal_id, v_available_quantity, v_deal_status
  FROM pharmacy_cart_items ci
  JOIN marketplace_deals d ON d.id = ci.deal_id
  WHERE ci.id = p_item_id AND ci.cart_id = v_cart_id;
  
  IF v_deal_id IS NULL THEN
    RETURN jsonb_build_object(
      'error', true,
      'message', 'Cart item not found'
    );
  END IF;
  
  -- Check deal is still active for quantity updates
  IF v_deal_status != 'active' THEN
    RETURN jsonb_build_object(
      'error', true,
      'message', 'This deal is no longer available (status: ' || v_deal_status || ')'
    );
  END IF;
  
  -- Check quantity doesn't exceed stock
  IF p_quantity > v_available_quantity THEN
    RETURN jsonb_build_object(
      'error', true,
      'message', 'Quantity exceeds available stock (' || v_available_quantity || ' available)'
    );
  END IF;
  
  -- Update quantity
  UPDATE pharmacy_cart_items
  SET quantity = p_quantity, updated_at = NOW()
  WHERE id = p_item_id AND cart_id = v_cart_id;
  
  -- Update cart timestamp
  UPDATE pharmacy_cart SET updated_at = NOW() WHERE id = v_cart_id;
  
  RETURN jsonb_build_object(
    'error', false,
    'message', 'Cart updated successfully',
    'newQuantity', p_quantity
  );
END;
$function$;
