-- ============================================================
-- Pharmacy Marketplace RPC Functions
-- Handles marketplace browsing and cart operations for pharmacies
-- ============================================================
-- NOTE: All business logic is in PostgreSQL functions
-- No custom JS logic needed in the backend service
-- ============================================================

-- ============================================================
-- 1. GET MARKETPLACE DEALS FOR PHARMACIES
-- Returns list of deals with pagination, search, filters
-- Shows all deals (active, sold, expired) with optional status filter
-- ============================================================

-- Drop old signature (without p_status parameter)
DROP FUNCTION IF EXISTS get_pharmacy_marketplace_deals(UUID, INTEGER, INTEGER, TEXT, TEXT, TEXT, TEXT);
-- Drop current signature (with p_status parameter)
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
$$;

-- ============================================================
-- 2. GET SINGLE DEAL DETAILS FOR PHARMACY
-- Returns detailed deal information (any status)
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
$$;

-- ============================================================
-- 3. GET MARKETPLACE CATEGORIES FOR PHARMACY
-- Returns categories with counts (from all deals)
-- ============================================================

DROP FUNCTION IF EXISTS get_pharmacy_marketplace_categories(UUID);

CREATE OR REPLACE FUNCTION get_pharmacy_marketplace_categories(
  p_pharmacy_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_categories JSONB;
BEGIN
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'value', category,
        'label', category,
        'count', count
      )
      ORDER BY count DESC, category
    ),
    '[]'::jsonb
  )
  INTO v_categories
  FROM (
    SELECT category, COUNT(*)::INTEGER as count
    FROM marketplace_deals
    GROUP BY category
  ) sub;
  
  RETURN jsonb_build_object(
    'categories', v_categories
  );
END;
$$;

-- ============================================================
-- 4. ADD ITEM TO PHARMACY CART
-- Creates cart if doesn't exist, adds or updates item
-- NOTE: Only active deals can be added to cart
-- ============================================================

DROP FUNCTION IF EXISTS add_to_pharmacy_cart(UUID, UUID, INTEGER);

