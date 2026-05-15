-- Function : get_pharmacy_marketplace_deal_by_id
-- Arguments: p_pharmacy_id uuid, p_deal_id uuid
-- Type     : FUNCTION
-- =============================================================

DROP FUNCTION IF EXISTS public.get_pharmacy_marketplace_deal_by_id(p_pharmacy_id uuid, p_deal_id uuid) CASCADE;

CREATE OR REPLACE FUNCTION public.get_pharmacy_marketplace_deal_by_id(p_pharmacy_id uuid, p_deal_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_deal JSONB;
  v_in_cart BOOLEAN;
  v_cart_quantity INTEGER;
BEGIN
  -- Get deal details (any status)
  SELECT jsonb_build_object(
    'id', d.id,
    'dealNumber', d.deal_number,
    'productName', d.product_name,
    'category', d.category,
    'ndc', d.ndc,
    'quantity', d.quantity,
    'originalQuantity', COALESCE(d.original_quantity, d.quantity),
    'soldQuantity', COALESCE(d.original_quantity, d.quantity) - d.quantity,
    'remainingQuantity', d.quantity,
    'minimumBuyQuantity', COALESCE(d.minimum_buy_quantity, 1),
    'unit', d.unit,
    'originalPrice', d.original_price,
    'dealPrice', d.deal_price,
    'savings', ROUND(((d.original_price - d.deal_price) / d.original_price * 100), 0),
    'totalSavingsAmount', ROUND((d.original_price - d.deal_price), 2),
    'distributor', d.distributor_name,
    'expiryDate', d.expiry_date,
    'postedDate', d.posted_date,
    'status', d.status,
    'imageUrl', d.image_url,
    'notes', d.notes,
    'isDealOfTheDay', COALESCE(d.is_deal_of_the_day, false),
    'dealOfTheDayUntil', d.deal_of_the_day_until,
    'isDealOfTheWeek', COALESCE(d.is_deal_of_the_week, false),
    'dealOfTheWeekUntil', d.deal_of_the_week_until,
    'isDealOfTheMonth', COALESCE(d.is_deal_of_the_month, false),
    'dealOfTheMonthUntil', d.deal_of_the_month_until
  )
  INTO v_deal
  FROM marketplace_deals d
  WHERE d.id = p_deal_id;
  
  IF v_deal IS NULL THEN
    RETURN jsonb_build_object(
      'error', true,
      'message', 'Deal not found'
    );
  END IF;
  
  -- Check if deal is in pharmacy's cart
  SELECT 
    COALESCE(ci.quantity, 0) > 0,
    COALESCE(ci.quantity, 0)
  INTO v_in_cart, v_cart_quantity
  FROM pharmacy_cart c
  LEFT JOIN pharmacy_cart_items ci ON ci.cart_id = c.id AND ci.deal_id = p_deal_id
  WHERE c.pharmacy_id = p_pharmacy_id;
  
  -- Add cart info to deal
  v_deal := v_deal || jsonb_build_object(
    'inCart', COALESCE(v_in_cart, false),
    'cartQuantity', COALESCE(v_cart_quantity, 0)
  );
  
  RETURN jsonb_build_object(
    'error', false,
    'deal', v_deal
  );
END;
$function$;
