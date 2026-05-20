-- Function : update_marketplace_order_payment
-- Arguments: p_stripe_checkout_session_id text, p_stripe_payment_intent_id text, p_stripe_payment_status text, p_payment_method_type text, p_payment_method_last4 text, p_payment_method_brand text, p_stripe_receipt_url text
-- Type     : FUNCTION
-- =============================================================

DROP FUNCTION IF EXISTS public.update_marketplace_order_payment(p_stripe_checkout_session_id text, p_stripe_payment_intent_id text, p_stripe_payment_status text, p_payment_method_type text, p_payment_method_last4 text, p_payment_method_brand text, p_stripe_receipt_url text) CASCADE;

CREATE OR REPLACE FUNCTION public.update_marketplace_order_payment(p_stripe_checkout_session_id text, p_stripe_payment_intent_id text, p_stripe_payment_status text, p_payment_method_type text DEFAULT NULL::text, p_payment_method_last4 text DEFAULT NULL::text, p_payment_method_brand text DEFAULT NULL::text, p_stripe_receipt_url text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_order_id UUID;
  v_order_number TEXT;
  v_pharmacy_id UUID;
  v_new_status TEXT;
  v_order_item RECORD;
BEGIN
  -- Find order by checkout session ID
  SELECT id, order_number, pharmacy_id
  INTO v_order_id, v_order_number, v_pharmacy_id
  FROM marketplace_orders
  WHERE stripe_checkout_session_id = p_stripe_checkout_session_id;
  
  IF v_order_id IS NULL THEN
    RETURN jsonb_build_object(
      'error', true,
      'message', 'Order not found for session: ' || p_stripe_checkout_session_id
    );
  END IF;
  
  -- Determine new status based on payment status
  IF p_stripe_payment_status IN ('succeeded', 'paid') THEN
    v_new_status := 'paid';
  ELSIF p_stripe_payment_status = 'processing' THEN
    v_new_status := 'processing';
  ELSIF p_stripe_payment_status IN ('failed', 'canceled') THEN
    v_new_status := 'cancelled';
  ELSE
    v_new_status := 'pending';
  END IF;
  
  -- Update order
  UPDATE marketplace_orders
  SET
    status = v_new_status,
    stripe_payment_intent_id = p_stripe_payment_intent_id,
    stripe_payment_status = p_stripe_payment_status,
    payment_method_type = p_payment_method_type,
    payment_method_last4 = p_payment_method_last4,
    payment_method_brand = p_payment_method_brand,
    stripe_receipt_url = p_stripe_receipt_url,
    paid_at = CASE WHEN v_new_status = 'paid' THEN NOW() ELSE paid_at END,
    cancelled_at = CASE WHEN v_new_status = 'cancelled' THEN NOW() ELSE cancelled_at END,
    updated_at = NOW()
  WHERE id = v_order_id;
  
  -- If payment successful, reduce deal quantities and clear cart
  IF v_new_status = 'paid' THEN
    -- Reduce quantities from deals
    FOR v_order_item IN
      SELECT deal_id, quantity
      FROM marketplace_order_items
      WHERE order_id = v_order_id
    LOOP
      UPDATE marketplace_deals
      SET 
        quantity = quantity - v_order_item.quantity,
        status = CASE 
          WHEN quantity - v_order_item.quantity <= 0 THEN 'sold'
          ELSE status
        END,
        updated_at = NOW()
      WHERE id = v_order_item.deal_id;
    END LOOP;
    
    -- Clear the pharmacy's cart
    DELETE FROM pharmacy_cart_items
    WHERE cart_id = (SELECT id FROM pharmacy_cart WHERE pharmacy_id = v_pharmacy_id);
  END IF;
  
  RETURN jsonb_build_object(
    'error', false,
    'message', 'Order payment updated',
    'orderNumber', v_order_number,
    'newStatus', v_new_status
  );
END;
$function$;
