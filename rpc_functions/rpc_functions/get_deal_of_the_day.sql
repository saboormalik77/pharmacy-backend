-- Function : get_deal_of_the_day
-- Arguments: none
-- Type     : FUNCTION
-- =============================================================

DROP FUNCTION IF EXISTS public.get_deal_of_the_day() CASCADE;

CREATE OR REPLACE FUNCTION public.get_deal_of_the_day()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_deal JSONB;
  v_manual_deal_id UUID;
  v_manual_deal_expired BOOLEAN;
BEGIN
  -- First, check for expired manual Deal of the Day
  UPDATE marketplace_deals
  SET is_deal_of_the_day = FALSE,
      deal_of_the_day_until = NULL,
      updated_at = NOW()
  WHERE is_deal_of_the_day = TRUE
    AND deal_of_the_day_until IS NOT NULL
    AND deal_of_the_day_until < NOW();
  
  -- Try to get manual Deal of the Day (not expired)
  SELECT id, (deal_of_the_day_until IS NOT NULL AND deal_of_the_day_until < NOW())
  INTO v_manual_deal_id, v_manual_deal_expired
  FROM marketplace_deals
  WHERE is_deal_of_the_day = TRUE
    AND status = 'active'
    AND expiry_date >= CURRENT_DATE
    AND quantity > 0
  LIMIT 1;
  
  -- If manual deal exists and not expired, return it
  IF v_manual_deal_id IS NOT NULL AND NOT v_manual_deal_expired THEN
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
      'isDealOfTheDay', true,
      'dealOfTheDayType', 'manual',
      'dealOfTheDayUntil', d.deal_of_the_day_until
    )
    INTO v_deal
    FROM marketplace_deals d
    WHERE d.id = v_manual_deal_id;
    
    RETURN jsonb_build_object(
      'error', false,
      'deal', v_deal
    );
  END IF;
  
  -- No valid manual deal, get automatic selection
  -- Criteria: Best savings percentage, then newest
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
    'isDealOfTheDay', true,
    'dealOfTheDayType', 'automatic'
  )
  INTO v_deal
  FROM marketplace_deals d
  WHERE d.status = 'active'
    AND d.expiry_date >= CURRENT_DATE
    AND d.quantity > 0
  ORDER BY 
    ROUND(((d.original_price - d.deal_price) / d.original_price * 100), 0) DESC, -- Best savings first
    d.posted_date DESC -- Newest first if tie
  LIMIT 1;
  
  IF v_deal IS NULL THEN
    RETURN jsonb_build_object(
      'error', true,
      'message', 'No active deals available for Deal of the Day'
    );
  END IF;
  
  RETURN jsonb_build_object(
    'error', false,
    'deal', v_deal
  );
END;
$function$;
