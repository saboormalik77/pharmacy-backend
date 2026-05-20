-- Function : validate_pharmacy_cart
-- Arguments: p_pharmacy_id uuid
-- Type     : FUNCTION
-- =============================================================

DROP FUNCTION IF EXISTS public.validate_pharmacy_cart(p_pharmacy_id uuid) CASCADE;

CREATE OR REPLACE FUNCTION public.validate_pharmacy_cart(p_pharmacy_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_cart_id UUID;
  v_issues JSONB := '[]'::jsonb;
  v_valid_items JSONB;
  v_subtotal NUMERIC(12, 2);
  v_total_savings NUMERIC(12, 2);
  v_item_count INTEGER;
  v_issue_record RECORD;
BEGIN
  -- Get cart ID
  SELECT id INTO v_cart_id
  FROM pharmacy_cart
  WHERE pharmacy_id = p_pharmacy_id;
  
  IF v_cart_id IS NULL THEN
    RETURN jsonb_build_object(
      'valid', false,
      'message', 'Cart is empty',
      'issues', '[]'::jsonb,
      'items', '[]'::jsonb
    );
  END IF;
  
  -- Find items with issues (deal not active, quantity exceeds stock, or below minimum)
  -- Note: If available quantity < minimum_buy_quantity, then remaining stock becomes the effective minimum
  FOR v_issue_record IN
    SELECT 
      ci.id as item_id,
      ci.deal_id,
      d.product_name,
      ci.quantity as cart_quantity,
      d.quantity as available_quantity,
      COALESCE(d.minimum_buy_quantity, 1) as minimum_buy_quantity,
      -- Effective minimum: the lesser of minimum_buy_quantity and available_quantity
      LEAST(COALESCE(d.minimum_buy_quantity, 1), d.quantity) as effective_minimum,
      d.status as deal_status,
      CASE 
        WHEN d.status != 'active' THEN 'Deal is no longer available (status: ' || d.status || ')'
        WHEN ci.quantity > d.quantity THEN 'Quantity in cart (' || ci.quantity || ') exceeds available stock (' || d.quantity || ')'
        -- Only flag as below minimum if cart quantity is less than the effective minimum
        WHEN ci.quantity < LEAST(COALESCE(d.minimum_buy_quantity, 1), d.quantity) THEN 
          'Minimum order quantity is ' || LEAST(COALESCE(d.minimum_buy_quantity, 1), d.quantity) || ' units'
        ELSE NULL
      END as issue
    FROM pharmacy_cart_items ci
    JOIN marketplace_deals d ON d.id = ci.deal_id
    WHERE ci.cart_id = v_cart_id
      AND (
        d.status != 'active' 
        OR ci.quantity > d.quantity
        OR ci.quantity < LEAST(COALESCE(d.minimum_buy_quantity, 1), d.quantity)
      )
  LOOP
    v_issues := v_issues || jsonb_build_object(
      'itemId', v_issue_record.item_id,
      'dealId', v_issue_record.deal_id,
      'productName', v_issue_record.product_name,
      'issue', v_issue_record.issue
    );
  END LOOP;
  
  -- Get valid items and totals
  -- Valid items must: be active, not exceed stock, and meet effective minimum (min of minimum_buy_quantity and available stock)
  SELECT 
    COALESCE(jsonb_agg(
      jsonb_build_object(
        'id', ci.id,
        'dealId', ci.deal_id,
        'productName', d.product_name,
        'ndc', d.ndc,
        'category', d.category,
        'distributor', d.distributor_name,
        'quantity', ci.quantity,
        'unitPrice', ci.unit_price,
        'originalPrice', ci.original_price,
        'totalPrice', ci.quantity * ci.unit_price,
        'savings', (ci.original_price - ci.unit_price) * ci.quantity,
        'savingsPercent', ROUND(((ci.original_price - ci.unit_price) / ci.original_price * 100), 0),
        'imageUrl', d.image_url,
        'availableQuantity', d.quantity,
        'minimumBuyQuantity', COALESCE(d.minimum_buy_quantity, 1),
        'effectiveMinimum', LEAST(COALESCE(d.minimum_buy_quantity, 1), d.quantity),
        'unit', d.unit,
        'dealStatus', d.status,
        'expiryDate', d.expiry_date,
        'addedAt', ci.added_at
      )
      ORDER BY ci.added_at DESC
    ), '[]'::jsonb),
    COALESCE(SUM(ci.quantity * ci.unit_price), 0),
    COALESCE(SUM((ci.original_price - ci.unit_price) * ci.quantity), 0),
    COUNT(*)::INTEGER
  INTO v_valid_items, v_subtotal, v_total_savings, v_item_count
  FROM pharmacy_cart_items ci
  JOIN marketplace_deals d ON d.id = ci.deal_id
  WHERE ci.cart_id = v_cart_id
    AND d.status = 'active'
    AND ci.quantity <= d.quantity
    AND ci.quantity >= LEAST(COALESCE(d.minimum_buy_quantity, 1), d.quantity);
  
  RETURN jsonb_build_object(
    'valid', jsonb_array_length(v_issues) = 0,
    'message', CASE 
      WHEN jsonb_array_length(v_issues) = 0 THEN 'Cart is valid and ready for checkout'
      ELSE 'Some items in your cart have issues'
    END,
    'issues', v_issues,
    'items', v_valid_items,
    'summary', jsonb_build_object(
      'itemCount', v_item_count,
      'subtotal', v_subtotal,
      'totalSavings', v_total_savings,
      'estimatedTax', ROUND(v_subtotal * 0.08, 2),
      'total', ROUND(v_subtotal * 1.08, 2)
    )
  );
END;
$function$;
