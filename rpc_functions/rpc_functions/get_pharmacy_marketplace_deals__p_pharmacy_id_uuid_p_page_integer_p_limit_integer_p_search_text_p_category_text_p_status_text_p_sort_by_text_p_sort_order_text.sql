-- Function : get_pharmacy_marketplace_deals
-- Arguments: p_pharmacy_id uuid, p_page integer, p_limit integer, p_search text, p_category text, p_status text, p_sort_by text, p_sort_order text
-- Type     : FUNCTION
-- =============================================================

DROP FUNCTION IF EXISTS public.get_pharmacy_marketplace_deals(p_pharmacy_id uuid, p_page integer, p_limit integer, p_search text, p_category text, p_status text, p_sort_by text, p_sort_order text) CASCADE;

CREATE OR REPLACE FUNCTION public.get_pharmacy_marketplace_deals(p_pharmacy_id uuid, p_page integer DEFAULT 1, p_limit integer DEFAULT 12, p_search text DEFAULT NULL::text, p_category text DEFAULT NULL::text, p_status text DEFAULT NULL::text, p_sort_by text DEFAULT 'posted_date'::text, p_sort_order text DEFAULT 'desc'::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
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
  
  -- Count total matching deals (excluding Deal of the Day - manual or automatic)
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
    AND (p_status IS NULL OR p_status = '' OR p_status = 'all' OR d.status = p_status)
    -- Exclude all featured deals (day, week, month)
    AND COALESCE(d.is_deal_of_the_day, false) = false
    AND COALESCE(d.is_deal_of_the_week, false) = false
    AND COALESCE(d.is_deal_of_the_month, false) = false;
  
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
      'isDealOfTheDay', COALESCE(d.is_deal_of_the_day, false),
      'dealOfTheDayUntil', d.deal_of_the_day_until,
      'isDealOfTheWeek', COALESCE(d.is_deal_of_the_week, false),
      'dealOfTheWeekUntil', d.deal_of_the_week_until,
      'isDealOfTheMonth', COALESCE(d.is_deal_of_the_month, false),
      'dealOfTheMonthUntil', d.deal_of_the_month_until
    ) AS deal_row
    FROM marketplace_deals d
    WHERE 
      (p_search IS NULL OR p_search = '' OR
        d.product_name ILIKE '%' || p_search || '%' OR
        d.distributor_name ILIKE '%' || p_search || '%' OR
        d.deal_number ILIKE '%' || p_search || '%' OR
        d.ndc ILIKE '%' || p_search || '%' OR
        d.category ILIKE '%' || p_search || '%')
      AND (p_category IS NULL OR p_category = '' OR p_category = 'all' OR d.category = p_category)
      AND (p_status IS NULL OR p_status = '' OR p_status = 'all' OR d.status = p_status)
      -- Exclude all featured deals (day, week, month)
      AND COALESCE(d.is_deal_of_the_day, false) = false
      AND COALESCE(d.is_deal_of_the_week, false) = false
      AND COALESCE(d.is_deal_of_the_month, false) = false
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
  ) sub;
  
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
