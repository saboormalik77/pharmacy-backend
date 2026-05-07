-- ============================================================
-- MANUAL FEATURED DEALS ONLY FUNCTIONS
-- These functions only return manually set featured deals, no automatic fallback
-- ============================================================

-- Function to get only manually set featured deals (no automatic selection)
DROP FUNCTION IF EXISTS get_manual_featured_deal(TEXT);

CREATE OR REPLACE FUNCTION get_manual_featured_deal(
  p_type TEXT DEFAULT 'day'  -- 'day', 'week', or 'month'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_manual_deal_id UUID;
  v_manual_deal_expired BOOLEAN := FALSE;
  v_deal JSONB;
BEGIN
  -- Validate type
  IF p_type NOT IN ('day', 'week', 'month') THEN
    RETURN jsonb_build_object(
      'error', true,
      'message', 'Invalid type. Must be day, week, or month'
    );
  END IF;

  -- Clean up expired deals first
  IF p_type = 'day' THEN
    UPDATE marketplace_deals
    SET is_deal_of_the_day = FALSE,
        deal_of_the_day_until = NULL,
        updated_at = NOW()
    WHERE is_deal_of_the_day = TRUE
      AND deal_of_the_day_until IS NOT NULL
      AND deal_of_the_day_until < NOW();
      
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

  -- If no manual deal exists or it's expired, return null
  IF v_manual_deal_id IS NULL OR COALESCE(v_manual_deal_expired, FALSE) THEN
    RETURN jsonb_build_object(
      'error', false,
      'deal', null
    );
  END IF;

  -- Return the manual deal
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
END;
$$;

-- Function to get all manually set featured deals (no automatic selection)
DROP FUNCTION IF EXISTS get_all_manual_featured_deals();

CREATE OR REPLACE FUNCTION get_all_manual_featured_deals()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN jsonb_build_object(
    'dealOfTheDay', get_manual_featured_deal('day'),
    'dealOfTheWeek', get_manual_featured_deal('week'),
    'dealOfTheMonth', get_manual_featured_deal('month')
  );
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_manual_featured_deal TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION get_all_manual_featured_deals TO authenticated, anon, service_role;
