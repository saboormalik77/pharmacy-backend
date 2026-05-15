-- Function : clear_pharmacy_cart
-- Arguments: p_pharmacy_id uuid
-- Type     : FUNCTION
-- =============================================================

DROP FUNCTION IF EXISTS public.clear_pharmacy_cart(p_pharmacy_id uuid) CASCADE;

CREATE OR REPLACE FUNCTION public.clear_pharmacy_cart(p_pharmacy_id uuid)
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
      'error', false,
      'message', 'Cart is already empty',
      'itemsRemoved', 0
    );
  END IF;
  
  -- Delete all items
  DELETE FROM pharmacy_cart_items
  WHERE cart_id = v_cart_id;
  
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  
  -- Update cart timestamp
  UPDATE pharmacy_cart SET updated_at = NOW() WHERE id = v_cart_id;
  
  RETURN jsonb_build_object(
    'error', false,
    'message', 'Cart cleared successfully',
    'itemsRemoved', v_deleted_count
  );
END;
$function$;
