-- Function : create_marketplace_order_from_cart
-- Arguments: p_pharmacy_id uuid, p_stripe_checkout_session_id text, p_stripe_customer_id text, p_notes text
-- Type     : FUNCTION
-- =============================================================

DROP FUNCTION IF EXISTS public.create_marketplace_order_from_cart(p_pharmacy_id uuid, p_stripe_checkout_session_id text, p_stripe_customer_id text, p_notes text) CASCADE;

CREATE OR REPLACE FUNCTION public.create_marketplace_order_from_cart(p_pharmacy_id uuid, p_stripe_checkout_session_id text DEFAULT NULL::text, p_stripe_customer_id text DEFAULT NULL::text, p_notes text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_cart_id UUID;
  v_order_id UUID;
  v_order_number TEXT;
  v_subtotal NUMERIC(12, 2);
  v_tax_amount NUMERIC(12, 2);
  v_total_amount NUMERIC(12, 2);
  v_total_savings NUMERIC(12, 2);
  v_item_count INTEGER;
  v_cart_item RECORD;
BEGIN
  -- Get cart ID and validate cart has items
  SELECT id INTO v_cart_id
  FROM pharmacy_cart
  WHERE pharmacy_id = p_pharmacy_id;
  
  IF v_cart_id IS NULL THEN
    RETURN jsonb_build_object(
      'error', true,
      'message', 'Cart not found'
    );
  END IF;
  
  -- Check cart has items
  SELECT COUNT(*)::INTEGER INTO v_item_count
  FROM pharmacy_cart_items
  WHERE cart_id = v_cart_id;
  
  IF v_item_count = 0 THEN
    RETURN jsonb_build_object(
      'error', true,
      'message', 'Cart is empty'
    );
  END IF;
  
  -- Validate all items are still valid (active deals with available stock and meeting minimum quantity)
  -- Note: If available quantity < minimum_buy_quantity, then remaining stock becomes the effective minimum
  FOR v_cart_item IN
    SELECT 
      ci.id,
      ci.deal_id,
      ci.quantity,
      d.product_name,
      d.status,
      d.quantity as available_quantity,
      COALESCE(d.minimum_buy_quantity, 1) as minimum_buy_quantity,
      LEAST(COALESCE(d.minimum_buy_quantity, 1), d.quantity) as effective_minimum
    FROM pharmacy_cart_items ci
    JOIN marketplace_deals d ON d.id = ci.deal_id
    WHERE ci.cart_id = v_cart_id
  LOOP
    IF v_cart_item.status != 'active' THEN
      RETURN jsonb_build_object(
        'error', true,
        'message', 'Deal "' || v_cart_item.product_name || '" is no longer available',
        'dealId', v_cart_item.deal_id
      );
    END IF;
    
    IF v_cart_item.quantity > v_cart_item.available_quantity THEN
      RETURN jsonb_build_object(
        'error', true,
        'message', 'Insufficient stock for "' || v_cart_item.product_name || '". Available: ' || v_cart_item.available_quantity,
        'dealId', v_cart_item.deal_id
      );
    END IF;
    
    -- Check minimum quantity (effective minimum is the lesser of minimum_buy_quantity and available stock)
    IF v_cart_item.quantity < v_cart_item.effective_minimum THEN
      RETURN jsonb_build_object(
        'error', true,
        'message', 'Minimum order quantity for "' || v_cart_item.product_name || '" is ' || v_cart_item.effective_minimum || ' units',
        'dealId', v_cart_item.deal_id
      );
    END IF;
  END LOOP;
  
  -- Calculate totals from cart
  SELECT 
    COALESCE(SUM(ci.quantity * ci.unit_price), 0),
    COALESCE(SUM((ci.original_price - ci.unit_price) * ci.quantity), 0)
  INTO v_subtotal, v_total_savings
  FROM pharmacy_cart_items ci
  WHERE ci.cart_id = v_cart_id;
  
  -- Calculate tax (8%)
  v_tax_amount := ROUND(v_subtotal * 0.08, 2);
  v_total_amount := v_subtotal + v_tax_amount;
  
  -- Create the order
  INSERT INTO marketplace_orders (
    pharmacy_id,
    status,
    subtotal,
    tax_amount,
    tax_rate,
    shipping_amount,
    discount_amount,
    total_amount,
    total_savings,
    stripe_checkout_session_id,
    stripe_customer_id,
    notes
  ) VALUES (
    p_pharmacy_id,
    'pending',
    v_subtotal,
    v_tax_amount,
    0.08,
    0,
    0,
    v_total_amount,
    v_total_savings,
    p_stripe_checkout_session_id,
    p_stripe_customer_id,
    p_notes
  )
  RETURNING id, order_number INTO v_order_id, v_order_number;
  
  -- Copy cart items to order items
  INSERT INTO marketplace_order_items (
    order_id,
    deal_id,
    product_name,
    ndc,
    category,
    distributor,
    quantity,
    unit_price,
    original_price,
    line_total,
    line_savings
  )
  SELECT
    v_order_id,
    ci.deal_id,
    d.product_name,
    d.ndc,
    d.category,
    d.distributor_name,
    ci.quantity,
    ci.unit_price,
    ci.original_price,
    ci.quantity * ci.unit_price,
    (ci.original_price - ci.unit_price) * ci.quantity
  FROM pharmacy_cart_items ci
  JOIN marketplace_deals d ON d.id = ci.deal_id
  WHERE ci.cart_id = v_cart_id;
  
  -- Return order details
  RETURN jsonb_build_object(
    'error', false,
    'message', 'Order created successfully',
    'order', jsonb_build_object(
      'id', v_order_id,
      'orderNumber', v_order_number,
      'status', 'pending',
      'subtotal', v_subtotal,
      'taxAmount', v_tax_amount,
      'totalAmount', v_total_amount,
      'totalSavings', v_total_savings,
      'itemCount', v_item_count
    )
  );
END;
$function$;
