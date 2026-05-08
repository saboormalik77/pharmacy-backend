-- ============================================================
-- Marketplace Order RPC Functions
-- Handles order creation and management for marketplace purchases
-- ============================================================

-- ============================================================
-- 1. CREATE ORDER FROM CART
-- Creates an order from the pharmacy's cart items
-- Called when initiating checkout
-- ============================================================

DROP FUNCTION IF EXISTS create_marketplace_order_from_cart(UUID, TEXT, TEXT, TEXT);

CREATE OR REPLACE FUNCTION create_marketplace_order_from_cart(
  p_pharmacy_id UUID,
  p_stripe_checkout_session_id TEXT DEFAULT NULL,
  p_stripe_customer_id TEXT DEFAULT NULL,
  p_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
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
$$;

-- ============================================================
-- 2. UPDATE ORDER PAYMENT STATUS
-- Called from webhook when payment is confirmed
-- ============================================================

DROP FUNCTION IF EXISTS update_marketplace_order_payment(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT);

CREATE OR REPLACE FUNCTION update_marketplace_order_payment(
  p_stripe_checkout_session_id TEXT,
  p_stripe_payment_intent_id TEXT,
  p_stripe_payment_status TEXT,
  p_payment_method_type TEXT DEFAULT NULL,
  p_payment_method_last4 TEXT DEFAULT NULL,
  p_payment_method_brand TEXT DEFAULT NULL,
  p_stripe_receipt_url TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
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
$$;

-- ============================================================
-- 3. GET ORDER BY ID
-- Returns order details with items
-- ============================================================

DROP FUNCTION IF EXISTS get_marketplace_order_by_id(UUID, UUID);

CREATE OR REPLACE FUNCTION get_marketplace_order_by_id(
  p_pharmacy_id UUID,
  p_order_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_order JSONB;
  v_items JSONB;
BEGIN
  -- Get order (verify it belongs to pharmacy)
  SELECT jsonb_build_object(
    'id', o.id,
    'orderNumber', o.order_number,
    'status', o.status,
    'subtotal', o.subtotal,
    'taxAmount', o.tax_amount,
    'taxRate', o.tax_rate,
    'shippingAmount', o.shipping_amount,
    'discountAmount', o.discount_amount,
    'totalAmount', o.total_amount,
    'totalSavings', o.total_savings,
    'paymentMethodType', o.payment_method_type,
    'paymentMethodLast4', o.payment_method_last4,
    'paymentMethodBrand', o.payment_method_brand,
    'stripeReceiptUrl', o.stripe_receipt_url,
    'notes', o.notes,
    'createdAt', o.created_at,
    'paidAt', o.paid_at,
    'shippedAt', o.shipped_at,
    'deliveredAt', o.delivered_at
  )
  INTO v_order
  FROM marketplace_orders o
  WHERE o.id = p_order_id AND o.pharmacy_id = p_pharmacy_id;
  
  IF v_order IS NULL THEN
    RETURN jsonb_build_object(
      'error', true,
      'message', 'Order not found'
    );
  END IF;
  
  -- Get order items with image from marketplace_deals
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'id', oi.id,
      'dealId', oi.deal_id,
      'productName', oi.product_name,
      'ndc', oi.ndc,
      'category', oi.category,
      'distributor', oi.distributor,
      'quantity', oi.quantity,
      'unitPrice', oi.unit_price,
      'originalPrice', oi.original_price,
      'lineTotal', oi.line_total,
      'lineSavings', oi.line_savings,
      'imageUrl', d.image_url
    )
  ), '[]'::jsonb)
  INTO v_items
  FROM marketplace_order_items oi
  LEFT JOIN marketplace_deals d ON d.id = oi.deal_id
  WHERE oi.order_id = p_order_id;
  
  v_order := v_order || jsonb_build_object('items', v_items);
  
  RETURN jsonb_build_object(
    'error', false,
    'order', v_order
  );
END;
$$;

-- ============================================================
-- 4. GET PHARMACY ORDERS
-- Returns list of orders for a pharmacy
-- ============================================================

DROP FUNCTION IF EXISTS get_pharmacy_marketplace_orders(UUID, INTEGER, INTEGER, TEXT);

CREATE OR REPLACE FUNCTION get_pharmacy_marketplace_orders(
  p_pharmacy_id UUID,
  p_page INTEGER DEFAULT 1,
  p_limit INTEGER DEFAULT 10,
  p_status TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_offset INTEGER;
  v_total INTEGER;
  v_orders JSONB;
BEGIN
  v_offset := (p_page - 1) * p_limit;
  
  -- Get total count
  SELECT COUNT(*)::INTEGER
  INTO v_total
  FROM marketplace_orders
  WHERE pharmacy_id = p_pharmacy_id
    AND (p_status IS NULL OR p_status = '' OR p_status = 'all' OR status = p_status);
  
  -- Get orders
  SELECT COALESCE(jsonb_agg(order_row), '[]'::jsonb)
  INTO v_orders
  FROM (
    SELECT jsonb_build_object(
      'id', o.id,
      'orderNumber', o.order_number,
      'status', o.status,
      'totalAmount', o.total_amount,
      'totalSavings', o.total_savings,
      'itemCount', (SELECT COUNT(*) FROM marketplace_order_items WHERE order_id = o.id),
      'paymentMethodBrand', o.payment_method_brand,
      'paymentMethodLast4', o.payment_method_last4,
      'createdAt', o.created_at,
      'paidAt', o.paid_at
    ) AS order_row
    FROM marketplace_orders o
    WHERE o.pharmacy_id = p_pharmacy_id
      AND (p_status IS NULL OR p_status = '' OR p_status = 'all' OR o.status = p_status)
    ORDER BY o.created_at DESC
    LIMIT p_limit
    OFFSET v_offset
  ) sub;
  
  RETURN jsonb_build_object(
    'orders', v_orders,
    'pagination', jsonb_build_object(
      'page', p_page,
      'limit', p_limit,
      'total', v_total,
      'totalPages', CEIL(v_total::NUMERIC / p_limit)::INTEGER
    )
  );
END;
$$;

-- ============================================================
-- 5. CANCEL ORDER
-- Cancels an order (only if not yet paid)
-- ============================================================

DROP FUNCTION IF EXISTS cancel_marketplace_order(UUID, UUID);

CREATE OR REPLACE FUNCTION cancel_marketplace_order(
  p_pharmacy_id UUID,
  p_order_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
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
$$;

-- ============================================================
-- GRANT PERMISSIONS
-- ============================================================

GRANT EXECUTE ON FUNCTION create_marketplace_order_from_cart TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION update_marketplace_order_payment TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION get_marketplace_order_by_id TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION get_pharmacy_marketplace_orders TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION cancel_marketplace_order TO authenticated, anon, service_role;

