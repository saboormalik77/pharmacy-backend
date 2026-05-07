-- ============================================================
-- Drop and Recreate Marketplace Functions
-- This script drops ALL variations of functions before recreating them
-- ============================================================

-- Use a DO block to dynamically drop all functions with these names
DO $$
DECLARE
  r RECORD;
BEGIN
  -- Drop all variations of create_marketplace_deal
  FOR r IN 
    SELECT oid, proname, pg_get_function_identity_arguments(oid) as args
    FROM pg_proc 
    WHERE proname = 'create_marketplace_deal'
  LOOP
    EXECUTE 'DROP FUNCTION IF EXISTS ' || quote_ident(r.proname) || '(' || r.args || ') CASCADE';
  END LOOP;

  -- Drop all variations of update_marketplace_deal
  FOR r IN 
    SELECT oid, proname, pg_get_function_identity_arguments(oid) as args
    FROM pg_proc 
    WHERE proname = 'update_marketplace_deal'
  LOOP
    EXECUTE 'DROP FUNCTION IF EXISTS ' || quote_ident(r.proname) || '(' || r.args || ') CASCADE';
  END LOOP;

  -- Drop all variations of get_marketplace_deals_list
  FOR r IN 
    SELECT oid, proname, pg_get_function_identity_arguments(oid) as args
    FROM pg_proc 
    WHERE proname = 'get_marketplace_deals_list'
  LOOP
    EXECUTE 'DROP FUNCTION IF EXISTS ' || quote_ident(r.proname) || '(' || r.args || ') CASCADE';
  END LOOP;

  -- Drop all variations of get_marketplace_deal_by_id
  FOR r IN 
    SELECT oid, proname, pg_get_function_identity_arguments(oid) as args
    FROM pg_proc 
    WHERE proname = 'get_marketplace_deal_by_id'
  LOOP
    EXECUTE 'DROP FUNCTION IF EXISTS ' || quote_ident(r.proname) || '(' || r.args || ') CASCADE';
  END LOOP;

  -- Drop all variations of delete_marketplace_deal
  FOR r IN 
    SELECT oid, proname, pg_get_function_identity_arguments(oid) as args
    FROM pg_proc 
    WHERE proname = 'delete_marketplace_deal'
  LOOP
    EXECUTE 'DROP FUNCTION IF EXISTS ' || quote_ident(r.proname) || '(' || r.args || ') CASCADE';
  END LOOP;

  -- Drop all variations of get_marketplace_categories
  FOR r IN 
    SELECT oid, proname, pg_get_function_identity_arguments(oid) as args
    FROM pg_proc 
    WHERE proname = 'get_marketplace_categories'
  LOOP
    EXECUTE 'DROP FUNCTION IF EXISTS ' || quote_ident(r.proname) || '(' || r.args || ') CASCADE';
  END LOOP;

  -- Drop all variations of get_marketplace_stats
  FOR r IN 
    SELECT oid, proname, pg_get_function_identity_arguments(oid) as args
    FROM pg_proc 
    WHERE proname = 'get_marketplace_stats'
  LOOP
    EXECUTE 'DROP FUNCTION IF EXISTS ' || quote_ident(r.proname) || '(' || r.args || ') CASCADE';
  END LOOP;

  -- Drop all variations of mark_marketplace_deal_sold
  FOR r IN 
    SELECT oid, proname, pg_get_function_identity_arguments(oid) as args
    FROM pg_proc 
    WHERE proname = 'mark_marketplace_deal_sold'
  LOOP
    EXECUTE 'DROP FUNCTION IF EXISTS ' || quote_ident(r.proname) || '(' || r.args || ') CASCADE';
  END LOOP;
END $$;

-- ============================================================
-- Now create all functions with the updated code
-- ============================================================