CREATE OR REPLACE FUNCTION add_to_pharmacy_cart(
  p_pharmacy_id UUID,
  p_deal_id UUID,
  p_quantity INTEGER DEFAULT 1
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_cart_id UUID;
  v_deal RECORD;
  v_existing_quantity INTEGER;
  v_new_quantity INTEGER;
  v_cart_item JSONB;
  v_effective_minimum INTEGER;
BEGIN
  -- Validate quantity
  IF p_quantity < 1 THEN
    RETURN jsonb_build_object(
      'error', true,
      'message', 'Quantity must be at least 1'
    );
  END IF;
  
  -- Get deal details and check if active (including minimum_buy_quantity)
  SELECT id, product_name, deal_price, original_price, quantity, status, image_url, ndc, distributor_name, COALESCE(minimum_buy_quantity, 1) as minimum_buy_quantity
  INTO v_deal
  FROM marketplace_deals
  WHERE id = p_deal_id;
  
  IF v_deal.id IS NULL THEN
    RETURN jsonb_build_object(
      'error', true,
      'message', 'Deal not found'
    );
  END IF;
  
  -- Only active deals can be added to cart
  IF v_deal.status != 'active' THEN
    RETURN jsonb_build_object(
      'error', true,
      'message', 'This deal is no longer available (status: ' || v_deal.status || ')'
    );
  END IF;
  
  -- Check if requested quantity is available
  IF p_quantity > v_deal.quantity THEN
    RETURN jsonb_build_object(
      'error', true,
      'message', 'Requested quantity exceeds available stock (' || v_deal.quantity || ' available)'
    );
  END IF;
  
  -- Calculate effective minimum: if available quantity is less than minimum_buy_quantity,
  -- then the remaining stock becomes the effective minimum (allow ordering all remaining stock)
  v_effective_minimum := LEAST(v_deal.minimum_buy_quantity, v_deal.quantity);
  
  -- Check minimum buy quantity (but allow if ordering all remaining stock)
  IF p_quantity < v_effective_minimum THEN
    RETURN jsonb_build_object(
      'error', true,
      'message', 'Minimum order quantity is ' || v_effective_minimum || ' units'
    );
  END IF;
  
  -- Get or create cart for pharmacy
  SELECT id INTO v_cart_id
  FROM pharmacy_cart
  WHERE pharmacy_id = p_pharmacy_id;
  
  IF v_cart_id IS NULL THEN
    INSERT INTO pharmacy_cart (pharmacy_id)
    VALUES (p_pharmacy_id)
    RETURNING id INTO v_cart_id;
  END IF;
  
  -- Check if item already in cart
  SELECT quantity INTO v_existing_quantity
  FROM pharmacy_cart_items
  WHERE cart_id = v_cart_id AND deal_id = p_deal_id;
  
  IF v_existing_quantity IS NOT NULL THEN
    -- Update existing item (add to quantity)
    v_new_quantity := v_existing_quantity + p_quantity;
    
    -- Verify new quantity doesn't exceed stock
    IF v_new_quantity > v_deal.quantity THEN
      RETURN jsonb_build_object(
        'error', true,
        'message', 'Total quantity would exceed available stock. You have ' || v_existing_quantity || ' in cart, ' || v_deal.quantity || ' available.'
      );
    END IF;
    
    UPDATE pharmacy_cart_items
    SET quantity = v_new_quantity, updated_at = NOW()
    WHERE cart_id = v_cart_id AND deal_id = p_deal_id;
  ELSE
    -- Insert new item
    v_new_quantity := p_quantity;
    
    INSERT INTO pharmacy_cart_items (cart_id, deal_id, quantity, unit_price, original_price)
    VALUES (v_cart_id, p_deal_id, p_quantity, v_deal.deal_price, v_deal.original_price);
  END IF;
  
  -- Update cart timestamp
  UPDATE pharmacy_cart SET updated_at = NOW() WHERE id = v_cart_id;
  
  -- Build response with item details
  v_cart_item := jsonb_build_object(
    'dealId', p_deal_id,
    'productName', v_deal.product_name,
    'ndc', v_deal.ndc,
    'distributor', v_deal.distributor_name,
    'quantity', v_new_quantity,
    'unitPrice', v_deal.deal_price,
    'originalPrice', v_deal.original_price,
    'totalPrice', v_new_quantity * v_deal.deal_price,
    'savings', (v_deal.original_price - v_deal.deal_price) * v_new_quantity,
    'imageUrl', v_deal.image_url
  );
  
  RETURN jsonb_build_object(
    'error', false,
    'message', 'Item added to cart',
    'item', v_cart_item
  );
END;
$$;

-- ============================================================
-- 5. GET PHARMACY CART
-- Returns complete cart with all items and totals
-- ============================================================

DROP FUNCTION IF EXISTS get_pharmacy_cart(UUID);

CREATE OR REPLACE FUNCTION get_pharmacy_cart(
  p_pharmacy_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_cart_id UUID;
  v_items JSONB;
  v_subtotal NUMERIC(12, 2);
  v_total_savings NUMERIC(12, 2);
  v_item_count INTEGER;
BEGIN
  -- Get cart ID
  SELECT id INTO v_cart_id
  FROM pharmacy_cart
  WHERE pharmacy_id = p_pharmacy_id;
  
  -- If no cart exists, return empty cart
  IF v_cart_id IS NULL THEN
    RETURN jsonb_build_object(
      'items', '[]'::jsonb,
      'summary', jsonb_build_object(
        'itemCount', 0,
        'subtotal', 0,
        'totalSavings', 0,
        'estimatedTax', 0,
        'total', 0
      )
    );
  END IF;
  
  -- Get all cart items with deal details
  SELECT 
    COALESCE(jsonb_agg(
      jsonb_build_object(
        'id', ci.id,
        'dealId', ci.deal_id,
        'productName', d.product_name,
        'ndc', d.ndc,
        'category', d.category,
        'distributor', d.distributor_name,
        'quantity', ci.quantity,
        'unitPrice', ci.unit_price,
        'originalPrice', ci.original_price,
        'totalPrice', ci.quantity * ci.unit_price,
        'savings', (ci.original_price - ci.unit_price) * ci.quantity,
        'savingsPercent', ROUND(((ci.original_price - ci.unit_price) / ci.original_price * 100), 0),
        'imageUrl', d.image_url,
        'availableQuantity', d.quantity,
        'dealStatus', d.status,
        'expiryDate', d.expiry_date,
        'addedAt', ci.added_at
      )
      ORDER BY ci.added_at DESC
    ), '[]'::jsonb),
    COALESCE(SUM(ci.quantity * ci.unit_price), 0),
    COALESCE(SUM((ci.original_price - ci.unit_price) * ci.quantity), 0),
    COALESCE(COUNT(*)::INTEGER, 0)
  INTO v_items, v_subtotal, v_total_savings, v_item_count
  FROM pharmacy_cart_items ci
  JOIN marketplace_deals d ON d.id = ci.deal_id
  WHERE ci.cart_id = v_cart_id;
  
  RETURN jsonb_build_object(
    'items', v_items,
    'summary', jsonb_build_object(
      'itemCount', v_item_count,
      'subtotal', v_subtotal,
      'totalSavings', v_total_savings,
      'estimatedTax', ROUND(v_subtotal * 0.08, 2), -- 8% tax
      'total', ROUND(v_subtotal * 1.08, 2) -- Subtotal + 8% tax
    )
  );
END;
$$;

-- ============================================================
-- 6. UPDATE CART ITEM QUANTITY
-- Updates quantity of an item in cart
-- NOTE: Only allows updating if deal is still active
-- ============================================================

DROP FUNCTION IF EXISTS update_pharmacy_cart_item(UUID, UUID, INTEGER);

CREATE OR REPLACE FUNCTION update_pharmacy_cart_item(
  p_pharmacy_id UUID,
  p_item_id UUID,
  p_quantity INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_cart_id UUID;
  v_deal_id UUID;
  v_available_quantity INTEGER;
  v_deal_status TEXT;
BEGIN
  -- Validate quantity
  IF p_quantity < 1 THEN
    RETURN jsonb_build_object(
      'error', true,
      'message', 'Quantity must be at least 1. Use remove endpoint to delete item.'
    );
  END IF;
  
  -- Get cart ID
  SELECT id INTO v_cart_id
  FROM pharmacy_cart
  WHERE pharmacy_id = p_pharmacy_id;
  
  IF v_cart_id IS NULL THEN
    RETURN jsonb_build_object(
      'error', true,
      'message', 'Cart not found'
    );
  END IF;
  
  -- Get item's deal info
  SELECT ci.deal_id, d.quantity, d.status
  INTO v_deal_id, v_available_quantity, v_deal_status
  FROM pharmacy_cart_items ci
  JOIN marketplace_deals d ON d.id = ci.deal_id
  WHERE ci.id = p_item_id AND ci.cart_id = v_cart_id;
  
  IF v_deal_id IS NULL THEN
    RETURN jsonb_build_object(
      'error', true,
      'message', 'Cart item not found'
    );
  END IF;
  
  -- Check deal is still active for quantity updates
  IF v_deal_status != 'active' THEN
    RETURN jsonb_build_object(
      'error', true,
      'message', 'This deal is no longer available (status: ' || v_deal_status || ')'
    );
  END IF;
  
  -- Check quantity doesn't exceed stock
  IF p_quantity > v_available_quantity THEN
    RETURN jsonb_build_object(
      'error', true,
      'message', 'Quantity exceeds available stock (' || v_available_quantity || ' available)'
    );
  END IF;
  
  -- Update quantity
  UPDATE pharmacy_cart_items
  SET quantity = p_quantity, updated_at = NOW()
  WHERE id = p_item_id AND cart_id = v_cart_id;
  
  -- Update cart timestamp
  UPDATE pharmacy_cart SET updated_at = NOW() WHERE id = v_cart_id;
  
  RETURN jsonb_build_object(
    'error', false,
    'message', 'Cart updated successfully',
    'newQuantity', p_quantity
  );
END;
$$;

-- ============================================================
-- 7. REMOVE ITEM FROM CART
-- Removes a single item from cart
-- ============================================================

DROP FUNCTION IF EXISTS remove_from_pharmacy_cart(UUID, UUID);

CREATE OR REPLACE FUNCTION remove_from_pharmacy_cart(
  p_pharmacy_id UUID,
  p_item_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_cart_id UUID;
  v_deleted_count INTEGER;
BEGIN
  -- Get cart ID
  SELECT id INTO v_cart_id
  FROM pharmacy_cart
  WHERE pharmacy_id = p_pharmacy_id;
  
  IF v_cart_id IS NULL THEN
    RETURN jsonb_build_object(
      'error', true,
      'message', 'Cart not found'
    );
  END IF;
  
  -- Delete item
  DELETE FROM pharmacy_cart_items
  WHERE id = p_item_id AND cart_id = v_cart_id;
  
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  
  IF v_deleted_count = 0 THEN
    RETURN jsonb_build_object(
      'error', true,
      'message', 'Item not found in cart'
    );
  END IF;
  
  -- Update cart timestamp
  UPDATE pharmacy_cart SET updated_at = NOW() WHERE id = v_cart_id;
  
  RETURN jsonb_build_object(
    'error', false,
    'message', 'Item removed from cart'
  );
END;
$$;

-- ============================================================
-- 8. CLEAR PHARMACY CART
-- Removes all items from cart
-- ============================================================

DROP FUNCTION IF EXISTS clear_pharmacy_cart(UUID);

CREATE OR REPLACE FUNCTION clear_pharmacy_cart(
  p_pharmacy_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_cart_id UUID;
  v_deleted_count INTEGER;
BEGIN
  -- Get cart ID
  SELECT id INTO v_cart_id
  FROM pharmacy_cart
  WHERE pharmacy_id = p_pharmacy_id;
  
  IF v_cart_id IS NULL THEN
    RETURN jsonb_build_object(
      'error', false,
      'message', 'Cart is already empty',
      'itemsRemoved', 0
    );
  END IF;
  
  -- Delete all items
  DELETE FROM pharmacy_cart_items
  WHERE cart_id = v_cart_id;
  
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  
  -- Update cart timestamp
  UPDATE pharmacy_cart SET updated_at = NOW() WHERE id = v_cart_id;
  
  RETURN jsonb_build_object(
    'error', false,
    'message', 'Cart cleared successfully',
    'itemsRemoved', v_deleted_count
  );
END;
$$;

-- ============================================================
-- 9. GET CART ITEM COUNT
-- Returns just the count of items in cart (for header badge)
-- ============================================================

DROP FUNCTION IF EXISTS get_pharmacy_cart_count(UUID);

CREATE OR REPLACE FUNCTION get_pharmacy_cart_count(
  p_pharmacy_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COALESCE(COUNT(*), 0)::INTEGER
  INTO v_count
  FROM pharmacy_cart c
  JOIN pharmacy_cart_items ci ON ci.cart_id = c.id
  WHERE c.pharmacy_id = p_pharmacy_id;
  
  RETURN jsonb_build_object(
    'count', v_count
  );
END;
$$;

-- ============================================================
-- 10. VALIDATE CART BEFORE CHECKOUT
-- Checks all items are still available and returns summary
-- ============================================================

DROP FUNCTION IF EXISTS validate_pharmacy_cart(UUID);

CREATE OR REPLACE FUNCTION validate_pharmacy_cart(
  p_pharmacy_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_cart_id UUID;
  v_issues JSONB := '[]'::jsonb;
  v_valid_items JSONB;
  v_subtotal NUMERIC(12, 2);
  v_total_savings NUMERIC(12, 2);
  v_item_count INTEGER;
  v_issue_record RECORD;
BEGIN
  -- Get cart ID
  SELECT id INTO v_cart_id
  FROM pharmacy_cart
  WHERE pharmacy_id = p_pharmacy_id;
  
  IF v_cart_id IS NULL THEN
    RETURN jsonb_build_object(
      'valid', false,
      'message', 'Cart is empty',
      'issues', '[]'::jsonb,
      'items', '[]'::jsonb
    );
  END IF;
  
  -- Find items with issues (deal not active, quantity exceeds stock, or below minimum)
  -- Note: If available quantity < minimum_buy_quantity, then remaining stock becomes the effective minimum
  FOR v_issue_record IN
    SELECT 
      ci.id as item_id,
      ci.deal_id,
      d.product_name,
      ci.quantity as cart_quantity,
      d.quantity as available_quantity,
      COALESCE(d.minimum_buy_quantity, 1) as minimum_buy_quantity,
      -- Effective minimum: the lesser of minimum_buy_quantity and available_quantity
      LEAST(COALESCE(d.minimum_buy_quantity, 1), d.quantity) as effective_minimum,
      d.status as deal_status,
      CASE 
        WHEN d.status != 'active' THEN 'Deal is no longer available (status: ' || d.status || ')'
        WHEN ci.quantity > d.quantity THEN 'Quantity in cart (' || ci.quantity || ') exceeds available stock (' || d.quantity || ')'
        -- Only flag as below minimum if cart quantity is less than the effective minimum
        WHEN ci.quantity < LEAST(COALESCE(d.minimum_buy_quantity, 1), d.quantity) THEN 
          'Minimum order quantity is ' || LEAST(COALESCE(d.minimum_buy_quantity, 1), d.quantity) || ' units'
        ELSE NULL
      END as issue
    FROM pharmacy_cart_items ci
    JOIN marketplace_deals d ON d.id = ci.deal_id
    WHERE ci.cart_id = v_cart_id
      AND (
        d.status != 'active' 
        OR ci.quantity > d.quantity
        OR ci.quantity < LEAST(COALESCE(d.minimum_buy_quantity, 1), d.quantity)
      )
  LOOP
    v_issues := v_issues || jsonb_build_object(
      'itemId', v_issue_record.item_id,
      'dealId', v_issue_record.deal_id,
      'productName', v_issue_record.product_name,
      'issue', v_issue_record.issue
    );
  END LOOP;
  
  -- Get valid items and totals
  -- Valid items must: be active, not exceed stock, and meet effective minimum (min of minimum_buy_quantity and available stock)
  SELECT 
    COALESCE(jsonb_agg(
      jsonb_build_object(
        'id', ci.id,
        'dealId', ci.deal_id,
        'productName', d.product_name,
        'ndc', d.ndc,
        'category', d.category,
        'distributor', d.distributor_name,
        'quantity', ci.quantity,
        'unitPrice', ci.unit_price,
        'originalPrice', ci.original_price,
        'totalPrice', ci.quantity * ci.unit_price,
        'savings', (ci.original_price - ci.unit_price) * ci.quantity,
        'savingsPercent', ROUND(((ci.original_price - ci.unit_price) / ci.original_price * 100), 0),
        'imageUrl', d.image_url,
        'availableQuantity', d.quantity,
        'minimumBuyQuantity', COALESCE(d.minimum_buy_quantity, 1),
        'effectiveMinimum', LEAST(COALESCE(d.minimum_buy_quantity, 1), d.quantity),
        'unit', d.unit,
        'dealStatus', d.status,
        'expiryDate', d.expiry_date,
        'addedAt', ci.added_at
      )
      ORDER BY ci.added_at DESC
    ), '[]'::jsonb),
    COALESCE(SUM(ci.quantity * ci.unit_price), 0),
    COALESCE(SUM((ci.original_price - ci.unit_price) * ci.quantity), 0),
    COUNT(*)::INTEGER
  INTO v_valid_items, v_subtotal, v_total_savings, v_item_count
  FROM pharmacy_cart_items ci
  JOIN marketplace_deals d ON d.id = ci.deal_id
  WHERE ci.cart_id = v_cart_id
    AND d.status = 'active'
    AND ci.quantity <= d.quantity
    AND ci.quantity >= LEAST(COALESCE(d.minimum_buy_quantity, 1), d.quantity);
  
  RETURN jsonb_build_object(
    'valid', jsonb_array_length(v_issues) = 0,
    'message', CASE 
      WHEN jsonb_array_length(v_issues) = 0 THEN 'Cart is valid and ready for checkout'
      ELSE 'Some items in your cart have issues'
    END,
    'issues', v_issues,
    'items', v_valid_items,
    'summary', jsonb_build_object(
      'itemCount', v_item_count,
      'subtotal', v_subtotal,
      'totalSavings', v_total_savings,
      'estimatedTax', ROUND(v_subtotal * 0.08, 2),
      'total', ROUND(v_subtotal * 1.08, 2)
    )
  );
END;
$$;

-- ============================================================
-- GRANT PERMISSIONS
-- ============================================================

GRANT EXECUTE ON FUNCTION get_pharmacy_marketplace_deals TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION get_pharmacy_marketplace_deal_by_id TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION get_pharmacy_marketplace_categories TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION add_to_pharmacy_cart TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION get_pharmacy_cart TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION update_pharmacy_cart_item TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION remove_from_pharmacy_cart TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION clear_pharmacy_cart TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION get_pharmacy_cart_count TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION validate_pharmacy_cart TO authenticated, anon, service_role;
