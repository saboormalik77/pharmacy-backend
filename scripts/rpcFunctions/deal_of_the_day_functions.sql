-- ============================================================
-- Deal of the Day RPC Functions
-- Handles manual and automatic Deal of the Day selection
-- ============================================================

-- ============================================================
-- 1. GET DEAL OF THE DAY (For Pharmacy)
-- Returns current Deal of the Day (manual or automatic)
-- ============================================================

DROP FUNCTION IF EXISTS get_deal_of_the_day();

CREATE OR REPLACE FUNCTION get_deal_of_the_day()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
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
$$;

-- ============================================================
-- 2. SET DEAL OF THE DAY (Admin Only)
-- Sets a specific deal as Deal of the Day
-- Automatically unsets previous Deal of the Day
-- ============================================================

DROP FUNCTION IF EXISTS set_deal_of_the_day(UUID, TIMESTAMP WITH TIME ZONE);

CREATE OR REPLACE FUNCTION set_deal_of_the_day(
  p_deal_id UUID,
  p_expires_at TIMESTAMP WITH TIME ZONE DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_deal RECORD;
BEGIN
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
      'message', 'Only active deals can be set as Deal of the Day'
    );
  END IF;
  
  IF v_deal.expiry_date < CURRENT_DATE THEN
    RETURN jsonb_build_object(
      'error', true,
      'message', 'Expired deals cannot be set as Deal of the Day'
    );
  END IF;
  
  IF v_deal.quantity <= 0 THEN
    RETURN jsonb_build_object(
      'error', true,
      'message', 'Deals with no remaining quantity cannot be set as Deal of the Day'
    );
  END IF;
  
  -- Unset previous Deal of the Day
  UPDATE marketplace_deals
  SET is_deal_of_the_day = FALSE,
      deal_of_the_day_until = NULL,
      updated_at = NOW()
  WHERE is_deal_of_the_day = TRUE;
  
  -- Set new Deal of the Day
  UPDATE marketplace_deals
  SET is_deal_of_the_day = TRUE,
      deal_of_the_day_until = p_expires_at,
      updated_at = NOW()
  WHERE id = p_deal_id;
  
  RETURN jsonb_build_object(
    'error', false,
    'message', 'Deal of the Day updated successfully',
    'dealId', p_deal_id,
    'productName', v_deal.product_name,
    'expiresAt', p_expires_at
  );
END;
$$;

-- ============================================================
-- 3. UNSET DEAL OF THE DAY (Admin Only)
-- Removes Deal of the Day status
-- System will fall back to automatic selection
-- ============================================================

DROP FUNCTION IF EXISTS unset_deal_of_the_day();

CREATE OR REPLACE FUNCTION unset_deal_of_the_day()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  -- Unset all Deal of the Day
  UPDATE marketplace_deals
  SET is_deal_of_the_day = FALSE,
      deal_of_the_day_until = NULL,
      updated_at = NOW()
  WHERE is_deal_of_the_day = TRUE;
  
  GET DIAGNOSTICS v_count = ROW_COUNT;
  
  RETURN jsonb_build_object(
    'error', false,
    'message', 'Deal of the Day removed successfully',
    'dealsUnset', v_count
  );
END;
$$;

-- ============================================================
-- 4. GET CURRENT DEAL OF THE DAY INFO (Admin)
-- Returns current Deal of the Day with metadata
-- ============================================================

DROP FUNCTION IF EXISTS get_current_deal_of_the_day_info();

CREATE OR REPLACE FUNCTION get_current_deal_of_the_day_info()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_info JSONB;
  v_manual_deal JSONB;
BEGIN
  -- Get manual Deal of the Day if exists
  SELECT jsonb_build_object(
    'id', d.id,
    'dealNumber', d.deal_number,
    'productName', d.product_name,
    'isDealOfTheDay', d.is_deal_of_the_day,
    'dealOfTheDayUntil', d.deal_of_the_day_until,
    'isExpired', d.deal_of_the_day_until IS NOT NULL AND d.deal_of_the_day_until < NOW(),
    'type', 'manual'
  )
  INTO v_manual_deal
  FROM marketplace_deals d
  WHERE d.is_deal_of_the_day = TRUE
  LIMIT 1;
  
  -- Get automatic selection
  SELECT jsonb_build_object(
    'deal', get_deal_of_the_day(),
    'manualDeal', v_manual_deal,
    'hasManualSelection', v_manual_deal IS NOT NULL
  )
  INTO v_info;
  
  RETURN v_info;
END;
$$;

-- ============================================================
-- GRANT PERMISSIONS
-- ============================================================

GRANT EXECUTE ON FUNCTION get_deal_of_the_day TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION set_deal_of_the_day TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION unset_deal_of_the_day TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION get_current_deal_of_the_day_info TO authenticated, anon, service_role;

