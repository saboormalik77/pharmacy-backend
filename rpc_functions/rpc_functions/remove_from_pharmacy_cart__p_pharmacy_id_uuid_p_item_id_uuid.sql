-- Function : remove_from_pharmacy_cart
-- Arguments: p_pharmacy_id uuid, p_item_id uuid
-- Type     : FUNCTION
-- =============================================================

DROP FUNCTION IF EXISTS public.remove_from_pharmacy_cart(p_pharmacy_id uuid, p_item_id uuid) CASCADE;

CREATE OR REPLACE FUNCTION public.remove_from_pharmacy_cart(p_pharmacy_id uuid, p_item_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_cart_id UUID;
  v_deleted_count INTEGER;
BEGIN
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
  
  -- Delete item
  DELETE FROM pharmacy_cart_items
  WHERE id = p_item_id AND cart_id = v_cart_id;
  
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  
  IF v_deleted_count = 0 THEN
    RETURN jsonb_build_object(
      'error', true,
      'message', 'Item not found in cart'
    );
  END IF;
  
  -- Update cart timestamp
  UPDATE pharmacy_cart SET updated_at = NOW() WHERE id = v_cart_id;
  
  RETURN jsonb_build_object(
    'error', false,
    'message', 'Item removed from cart'
  );
END;
$function$;