-- ============================================================
-- 1. GET MARKETPLACE DEALS LIST WITH STATS
-- ============================================================

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
  v_offset := (p_page - 1) * p_limit;
  
  UPDATE marketplace_deals
  SET status = 'expired', updated_at = NOW()
  WHERE status = 'active' AND expiry_date < CURRENT_DATE;
  
  SELECT COUNT(*)::INTEGER INTO v_total_deals FROM marketplace_deals;
  SELECT COUNT(*)::INTEGER INTO v_active_deals FROM marketplace_deals WHERE status = 'active';
  SELECT COUNT(*)::INTEGER INTO v_sold_deals FROM marketplace_deals WHERE status = 'sold';
  SELECT COUNT(*)::INTEGER INTO v_expired_deals FROM marketplace_deals WHERE status = 'expired';
  SELECT COALESCE(SUM(quantity), 0)::BIGINT INTO v_total_items FROM marketplace_deals;
  SELECT COALESCE(jsonb_agg(DISTINCT category ORDER BY category), '[]'::jsonb) INTO v_categories FROM marketplace_deals;
  
  v_stats := jsonb_build_object(
    'totalDeals', v_total_deals,
    'activeDeals', v_active_deals,
    'soldDeals', v_sold_deals,
    'expiredDeals', v_expired_deals,
    'totalItems', v_total_items,
    'categories', v_categories
  );
  
  SELECT COUNT(*)::INTEGER INTO v_total
  FROM marketplace_deals d
  WHERE 
    (p_search IS NULL OR p_search = '' OR
      d.product_name ILIKE '%' || p_search || '%' OR
      d.distributor_name ILIKE '%' || p_search || '%' OR
      d.deal_number ILIKE '%' || p_search || '%' OR
      d.category ILIKE '%' || p_search || '%')
    AND (p_category IS NULL OR p_category = '' OR p_category = 'all' OR d.category = p_category)
    AND (p_status IS NULL OR p_status = '' OR p_status = 'all' OR d.status = p_status);
  
  SELECT COALESCE(jsonb_agg(deal_row), '[]'::jsonb) INTO v_deals
  FROM (
    SELECT jsonb_build_object(
      'id', d.id,
      'dealNumber', d.deal_number,
      'productName', d.product_name,
      'category', d.category,
      'ndc', d.ndc,
      'quantity', d.quantity,
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
      'updatedAt', d.updated_at
    ) AS deal_row
    FROM marketplace_deals d
    WHERE 
      (p_search IS NULL OR p_search = '' OR
        d.product_name ILIKE '%' || p_search || '%' OR
        d.distributor_name ILIKE '%' || p_search || '%' OR
        d.deal_number ILIKE '%' || p_search || '%' OR
        d.category ILIKE '%' || p_search || '%')
      AND (p_category IS NULL OR p_category = '' OR p_category = 'all' OR d.category = p_category)
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
-- 2. GET MARKETPLACE DEAL BY ID
-- ============================================================

CREATE OR REPLACE FUNCTION get_marketplace_deal_by_id(p_deal_id UUID)
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
    'updatedAt', d.updated_at
  ) INTO v_deal
  FROM marketplace_deals d
  WHERE d.id = p_deal_id;
  
  IF v_deal IS NULL THEN
    RETURN jsonb_build_object('error', true, 'message', 'Deal not found');
  END IF;
  
  RETURN jsonb_build_object('error', false, 'deal', v_deal);
END;
$$;

-- ============================================================
-- 3. CREATE MARKETPLACE DEAL
-- ============================================================

