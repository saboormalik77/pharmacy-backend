-- Function : add_to_pharmacy_cart
-- Arguments: p_pharmacy_id uuid, p_deal_id uuid, p_quantity integer
-- Type     : FUNCTION
-- =============================================================

DROP FUNCTION IF EXISTS public.add_to_pharmacy_cart(p_pharmacy_id uuid, p_deal_id uuid, p_quantity integer) CASCADE;

CREATE OR REPLACE FUNCTION public.add_to_pharmacy_cart(p_pharmacy_id uuid, p_deal_id uuid, p_quantity integer DEFAULT 1)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_cart_id UUID;
  v_deal RECORD;
  v_existing_quantity INTEGER;
  v_new_quantity INTEGER;
  v_cart_item JSONB;
  v_effective_minimum INTEGER;
BEGIN
  -- Validate quantity
  IF p_quantity < 1 THEN
    RETURN jsonb_build_object(
      'error', true,
      'message', 'Quantity must be at least 1'
    );
  END IF;
  
  -- Get deal details and check if active (including minimum_buy_quantity)
  SELECT id, product_name, deal_price, original_price, quantity, status, image_url, ndc, distributor_name, COALESCE(minimum_buy_quantity, 1) as minimum_buy_quantity
  INTO v_deal
  FROM marketplace_deals
  WHERE id = p_deal_id;
  
  IF v_deal.id IS NULL THEN
    RETURN jsonb_build_object(
      'error', true,
      'message', 'Deal not found'
    );
  END IF;
  
  -- Only active deals can be added to cart
  IF v_deal.status != 'active' THEN
    RETURN jsonb_build_object(
      'error', true,
      'message', 'This deal is no longer available (status: ' || v_deal.status || ')'
    );
  END IF;
  
  -- Check if requested quantity is available
  IF p_quantity > v_deal.quantity THEN
    RETURN jsonb_build_object(
      'error', true,
      'message', 'Requested quantity exceeds available stock (' || v_deal.quantity || ' available)'
    );
  END IF;
  
  -- Calculate effective minimum: if available quantity is less than minimum_buy_quantity,
  -- then the remaining stock becomes the effective minimum (allow ordering all remaining stock)
  v_effective_minimum := LEAST(v_deal.minimum_buy_quantity, v_deal.quantity);
  
  -- Check minimum buy quantity (but allow if ordering all remaining stock)
  IF p_quantity < v_effective_minimum THEN
    RETURN jsonb_build_object(
      'error', true,
      'message', 'Minimum order quantity is ' || v_effective_minimum || ' units'
    );
  END IF;
  
  -- Get or create cart for pharmacy
  SELECT id INTO v_cart_id
  FROM pharmacy_cart
  WHERE pharmacy_id = p_pharmacy_id;
  
  IF v_cart_id IS NULL THEN
    INSERT INTO pharmacy_cart (pharmacy_id)
    VALUES (p_pharmacy_id)
    RETURNING id INTO v_cart_id;
  END IF;
  
  -- Check if item already in cart
  SELECT quantity INTO v_existing_quantity
  FROM pharmacy_cart_items
  WHERE cart_id = v_cart_id AND deal_id = p_deal_id;
  
  IF v_existing_quantity IS NOT NULL THEN
    -- Update existing item (add to quantity)
    v_new_quantity := v_existing_quantity + p_quantity;
    
    -- Verify new quantity doesn't exceed stock
    IF v_new_quantity > v_deal.quantity THEN
      RETURN jsonb_build_object(
        'error', true,
        'message', 'Total quantity would exceed available stock. You have ' || v_existing_quantity || ' in cart, ' || v_deal.quantity || ' available.'
      );
    END IF;
    
    UPDATE pharmacy_cart_items
    SET quantity = v_new_quantity, updated_at = NOW()
    WHERE cart_id = v_cart_id AND deal_id = p_deal_id;
  ELSE
    -- Insert new item
    v_new_quantity := p_quantity;
    
    INSERT INTO pharmacy_cart_items (cart_id, deal_id, quantity, unit_price, original_price)
    VALUES (v_cart_id, p_deal_id, p_quantity, v_deal.deal_price, v_deal.original_price);
  END IF;
  
  -- Update cart timestamp
  UPDATE pharmacy_cart SET updated_at = NOW() WHERE id = v_cart_id;
  
  -- Build response with item details
  v_cart_item := jsonb_build_object(
    'dealId', p_deal_id,
    'productName', v_deal.product_name,
    'ndc', v_deal.ndc,
    'distributor', v_deal.distributor_name,
    'quantity', v_new_quantity,
    'unitPrice', v_deal.deal_price,
    'originalPrice', v_deal.original_price,
    'totalPrice', v_new_quantity * v_deal.deal_price,
    'savings', (v_deal.original_price - v_deal.deal_price) * v_new_quantity,
    'imageUrl', v_deal.image_url
  );
  
  RETURN jsonb_build_object(
    'error', false,
    'message', 'Item added to cart',
    'item', v_cart_item
  );
END;
$function$;
