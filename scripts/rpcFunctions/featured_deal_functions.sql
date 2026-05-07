-- ============================================================
-- Featured Deal RPC Functions (Unified for Day, Week, Month)
-- Supports type parameter: 'day', 'week', 'month'
-- ============================================================

-- ============================================================
-- 1. GET FEATURED DEAL (For Pharmacy)
-- Returns current featured deal based on type (day/week/month)
-- ============================================================

DROP FUNCTION IF EXISTS get_featured_deal(TEXT);

CREATE OR REPLACE FUNCTION get_featured_deal(
  p_type TEXT DEFAULT 'day'  -- 'day', 'week', or 'month'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
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
$$;


-- ============================================================
-- 2. SET FEATURED DEAL (Admin Only)
-- Sets a specific deal as featured (day/week/month)
-- ============================================================

DROP FUNCTION IF EXISTS set_featured_deal(UUID, TEXT, TIMESTAMP WITH TIME ZONE);

CREATE OR REPLACE FUNCTION set_featured_deal(
  p_deal_id UUID,
  p_type TEXT DEFAULT 'day',  -- 'day', 'week', or 'month'
  p_expires_at TIMESTAMP WITH TIME ZONE DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_deal RECORD;
  v_type_label TEXT;
BEGIN
  -- Validate type
  IF p_type NOT IN ('day', 'week', 'month') THEN
    RETURN jsonb_build_object(
      'error', true,
      'message', 'Invalid type. Must be day, week, or month'
    );
  END IF;

  v_type_label := CASE p_type
    WHEN 'day' THEN 'Day'
    WHEN 'week' THEN 'Week'
    WHEN 'month' THEN 'Month'
  END;

  -- Validate deal exists and is active
  SELECT id, product_name, status, expiry_date, quantity
  INTO v_deal
  FROM marketplace_deals
  WHERE id = p_deal_id;
  
  IF v_deal.id IS NULL THEN
    RETURN jsonb_build_object(
      'error', true,
      'message', 'Deal not found'
    );
  END IF;
  
  IF v_deal.status != 'active' THEN
    RETURN jsonb_build_object(
      'error', true,
      'message', 'Only active deals can be set as Deal of the ' || v_type_label
    );
  END IF;
  
  IF v_deal.expiry_date < CURRENT_DATE THEN
    RETURN jsonb_build_object(
      'error', true,
      'message', 'Expired deals cannot be set as Deal of the ' || v_type_label
    );
  END IF;
  
  IF v_deal.quantity <= 0 THEN
    RETURN jsonb_build_object(
      'error', true,
      'message', 'Deals with no remaining quantity cannot be set as Deal of the ' || v_type_label
    );
  END IF;

  -- Unset previous featured deal and set new one based on type
  IF p_type = 'day' THEN
    UPDATE marketplace_deals
    SET is_deal_of_the_day = FALSE,
        deal_of_the_day_until = NULL,
        updated_at = NOW()
    WHERE is_deal_of_the_day = TRUE;
    
    UPDATE marketplace_deals
    SET is_deal_of_the_day = TRUE,
        deal_of_the_day_until = p_expires_at,
        updated_at = NOW()
    WHERE id = p_deal_id;
    
  ELSIF p_type = 'week' THEN
    UPDATE marketplace_deals
    SET is_deal_of_the_week = FALSE,
        deal_of_the_week_until = NULL,
        updated_at = NOW()
    WHERE is_deal_of_the_week = TRUE;
    
    UPDATE marketplace_deals
    SET is_deal_of_the_week = TRUE,
        deal_of_the_week_until = p_expires_at,
        updated_at = NOW()
    WHERE id = p_deal_id;
    
  ELSIF p_type = 'month' THEN
    UPDATE marketplace_deals
    SET is_deal_of_the_month = FALSE,
        deal_of_the_month_until = NULL,
        updated_at = NOW()
    WHERE is_deal_of_the_month = TRUE;
    
    UPDATE marketplace_deals
    SET is_deal_of_the_month = TRUE,
        deal_of_the_month_until = p_expires_at,
        updated_at = NOW()
    WHERE id = p_deal_id;
  END IF;
  
  RETURN jsonb_build_object(
    'error', false,
    'message', 'Deal of the ' || v_type_label || ' updated successfully',
    'dealId', p_deal_id,
    'productName', v_deal.product_name,
    'type', p_type,
    'expiresAt', p_expires_at
  );
END;
$$;


-- ============================================================
-- 3. UNSET FEATURED DEAL (Admin Only)
-- Removes featured deal status based on type
-- ============================================================

DROP FUNCTION IF EXISTS unset_featured_deal(TEXT);

CREATE OR REPLACE FUNCTION unset_featured_deal(
  p_type TEXT DEFAULT 'day'  -- 'day', 'week', or 'month'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count INTEGER;
  v_type_label TEXT;
BEGIN
  -- Validate type
  IF p_type NOT IN ('day', 'week', 'month') THEN
    RETURN jsonb_build_object(
      'error', true,
      'message', 'Invalid type. Must be day, week, or month'
    );
  END IF;

  v_type_label := CASE p_type
    WHEN 'day' THEN 'Day'
    WHEN 'week' THEN 'Week'
    WHEN 'month' THEN 'Month'
  END;

  IF p_type = 'day' THEN
    UPDATE marketplace_deals
    SET is_deal_of_the_day = FALSE,
        deal_of_the_day_until = NULL,
        updated_at = NOW()
    WHERE is_deal_of_the_day = TRUE;
    
  ELSIF p_type = 'week' THEN
    UPDATE marketplace_deals
    SET is_deal_of_the_week = FALSE,
        deal_of_the_week_until = NULL,
        updated_at = NOW()
    WHERE is_deal_of_the_week = TRUE;
    
  ELSIF p_type = 'month' THEN
    UPDATE marketplace_deals
    SET is_deal_of_the_month = FALSE,
        deal_of_the_month_until = NULL,
        updated_at = NOW()
    WHERE is_deal_of_the_month = TRUE;
  END IF;
  
  GET DIAGNOSTICS v_count = ROW_COUNT;
  
  RETURN jsonb_build_object(
    'error', false,
    'message', 'Deal of the ' || v_type_label || ' removed successfully',
    'type', p_type,
    'dealsUnset', v_count
  );
END;
$$;


-- ============================================================
-- 4. GET FEATURED DEAL INFO (Admin)
-- Returns current featured deal info with metadata
-- ============================================================

DROP FUNCTION IF EXISTS get_featured_deal_info(TEXT);

CREATE OR REPLACE FUNCTION get_featured_deal_info(
  p_type TEXT DEFAULT 'day'  -- 'day', 'week', or 'month'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_manual_deal JSONB;
  v_type_label TEXT;
BEGIN
  -- Validate type
  IF p_type NOT IN ('day', 'week', 'month') THEN
    RETURN jsonb_build_object(
      'error', true,
      'message', 'Invalid type. Must be day, week, or month'
    );
  END IF;

  v_type_label := CASE p_type
    WHEN 'day' THEN 'Day'
    WHEN 'week' THEN 'Week'
    WHEN 'month' THEN 'Month'
  END;

  -- Get manual selection based on type
  IF p_type = 'day' THEN
    SELECT jsonb_build_object(
      'id', d.id,
      'dealNumber', d.deal_number,
      'productName', d.product_name,
      'isFeatured', d.is_deal_of_the_day,
      'featuredUntil', d.deal_of_the_day_until,
      'isExpired', d.deal_of_the_day_until IS NOT NULL AND d.deal_of_the_day_until < NOW(),
      'type', 'day',
      'selectionType', 'manual'
    )
    INTO v_manual_deal
    FROM marketplace_deals d
    WHERE d.is_deal_of_the_day = TRUE
    LIMIT 1;
    
  ELSIF p_type = 'week' THEN
    SELECT jsonb_build_object(
      'id', d.id,
      'dealNumber', d.deal_number,
      'productName', d.product_name,
      'isFeatured', d.is_deal_of_the_week,
      'featuredUntil', d.deal_of_the_week_until,
      'isExpired', d.deal_of_the_week_until IS NOT NULL AND d.deal_of_the_week_until < NOW(),
      'type', 'week',
      'selectionType', 'manual'
    )
    INTO v_manual_deal
    FROM marketplace_deals d
    WHERE d.is_deal_of_the_week = TRUE
    LIMIT 1;
    
  ELSIF p_type = 'month' THEN
    SELECT jsonb_build_object(
      'id', d.id,
      'dealNumber', d.deal_number,
      'productName', d.product_name,
      'isFeatured', d.is_deal_of_the_month,
      'featuredUntil', d.deal_of_the_month_until,
      'isExpired', d.deal_of_the_month_until IS NOT NULL AND d.deal_of_the_month_until < NOW(),
      'type', 'month',
      'selectionType', 'manual'
    )
    INTO v_manual_deal
    FROM marketplace_deals d
    WHERE d.is_deal_of_the_month = TRUE
    LIMIT 1;
  END IF;

  RETURN jsonb_build_object(
    'type', p_type,
    'typeLabel', v_type_label,
    'deal', get_featured_deal(p_type),
    'manualDeal', v_manual_deal,
    'hasManualSelection', v_manual_deal IS NOT NULL
  );
END;
$$;


-- ============================================================
-- 5. GET ALL FEATURED DEALS (Combined)
-- Returns all featured deals (day, week, month) at once
-- ============================================================

DROP FUNCTION IF EXISTS get_all_featured_deals();

CREATE OR REPLACE FUNCTION get_all_featured_deals()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN jsonb_build_object(
    'dealOfTheDay', get_featured_deal('day'),
    'dealOfTheWeek', get_featured_deal('week'),
    'dealOfTheMonth', get_featured_deal('month')
  );
END;
$$;


-- ============================================================
-- GRANT PERMISSIONS
-- ============================================================

GRANT EXECUTE ON FUNCTION get_featured_deal TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION set_featured_deal TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION unset_featured_deal TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION get_featured_deal_info TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION get_all_featured_deals TO authenticated, anon, service_role;

