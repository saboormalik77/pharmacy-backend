-- ============================================================
-- Update Admin Marketplace Functions to include Deal of the Day status
-- Run AFTER add_deal_of_the_day.sql
-- ============================================================

-- ============================================================
-- 1. UPDATE get_marketplace_deals_list - Add isDealOfTheDay field
-- ============================================================

DROP FUNCTION IF EXISTS get_marketplace_deals_list(INTEGER, INTEGER, TEXT, TEXT, TEXT, TEXT, TEXT);

CREATE OR REPLACE FUNCTION get_marketplace_deals_list(
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
  v_stats JSONB;
  v_total_deals INTEGER;
  v_active_deals INTEGER;
  v_sold_deals INTEGER;
  v_expired_deals INTEGER;
  v_total_items BIGINT;
  v_categories JSONB;
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
  
  -- ============================================================
  -- STATS: Calculate statistics
  -- ============================================================
  
  -- Total deals
  SELECT COUNT(*)::INTEGER INTO v_total_deals FROM marketplace_deals;
  
  -- Active deals
  SELECT COUNT(*)::INTEGER INTO v_active_deals FROM marketplace_deals WHERE status = 'active';
  
  -- Sold deals
  SELECT COUNT(*)::INTEGER INTO v_sold_deals FROM marketplace_deals WHERE status = 'sold';
  
  -- Expired deals
  SELECT COUNT(*)::INTEGER INTO v_expired_deals FROM marketplace_deals WHERE status = 'expired';
  
  -- Total items (sum of quantities)
  SELECT COALESCE(SUM(quantity), 0)::BIGINT INTO v_total_items FROM marketplace_deals;
  
  -- Get unique categories
  SELECT COALESCE(jsonb_agg(DISTINCT category ORDER BY category), '[]'::jsonb)
  INTO v_categories
  FROM marketplace_deals;
  
  v_stats := jsonb_build_object(
    'totalDeals', v_total_deals,
    'activeDeals', v_active_deals,
    'soldDeals', v_sold_deals,
    'expiredDeals', v_expired_deals,
    'totalItems', v_total_items,
    'categories', v_categories
  );
  
  -- ============================================================
  -- COUNT: Get total matching records
  -- ============================================================
  
  SELECT COUNT(*)::INTEGER
  INTO v_total
  FROM marketplace_deals d
  WHERE 
    -- Search filter
    (p_search IS NULL OR p_search = '' OR
      d.product_name ILIKE '%' || p_search || '%' OR
      d.distributor_name ILIKE '%' || p_search || '%' OR
      d.deal_number ILIKE '%' || p_search || '%' OR
      d.category ILIKE '%' || p_search || '%')
    -- Category filter
    AND (p_category IS NULL OR p_category = '' OR p_category = 'all' OR d.category = p_category)
    -- Status filter
    AND (p_status IS NULL OR p_status = '' OR p_status = 'all' OR d.status = p_status);
  
  -- ============================================================
  -- FETCH: Get deals with dynamic sorting
  -- ============================================================
  
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
      'margin', ROUND((d.deal_price / d.original_price * 100), 0),
      'distributorId', d.distributor_id,
      'distributor', d.distributor_name,
      'expiryDate', d.expiry_date,
      'postedDate', d.posted_date,
      'status', d.status,
      'notes', d.notes,
      'imageUrl', d.image_url,
      'createdBy', d.created_by,
      'createdAt', d.created_at,
      'updatedAt', d.updated_at,
      -- Deal of the Day fields
      'isDealOfTheDay', COALESCE(d.is_deal_of_the_day, false),
      'dealOfTheDayUntil', d.deal_of_the_day_until
    ) AS deal_row
    FROM marketplace_deals d
    WHERE 
      -- Search filter
      (p_search IS NULL OR p_search = '' OR
        d.product_name ILIKE '%' || p_search || '%' OR
        d.distributor_name ILIKE '%' || p_search || '%' OR
        d.deal_number ILIKE '%' || p_search || '%' OR
        d.category ILIKE '%' || p_search || '%')
      -- Category filter
      AND (p_category IS NULL OR p_category = '' OR p_category = 'all' OR d.category = p_category)
      -- Status filter
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
          ELSE d.posted_date::TEXT
        END
      END ASC NULLS LAST
    LIMIT p_limit
    OFFSET v_offset
  ) sub;
  
  -- Return result
  RETURN jsonb_build_object(
    'deals', v_deals,
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
-- 2. UPDATE get_marketplace_deal_by_id - Add isDealOfTheDay field
-- ============================================================

DROP FUNCTION IF EXISTS get_marketplace_deal_by_id(UUID);

CREATE OR REPLACE FUNCTION get_marketplace_deal_by_id(
  p_deal_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_deal JSONB;
BEGIN
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
    'margin', ROUND((d.deal_price / d.original_price * 100), 0),
    'distributorId', d.distributor_id,
    'distributor', d.distributor_name,
    'expiryDate', d.expiry_date,
    'postedDate', d.posted_date,
    'status', d.status,
    'notes', d.notes,
    'imageUrl', d.image_url,
    'createdBy', d.created_by,
    'createdAt', d.created_at,
    'updatedAt', d.updated_at,
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

GRANT EXECUTE ON FUNCTION get_marketplace_deals_list TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION get_marketplace_deal_by_id TO authenticated, anon, service_role;

