-- Function : get_featured_deal
-- Arguments: p_type text
-- Type     : FUNCTION
-- =============================================================

DROP FUNCTION IF EXISTS public.get_featured_deal(p_type text) CASCADE;

CREATE OR REPLACE FUNCTION public.get_featured_deal(p_type text DEFAULT 'day'::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_deal JSONB;
  v_manual_deal_id UUID;
  v_manual_deal_expired BOOLEAN;
  v_is_field TEXT;
  v_until_field TEXT;
  v_type_label TEXT;
BEGIN
  -- Validate type
  IF p_type NOT IN ('day', 'week', 'month') THEN
    RETURN jsonb_build_object(
      'error', true,
      'message', 'Invalid type. Must be day, week, or month'
    );
  END IF;

  -- Set field names based on type
  v_type_label := CASE p_type
    WHEN 'day' THEN 'Day'
    WHEN 'week' THEN 'Week'
    WHEN 'month' THEN 'Month'
  END;

  -- First, check for expired manual featured deals and reset them
  IF p_type = 'day' THEN
    UPDATE marketplace_deals
    SET is_deal_of_the_day = FALSE,
        deal_of_the_day_until = NULL,
        updated_at = NOW()
    WHERE is_deal_of_the_day = TRUE
      AND deal_of_the_day_until IS NOT NULL
      AND deal_of_the_day_until < NOW();
      
    -- Get manual deal
    SELECT id, (deal_of_the_day_until IS NOT NULL AND deal_of_the_day_until < NOW())
    INTO v_manual_deal_id, v_manual_deal_expired
    FROM marketplace_deals
    WHERE is_deal_of_the_day = TRUE
      AND status = 'active'
      AND expiry_date >= CURRENT_DATE
      AND quantity > 0
    LIMIT 1;
    
  ELSIF p_type = 'week' THEN
    UPDATE marketplace_deals
    SET is_deal_of_the_week = FALSE,
        deal_of_the_week_until = NULL,
        updated_at = NOW()
    WHERE is_deal_of_the_week = TRUE
      AND deal_of_the_week_until IS NOT NULL
      AND deal_of_the_week_until < NOW();
      
    SELECT id, (deal_of_the_week_until IS NOT NULL AND deal_of_the_week_until < NOW())
    INTO v_manual_deal_id, v_manual_deal_expired
    FROM marketplace_deals
    WHERE is_deal_of_the_week = TRUE
      AND status = 'active'
      AND expiry_date >= CURRENT_DATE
      AND quantity > 0
    LIMIT 1;
    
  ELSIF p_type = 'month' THEN
    UPDATE marketplace_deals
    SET is_deal_of_the_month = FALSE,
        deal_of_the_month_until = NULL,
        updated_at = NOW()
    WHERE is_deal_of_the_month = TRUE
      AND deal_of_the_month_until IS NOT NULL
      AND deal_of_the_month_until < NOW();
      
    SELECT id, (deal_of_the_month_until IS NOT NULL AND deal_of_the_month_until < NOW())
    INTO v_manual_deal_id, v_manual_deal_expired
    FROM marketplace_deals
    WHERE is_deal_of_the_month = TRUE
      AND status = 'active'
      AND expiry_date >= CURRENT_DATE
      AND quantity > 0
    LIMIT 1;
  END IF;

  -- If manual deal exists and not expired, return it
  IF v_manual_deal_id IS NOT NULL AND NOT COALESCE(v_manual_deal_expired, FALSE) THEN
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
      'isFeaturedDeal', true,
      'featuredDealType', p_type,
      'selectionType', 'manual',
      'featuredUntil', CASE p_type
        WHEN 'day' THEN d.deal_of_the_day_until
        WHEN 'week' THEN d.deal_of_the_week_until
        WHEN 'month' THEN d.deal_of_the_month_until
      END
    )
    INTO v_deal
    FROM marketplace_deals d
    WHERE d.id = v_manual_deal_id;
    
    RETURN jsonb_build_object(
      'error', false,
      'deal', v_deal
    );
  END IF;

  -- No valid manual deal, get automatic selection based on type
  IF p_type = 'day' THEN
    -- Day: Best savings percentage
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
      'isFeaturedDeal', true,
      'featuredDealType', 'day',
      'selectionType', 'automatic'
    )
    INTO v_deal
    FROM marketplace_deals d
    WHERE d.status = 'active'
      AND d.expiry_date >= CURRENT_DATE
      AND d.quantity > 0
    ORDER BY 
      ROUND(((d.original_price - d.deal_price) / d.original_price * 100), 0) DESC,
      d.posted_date DESC
    LIMIT 1;
    
  ELSIF p_type = 'week' THEN
    -- Week: Best savings percentage (excluding deal of the day)
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
      'isFeaturedDeal', true,
      'featuredDealType', 'week',
      'selectionType', 'automatic'
    )
    INTO v_deal
    FROM marketplace_deals d
    WHERE d.status = 'active'
      AND d.expiry_date >= CURRENT_DATE
      AND d.quantity > 0
      AND d.is_deal_of_the_day = FALSE
    ORDER BY 
      ROUND(((d.original_price - d.deal_price) / d.original_price * 100), 0) DESC,
      d.posted_date DESC
    LIMIT 1;
    
  ELSIF p_type = 'month' THEN
    -- Month: Highest total savings potential (excluding day and week)
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
      'isFeaturedDeal', true,
      'featuredDealType', 'month',
      'selectionType', 'automatic'
    )
    INTO v_deal
    FROM marketplace_deals d
    WHERE d.status = 'active'
      AND d.expiry_date >= CURRENT_DATE
      AND d.quantity > 0
      AND d.is_deal_of_the_day = FALSE
      AND d.is_deal_of_the_week = FALSE
    ORDER BY 
      (d.original_price - d.deal_price) * d.quantity DESC,
      d.posted_date DESC
    LIMIT 1;
  END IF;

  IF v_deal IS NULL THEN
    RETURN jsonb_build_object(
      'error', true,
      'message', 'No active deals available for Deal of the ' || v_type_label
    );
  END IF;
  
  RETURN jsonb_build_object(
    'error', false,
    'deal', v_deal
  );
END;
$function$;
