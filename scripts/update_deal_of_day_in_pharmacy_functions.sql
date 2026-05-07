-- ============================================================
-- Update Pharmacy Marketplace Functions to include Deal of the Day & Minimum Buy Quantity
-- Run AFTER add_deal_of_the_day.sql and add_minimum_buy_quantity.sql
-- ============================================================

-- ============================================================
-- 1. UPDATE get_pharmacy_marketplace_deals - Add isDealOfTheDay and minimumBuyQuantity
-- ============================================================

DROP FUNCTION IF EXISTS get_pharmacy_marketplace_deals(UUID, INTEGER, INTEGER, TEXT, TEXT, TEXT, TEXT, TEXT);

CREATE OR REPLACE FUNCTION get_pharmacy_marketplace_deals(
  p_pharmacy_id UUID,
  p_page INTEGER DEFAULT 1,
  p_limit INTEGER DEFAULT 12,
  p_search TEXT DEFAULT NULL,
  p_category TEXT DEFAULT NULL,
  p_status TEXT DEFAULT NULL,
  p_sort_by TEXT DEFAULT 'posted_date',
  p_sort_order TEXT DEFAULT 'desc'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_offset INTEGER;
  v_total INTEGER;
  v_deals JSONB;
  v_categories JSONB;
  v_stats JSONB;
  v_total_deals INTEGER;
  v_active_deals INTEGER;
  v_sold_deals INTEGER;
  v_expired_deals INTEGER;
BEGIN
  -- Calculate offset
  v_offset := (p_page - 1) * p_limit;
  
  -- First, update any expired deals
  UPDATE marketplace_deals
  SET status = 'expired', updated_at = NOW()
  WHERE status = 'active' AND expiry_date < CURRENT_DATE;
  
  -- Also expire any Deal of the Day that has passed its expiration
  UPDATE marketplace_deals
  SET is_deal_of_the_day = FALSE,
      deal_of_the_day_until = NULL,
      updated_at = NOW()
  WHERE is_deal_of_the_day = TRUE
    AND deal_of_the_day_until IS NOT NULL
    AND deal_of_the_day_until < NOW();
  
  -- Get unique categories from all deals
  SELECT COALESCE(jsonb_agg(DISTINCT category ORDER BY category), '[]'::jsonb)
  INTO v_categories
  FROM marketplace_deals;
  
  -- Get quick stats for all deals
  SELECT COUNT(*)::INTEGER INTO v_total_deals FROM marketplace_deals;
  SELECT COUNT(*)::INTEGER INTO v_active_deals FROM marketplace_deals WHERE status = 'active';
  SELECT COUNT(*)::INTEGER INTO v_sold_deals FROM marketplace_deals WHERE status = 'sold';
  SELECT COUNT(*)::INTEGER INTO v_expired_deals FROM marketplace_deals WHERE status = 'expired';
  
  v_stats := jsonb_build_object(
    'totalDeals', v_total_deals,
    'activeDeals', v_active_deals,
    'soldDeals', v_sold_deals,
    'expiredDeals', v_expired_deals,
    'totalItems', (SELECT COALESCE(SUM(quantity), 0)::BIGINT FROM marketplace_deals),
    'avgSavings', (SELECT COALESCE(AVG(ROUND(((original_price - deal_price) / original_price * 100), 0)), 0)::NUMERIC(5,2) FROM marketplace_deals),
    'categories', v_categories
  );
  
  -- Count total matching deals
  SELECT COUNT(*)::INTEGER
  INTO v_total
  FROM marketplace_deals d
  WHERE 
    (p_search IS NULL OR p_search = '' OR
      d.product_name ILIKE '%' || p_search || '%' OR
      d.distributor_name ILIKE '%' || p_search || '%' OR
      d.deal_number ILIKE '%' || p_search || '%' OR
      d.ndc ILIKE '%' || p_search || '%' OR
      d.category ILIKE '%' || p_search || '%')
    AND (p_category IS NULL OR p_category = '' OR p_category = 'all' OR d.category = p_category)
    AND (p_status IS NULL OR p_status = '' OR p_status = 'all' OR d.status = p_status);
  
  -- Fetch deals with dynamic sorting
  SELECT COALESCE(jsonb_agg(deal_row), '[]'::jsonb)
  INTO v_deals
  FROM (
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
      'inCart', COALESCE(ci.quantity, 0) > 0,
      'cartQuantity', COALESCE(ci.quantity, 0),
      -- Deal of the Day fields
      'isDealOfTheDay', COALESCE(d.is_deal_of_the_day, false),
      'dealOfTheDayUntil', d.deal_of_the_day_until
    ) AS deal_row
    FROM marketplace_deals d
    LEFT JOIN pharmacy_cart c ON c.pharmacy_id = p_pharmacy_id
    LEFT JOIN pharmacy_cart_items ci ON ci.cart_id = c.id AND ci.deal_id = d.id
    WHERE 
      (p_search IS NULL OR p_search = '' OR
        d.product_name ILIKE '%' || p_search || '%' OR
        d.distributor_name ILIKE '%' || p_search || '%' OR
        d.deal_number ILIKE '%' || p_search || '%' OR
        d.ndc ILIKE '%' || p_search || '%' OR
        d.category ILIKE '%' || p_search || '%')
      AND (p_category IS NULL OR p_category = '' OR p_category = 'all' OR d.category = p_category)
      AND (p_status IS NULL OR p_status = '' OR p_status = 'all' OR d.status = p_status)
    ORDER BY
      -- Deal of the Day first
      d.is_deal_of_the_day DESC NULLS LAST,
      CASE WHEN p_sort_order = 'desc' THEN
        CASE p_sort_by
          WHEN 'product_name' THEN d.product_name
          WHEN 'category' THEN d.category
          WHEN 'distributor' THEN d.distributor_name
          WHEN 'status' THEN d.status
          WHEN 'posted_date' THEN d.posted_date::TEXT
          WHEN 'expiry_date' THEN d.expiry_date::TEXT
          WHEN 'deal_price' THEN LPAD(d.deal_price::TEXT, 20, '0')
          WHEN 'quantity' THEN LPAD(d.quantity::TEXT, 20, '0')
          WHEN 'savings' THEN LPAD(ROUND(((d.original_price - d.deal_price) / d.original_price * 100), 0)::TEXT, 20, '0')
          ELSE d.posted_date::TEXT
        END
      END DESC NULLS LAST,
      CASE WHEN p_sort_order = 'asc' THEN
        CASE p_sort_by
          WHEN 'product_name' THEN d.product_name
          WHEN 'category' THEN d.category
          WHEN 'distributor' THEN d.distributor_name
          WHEN 'status' THEN d.status
          WHEN 'posted_date' THEN d.posted_date::TEXT
          WHEN 'expiry_date' THEN d.expiry_date::TEXT
          WHEN 'deal_price' THEN LPAD(d.deal_price::TEXT, 20, '0')
          WHEN 'quantity' THEN LPAD(d.quantity::TEXT, 20, '0')
          WHEN 'savings' THEN LPAD(ROUND(((d.original_price - d.deal_price) / d.original_price * 100), 0)::TEXT, 20, '0')
          ELSE d.posted_date::TEXT
        END
      END ASC NULLS LAST
    LIMIT p_limit
    OFFSET v_offset
  ) AS deal_row;
  
  -- Return response
  RETURN jsonb_build_object(
    'deals', v_deals,
    'categories', v_categories,
    'stats', v_stats,
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
-- 2. UPDATE get_pharmacy_marketplace_deal_by_id - Add isDealOfTheDay and minimumBuyQuantity
-- ============================================================

DROP FUNCTION IF EXISTS get_pharmacy_marketplace_deal_by_id(UUID, UUID);

CREATE OR REPLACE FUNCTION get_pharmacy_marketplace_deal_by_id(
  p_pharmacy_id UUID,
  p_deal_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_deal JSONB;
  v_cart_quantity INTEGER;
BEGIN
  -- Get cart quantity for this deal
  SELECT COALESCE(ci.quantity, 0)
  INTO v_cart_quantity
  FROM pharmacy_cart c
  LEFT JOIN pharmacy_cart_items ci ON ci.cart_id = c.id AND ci.deal_id = p_deal_id
  WHERE c.pharmacy_id = p_pharmacy_id;
  
  -- Get deal with all details
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
    'inCart', COALESCE(v_cart_quantity, 0) > 0,
    'cartQuantity', COALESCE(v_cart_quantity, 0),
    -- Deal of the Day fields
    'isDealOfTheDay', COALESCE(d.is_deal_of_the_day, false),
    'dealOfTheDayUntil', d.deal_of_the_day_until
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
  
  RETURN jsonb_build_object(
    'error', false,
    'deal', v_deal
  );
END;
$$;

-- ============================================================
-- GRANT PERMISSIONS
-- ============================================================

GRANT EXECUTE ON FUNCTION get_pharmacy_marketplace_deals TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION get_pharmacy_marketplace_deal_by_id TO authenticated, anon, service_role;

