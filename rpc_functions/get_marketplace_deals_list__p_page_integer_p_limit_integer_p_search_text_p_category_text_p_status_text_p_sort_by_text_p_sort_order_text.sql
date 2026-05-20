-- Function : get_marketplace_deals_list
-- Arguments: p_page integer, p_limit integer, p_search text, p_category text, p_status text, p_sort_by text, p_sort_order text
-- Type     : FUNCTION
-- =============================================================

DROP FUNCTION IF EXISTS public.get_marketplace_deals_list(p_page integer, p_limit integer, p_search text, p_category text, p_status text, p_sort_by text, p_sort_order text) CASCADE;

CREATE OR REPLACE FUNCTION public.get_marketplace_deals_list(p_page integer DEFAULT 1, p_limit integer DEFAULT 12, p_search text DEFAULT NULL::text, p_category text DEFAULT NULL::text, p_status text DEFAULT NULL::text, p_sort_by text DEFAULT 'posted_date'::text, p_sort_order text DEFAULT 'desc'::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
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
  
  -- Expire any manual featured deals that have passed their expiration
  UPDATE marketplace_deals
  SET is_deal_of_the_day = FALSE,
      deal_of_the_day_until = NULL,
      updated_at = NOW()
  WHERE is_deal_of_the_day = TRUE
    AND deal_of_the_day_until IS NOT NULL
    AND deal_of_the_day_until < NOW();
    
  UPDATE marketplace_deals
  SET is_deal_of_the_week = FALSE,
      deal_of_the_week_until = NULL,
      updated_at = NOW()
  WHERE is_deal_of_the_week = TRUE
    AND deal_of_the_week_until IS NOT NULL
    AND deal_of_the_week_until < NOW();
    
  UPDATE marketplace_deals
  SET is_deal_of_the_month = FALSE,
      deal_of_the_month_until = NULL,
      updated_at = NOW()
  WHERE is_deal_of_the_month = TRUE
    AND deal_of_the_month_until IS NOT NULL
    AND deal_of_the_month_until < NOW();
  
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
      'isDealOfTheDay', COALESCE(d.is_deal_of_the_day, false),
      'dealOfTheDayUntil', d.deal_of_the_day_until,
      'isDealOfTheWeek', COALESCE(d.is_deal_of_the_week, false),
      'dealOfTheWeekUntil', d.deal_of_the_week_until,
      'isDealOfTheMonth', COALESCE(d.is_deal_of_the_month, false),
      'dealOfTheMonthUntil', d.deal_of_the_month_until
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
$function$;