CREATE OR REPLACE FUNCTION create_marketplace_deal(
  p_product_name TEXT,
  p_category TEXT,
  p_quantity INTEGER,
  p_unit TEXT,
  p_original_price NUMERIC,
  p_deal_price NUMERIC,
  p_distributor_name TEXT,
  p_expiry_date DATE,
  p_ndc TEXT DEFAULT NULL,
  p_distributor_id UUID DEFAULT NULL,
  p_notes TEXT DEFAULT NULL,
  p_image_url TEXT DEFAULT NULL,
  p_created_by UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_deal_id UUID;
  v_deal JSONB;
BEGIN
  IF p_product_name IS NULL OR p_product_name = '' THEN
    RETURN jsonb_build_object('error', true, 'message', 'Product name is required');
  END IF;
  IF p_category IS NULL OR p_category = '' THEN
    RETURN jsonb_build_object('error', true, 'message', 'Category is required');
  END IF;
  IF p_quantity IS NULL OR p_quantity <= 0 THEN
    RETURN jsonb_build_object('error', true, 'message', 'Quantity must be greater than 0');
  END IF;
  IF p_unit NOT IN ('bottles', 'boxes', 'units', 'packs') THEN
    RETURN jsonb_build_object('error', true, 'message', 'Invalid unit. Must be: bottles, boxes, units, packs');
  END IF;
  IF p_original_price IS NULL OR p_original_price <= 0 THEN
    RETURN jsonb_build_object('error', true, 'message', 'Original price must be greater than 0');
  END IF;
  IF p_deal_price IS NULL OR p_deal_price <= 0 THEN
    RETURN jsonb_build_object('error', true, 'message', 'Deal price must be greater than 0');
  END IF;
  IF p_deal_price >= p_original_price THEN
    RETURN jsonb_build_object('error', true, 'message', 'Deal price must be less than original price');
  END IF;
  IF p_distributor_name IS NULL OR p_distributor_name = '' THEN
    RETURN jsonb_build_object('error', true, 'message', 'Distributor name is required');
  END IF;
  IF p_expiry_date IS NULL THEN
    RETURN jsonb_build_object('error', true, 'message', 'Expiry date is required');
  END IF;
  IF p_expiry_date <= CURRENT_DATE THEN
    RETURN jsonb_build_object('error', true, 'message', 'Expiry date must be in the future');
  END IF;
  
  INSERT INTO marketplace_deals (
    product_name, category, ndc, quantity, unit, original_price, deal_price,
    distributor_id, distributor_name, expiry_date, posted_date, status,
    notes, image_url, created_by, created_at, updated_at
  ) VALUES (
    p_product_name, p_category, p_ndc, p_quantity, p_unit, p_original_price,
    p_deal_price, p_distributor_id, p_distributor_name, p_expiry_date,
    CURRENT_DATE, 'active', p_notes, p_image_url, p_created_by, NOW(), NOW()
  ) RETURNING id INTO v_deal_id;
  
  SELECT jsonb_build_object(
    'id', d.id, 'dealNumber', d.deal_number, 'productName', d.product_name,
    'category', d.category, 'ndc', d.ndc, 'quantity', d.quantity, 'unit', d.unit,
    'originalPrice', d.original_price, 'dealPrice', d.deal_price,
    'savings', ROUND(((d.original_price - d.deal_price) / d.original_price * 100), 0),
    'margin', ROUND((d.deal_price / d.original_price * 100), 0),
    'distributorId', d.distributor_id, 'distributor', d.distributor_name,
    'expiryDate', d.expiry_date, 'postedDate', d.posted_date, 'status', d.status,
    'notes', d.notes, 'imageUrl', d.image_url, 'createdAt', d.created_at
  ) INTO v_deal
  FROM marketplace_deals d WHERE d.id = v_deal_id;
  
  RETURN jsonb_build_object('error', false, 'message', 'Deal created successfully', 'deal', v_deal);
END;
$$;

-- ============================================================
-- 4. UPDATE MARKETPLACE DEAL
-- ============================================================

CREATE OR REPLACE FUNCTION update_marketplace_deal(
  p_deal_id UUID,
  p_product_name TEXT DEFAULT NULL,
  p_category TEXT DEFAULT NULL,
  p_quantity INTEGER DEFAULT NULL,
  p_unit TEXT DEFAULT NULL,
  p_original_price NUMERIC DEFAULT NULL,
  p_deal_price NUMERIC DEFAULT NULL,
  p_distributor_name TEXT DEFAULT NULL,
  p_expiry_date DATE DEFAULT NULL,
  p_ndc TEXT DEFAULT NULL,
  p_status TEXT DEFAULT NULL,
  p_notes TEXT DEFAULT NULL,
  p_image_url TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_deal JSONB;
  v_current_status TEXT;
BEGIN
  SELECT status INTO v_current_status FROM marketplace_deals WHERE id = p_deal_id;
  IF v_current_status IS NULL THEN
    RETURN jsonb_build_object('error', true, 'message', 'Deal not found');
  END IF;
  IF p_unit IS NOT NULL AND p_unit NOT IN ('bottles', 'boxes', 'units', 'packs') THEN
    RETURN jsonb_build_object('error', true, 'message', 'Invalid unit. Must be: bottles, boxes, units, packs');
  END IF;
  IF p_status IS NOT NULL AND p_status NOT IN ('active', 'sold', 'expired') THEN
    RETURN jsonb_build_object('error', true, 'message', 'Invalid status. Must be: active, sold, expired');
  END IF;
  IF p_quantity IS NOT NULL AND p_quantity <= 0 THEN
    RETURN jsonb_build_object('error', true, 'message', 'Quantity must be greater than 0');
  END IF;
  IF p_original_price IS NOT NULL AND p_original_price <= 0 THEN
    RETURN jsonb_build_object('error', true, 'message', 'Original price must be greater than 0');
  END IF;
  IF p_deal_price IS NOT NULL AND p_deal_price <= 0 THEN
    RETURN jsonb_build_object('error', true, 'message', 'Deal price must be greater than 0');
  END IF;
  
  UPDATE marketplace_deals SET
    product_name = COALESCE(p_product_name, product_name),
    category = COALESCE(p_category, category),
    ndc = COALESCE(p_ndc, ndc),
    quantity = COALESCE(p_quantity, quantity),
    unit = COALESCE(p_unit, unit),
    original_price = COALESCE(p_original_price, original_price),
    deal_price = COALESCE(p_deal_price, deal_price),
    distributor_name = COALESCE(p_distributor_name, distributor_name),
    expiry_date = COALESCE(p_expiry_date, expiry_date),
    status = COALESCE(p_status, status),
    notes = COALESCE(p_notes, notes),
    image_url = COALESCE(p_image_url, image_url),
    updated_at = NOW()
  WHERE id = p_deal_id;
  
  SELECT jsonb_build_object(
    'id', d.id, 'dealNumber', d.deal_number, 'productName', d.product_name,
    'category', d.category, 'ndc', d.ndc, 'quantity', d.quantity, 'unit', d.unit,
    'originalPrice', d.original_price, 'dealPrice', d.deal_price,
    'savings', ROUND(((d.original_price - d.deal_price) / d.original_price * 100), 0),
    'margin', ROUND((d.deal_price / d.original_price * 100), 0),
    'distributorId', d.distributor_id, 'distributor', d.distributor_name,
    'expiryDate', d.expiry_date, 'postedDate', d.posted_date, 'status', d.status,
    'notes', d.notes, 'imageUrl', d.image_url,
    'createdAt', d.created_at, 'updatedAt', d.updated_at
  ) INTO v_deal FROM marketplace_deals d WHERE d.id = p_deal_id;
  
  RETURN jsonb_build_object('error', false, 'message', 'Deal updated successfully', 'deal', v_deal);
END;
$$;

-- ============================================================
-- 5. DELETE MARKETPLACE DEAL
-- ============================================================

CREATE OR REPLACE FUNCTION delete_marketplace_deal(p_deal_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_deal_number TEXT;
BEGIN
  SELECT deal_number INTO v_deal_number FROM marketplace_deals WHERE id = p_deal_id;
  IF v_deal_number IS NULL THEN
    RETURN jsonb_build_object('error', true, 'message', 'Deal not found');
  END IF;
  DELETE FROM marketplace_deals WHERE id = p_deal_id;
  RETURN jsonb_build_object('error', false, 'message', 'Deal deleted successfully', 'dealNumber', v_deal_number);
END;
$$;

-- ============================================================
-- 6. GET MARKETPLACE CATEGORIES
-- ============================================================

CREATE OR REPLACE FUNCTION get_marketplace_categories()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_categories JSONB;
BEGIN
  SELECT COALESCE(
    jsonb_agg(jsonb_build_object('value', category, 'label', category, 'count', count) ORDER BY count DESC, category),
    '[]'::jsonb
  ) INTO v_categories
  FROM (SELECT category, COUNT(*)::INTEGER as count FROM marketplace_deals GROUP BY category) sub;
  RETURN jsonb_build_object('categories', v_categories);
END;
$$;

-- ============================================================
-- 7. GET MARKETPLACE STATS
-- ============================================================

CREATE OR REPLACE FUNCTION get_marketplace_stats()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_stats JSONB;
BEGIN
  UPDATE marketplace_deals SET status = 'expired', updated_at = NOW()
  WHERE status = 'active' AND expiry_date < CURRENT_DATE;
  SELECT jsonb_build_object(
    'totalDeals', COUNT(*)::INTEGER,
    'activeDeals', COUNT(*) FILTER (WHERE status = 'active')::INTEGER,
    'soldDeals', COUNT(*) FILTER (WHERE status = 'sold')::INTEGER,
    'expiredDeals', COUNT(*) FILTER (WHERE status = 'expired')::INTEGER,
    'totalItems', COALESCE(SUM(quantity), 0)::BIGINT,
    'totalValue', COALESCE(SUM(deal_price * quantity), 0)::NUMERIC(12,2),
    'avgSavings', COALESCE(AVG(ROUND(((original_price - deal_price) / original_price * 100), 0)), 0)::NUMERIC(5,2)
  ) INTO v_stats FROM marketplace_deals;
  RETURN v_stats;
END;
$$;

-- ============================================================
-- 8. MARK DEAL AS SOLD
-- ============================================================

CREATE OR REPLACE FUNCTION mark_marketplace_deal_sold(p_deal_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_current_status TEXT;
BEGIN
  SELECT status INTO v_current_status FROM marketplace_deals WHERE id = p_deal_id;
  IF v_current_status IS NULL THEN
    RETURN jsonb_build_object('error', true, 'message', 'Deal not found');
  END IF;
  IF v_current_status = 'sold' THEN
    RETURN jsonb_build_object('error', true, 'message', 'Deal is already marked as sold');
  END IF;
  IF v_current_status = 'expired' THEN
    RETURN jsonb_build_object('error', true, 'message', 'Cannot sell an expired deal');
  END IF;
  UPDATE marketplace_deals SET status = 'sold', updated_at = NOW() WHERE id = p_deal_id;
  RETURN jsonb_build_object('error', false, 'message', 'Deal marked as sold successfully');
END;
$$;

-- ============================================================
-- GRANT PERMISSIONS
-- ============================================================

GRANT EXECUTE ON FUNCTION get_marketplace_deals_list TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION get_marketplace_deal_by_id TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION create_marketplace_deal TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION update_marketplace_deal TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION delete_marketplace_deal TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION get_marketplace_categories TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION get_marketplace_stats TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION mark_marketplace_deal_sold TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION update_expired_marketplace_deals TO authenticated, anon, service_role;
