-- Function : get_pharmacy_cart
-- Arguments: p_pharmacy_id uuid
-- Type     : FUNCTION
-- =============================================================

DROP FUNCTION IF EXISTS public.get_pharmacy_cart(p_pharmacy_id uuid) CASCADE;

CREATE OR REPLACE FUNCTION public.get_pharmacy_cart(p_pharmacy_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_cart_id UUID;
  v_items JSONB;
  v_subtotal NUMERIC(12, 2);
  v_total_savings NUMERIC(12, 2);
  v_item_count INTEGER;
BEGIN
  -- Get cart ID
  SELECT id INTO v_cart_id
  FROM pharmacy_cart
  WHERE pharmacy_id = p_pharmacy_id;
  
  -- If no cart exists, return empty cart
  IF v_cart_id IS NULL THEN
    RETURN jsonb_build_object(
      'items', '[]'::jsonb,
      'summary', jsonb_build_object(
        'itemCount', 0,
        'subtotal', 0,
        'totalSavings', 0,
        'estimatedTax', 0,
        'total', 0
      )
    );
  END IF;
  
  -- Get all cart items with deal details
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
        'dealStatus', d.status,
        'expiryDate', d.expiry_date,
        'addedAt', ci.added_at
      )
      ORDER BY ci.added_at DESC
    ), '[]'::jsonb),
    COALESCE(SUM(ci.quantity * ci.unit_price), 0),
    COALESCE(SUM((ci.original_price - ci.unit_price) * ci.quantity), 0),
    COALESCE(COUNT(*)::INTEGER, 0)
  INTO v_items, v_subtotal, v_total_savings, v_item_count
  FROM pharmacy_cart_items ci
  JOIN marketplace_deals d ON d.id = ci.deal_id
  WHERE ci.cart_id = v_cart_id;
  
  RETURN jsonb_build_object(
    'items', v_items,
    'summary', jsonb_build_object(
      'itemCount', v_item_count,
      'subtotal', v_subtotal,
      'totalSavings', v_total_savings,
      'estimatedTax', ROUND(v_subtotal * 0.08, 2), -- 8% tax
      'total', ROUND(v_subtotal * 1.08, 2) -- Subtotal + 8% tax
    )
  );
END;
$function$;
