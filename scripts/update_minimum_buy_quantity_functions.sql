-- ============================================================
-- Update RPC Functions for Minimum Buy Quantity Feature
-- Run AFTER add_minimum_buy_quantity.sql
-- ============================================================

-- ============================================================
-- 1. UPDATE create_marketplace_deal - Add minimum_buy_quantity parameter
-- ============================================================

DROP FUNCTION IF EXISTS create_marketplace_deal(TEXT, TEXT, INTEGER, TEXT, NUMERIC, NUMERIC, TEXT, DATE, TEXT, UUID, TEXT, TEXT, UUID);
DROP FUNCTION IF EXISTS create_marketplace_deal(TEXT, TEXT, INTEGER, TEXT, NUMERIC, NUMERIC, TEXT, DATE, TEXT, UUID, TEXT, TEXT, UUID, INTEGER);

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
  p_created_by UUID DEFAULT NULL,
  p_minimum_buy_quantity INTEGER DEFAULT 1
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_deal_id UUID;
  v_deal JSONB;
BEGIN
  -- Validate required fields
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
  
  -- Validate minimum buy quantity
  IF p_minimum_buy_quantity IS NULL OR p_minimum_buy_quantity < 1 THEN
    RETURN jsonb_build_object('error', true, 'message', 'Minimum buy quantity must be at least 1');
  END IF;
  
  IF p_minimum_buy_quantity > p_quantity THEN
    RETURN jsonb_build_object('error', true, 'message', 'Minimum buy quantity cannot exceed total quantity');
  END IF;
  
  -- Insert new deal
  INSERT INTO marketplace_deals (
    product_name,
    category,
    ndc,
    quantity,
    original_quantity,
    unit,
    original_price,
    deal_price,
    distributor_id,
    distributor_name,
    expiry_date,
    posted_date,
    status,
    notes,
    image_url,
    created_by,
    minimum_buy_quantity,
    created_at,
    updated_at
  ) VALUES (
    p_product_name,
    p_category,
    p_ndc,
    p_quantity,
    p_quantity,
    p_unit,
    p_original_price,
    p_deal_price,
    p_distributor_id,
    p_distributor_name,
    p_expiry_date,
    CURRENT_DATE,
    'active',
    p_notes,
    p_image_url,
    p_created_by,
    p_minimum_buy_quantity,
    NOW(),
    NOW()
  )
  RETURNING id INTO v_deal_id;
  
  -- Fetch created deal
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
    'minimumBuyQuantity', d.minimum_buy_quantity,
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
    'createdAt', d.created_at
  )
  INTO v_deal
  FROM marketplace_deals d
  WHERE d.id = v_deal_id;
  
  RETURN jsonb_build_object(
    'error', false,
    'message', 'Deal created successfully',
    'deal', v_deal
  );
END;
$$;

-- ============================================================
-- 2. UPDATE update_marketplace_deal - Add minimum_buy_quantity parameter
-- ============================================================

DROP FUNCTION IF EXISTS update_marketplace_deal(UUID, TEXT, TEXT, INTEGER, TEXT, NUMERIC, NUMERIC, TEXT, DATE, TEXT, TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS update_marketplace_deal(UUID, TEXT, TEXT, INTEGER, TEXT, NUMERIC, NUMERIC, TEXT, DATE, TEXT, TEXT, TEXT, TEXT, INTEGER);

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
  p_image_url TEXT DEFAULT NULL,
  p_minimum_buy_quantity INTEGER DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_deal JSONB;
  v_current_status TEXT;
  v_current_quantity INTEGER;
  v_new_min_qty INTEGER;
  v_new_qty INTEGER;
BEGIN
  -- Check if deal exists
  SELECT status, quantity INTO v_current_status, v_current_quantity 
  FROM marketplace_deals WHERE id = p_deal_id;
  
  IF v_current_status IS NULL THEN
    RETURN jsonb_build_object(
      'error', true,
      'message', 'Deal not found'
    );
  END IF;
  
  -- Validate unit if provided
  IF p_unit IS NOT NULL AND p_unit NOT IN ('bottles', 'boxes', 'units', 'packs') THEN
    RETURN jsonb_build_object('error', true, 'message', 'Invalid unit. Must be: bottles, boxes, units, packs');
  END IF;
  
  -- Validate status if provided
  IF p_status IS NOT NULL AND p_status NOT IN ('active', 'sold', 'expired') THEN
    RETURN jsonb_build_object('error', true, 'message', 'Invalid status. Must be: active, sold, expired');
  END IF;
  
  -- Validate quantity if provided
  IF p_quantity IS NOT NULL AND p_quantity <= 0 THEN
    RETURN jsonb_build_object('error', true, 'message', 'Quantity must be greater than 0');
  END IF;
  
  -- Validate prices if provided
  IF p_original_price IS NOT NULL AND p_original_price <= 0 THEN
    RETURN jsonb_build_object('error', true, 'message', 'Original price must be greater than 0');
  END IF;
  
  IF p_deal_price IS NOT NULL AND p_deal_price <= 0 THEN
    RETURN jsonb_build_object('error', true, 'message', 'Deal price must be greater than 0');
  END IF;
  
  -- Validate minimum buy quantity if provided
  IF p_minimum_buy_quantity IS NOT NULL AND p_minimum_buy_quantity < 1 THEN
    RETURN jsonb_build_object('error', true, 'message', 'Minimum buy quantity must be at least 1');
  END IF;
  
  -- Check minimum buy doesn't exceed quantity
  v_new_qty := COALESCE(p_quantity, v_current_quantity);
  v_new_min_qty := COALESCE(p_minimum_buy_quantity, (SELECT minimum_buy_quantity FROM marketplace_deals WHERE id = p_deal_id));
  
  IF v_new_min_qty > v_new_qty THEN
    RETURN jsonb_build_object('error', true, 'message', 'Minimum buy quantity cannot exceed total quantity');
  END IF;
  
  -- Update deal
  UPDATE marketplace_deals
  SET
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
    minimum_buy_quantity = COALESCE(p_minimum_buy_quantity, minimum_buy_quantity),
    updated_at = NOW()
  WHERE id = p_deal_id;
  
  -- Fetch updated deal
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
    'minimumBuyQuantity', d.minimum_buy_quantity,
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
    'createdAt', d.created_at,
    'updatedAt', d.updated_at
  )
  INTO v_deal
  FROM marketplace_deals d
  WHERE d.id = p_deal_id;
  
  RETURN jsonb_build_object(
    'error', false,
    'message', 'Deal updated successfully',
    'deal', v_deal
  );
END;
$$;

-- ============================================================
-- 3. UPDATE add_to_pharmacy_cart - Validate minimum buy quantity
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
BEGIN
  -- Validate inputs
  IF p_pharmacy_id IS NULL THEN
    RETURN jsonb_build_object('error', true, 'message', 'Pharmacy ID is required');
  END IF;
  
  IF p_deal_id IS NULL THEN
    RETURN jsonb_build_object('error', true, 'message', 'Deal ID is required');
  END IF;
  
  IF p_quantity IS NULL OR p_quantity <= 0 THEN
    RETURN jsonb_build_object('error', true, 'message', 'Quantity must be greater than 0');
  END IF;
  
  -- Get deal details including minimum_buy_quantity
  SELECT id, product_name, deal_price, original_price, quantity, status, image_url, ndc, distributor_name, minimum_buy_quantity
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
    
    -- Validate minimum buy quantity
    IF v_new_quantity < v_deal.minimum_buy_quantity THEN
      RETURN jsonb_build_object(
        'error', true,
        'message', 'Minimum order quantity is ' || v_deal.minimum_buy_quantity || ' ' || (SELECT unit FROM marketplace_deals WHERE id = p_deal_id) || '. Current cart quantity: ' || v_new_quantity
      );
    END IF;
    
    UPDATE pharmacy_cart_items
    SET quantity = v_new_quantity, updated_at = NOW()
    WHERE cart_id = v_cart_id AND deal_id = p_deal_id;
  ELSE
    -- Validate minimum buy quantity for new item
    IF p_quantity < v_deal.minimum_buy_quantity THEN
      RETURN jsonb_build_object(
        'error', true,
        'message', 'Minimum order quantity is ' || v_deal.minimum_buy_quantity || ' ' || (SELECT unit FROM marketplace_deals WHERE id = p_deal_id)
      );
    END IF;
    
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
    'imageUrl', v_deal.image_url,
    'minimumBuyQuantity', v_deal.minimum_buy_quantity
  );
  
  RETURN jsonb_build_object(
    'error', false,
    'message', 'Item added to cart',
    'item', v_cart_item
  );
END;
$$;

-- ============================================================
-- 4. UPDATE update_pharmacy_cart_item - Validate minimum buy quantity
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
  v_minimum_buy_quantity INTEGER;
  v_unit TEXT;
BEGIN
  -- Validate quantity
  IF p_quantity <= 0 THEN
    RETURN jsonb_build_object(
      'error', true,
      'message', 'Quantity must be greater than 0. Use remove endpoint to delete items.'
    );
  END IF;
  
  -- Get cart
  SELECT id INTO v_cart_id
  FROM pharmacy_cart
  WHERE pharmacy_id = p_pharmacy_id;
  
  IF v_cart_id IS NULL THEN
    RETURN jsonb_build_object(
      'error', true,
      'message', 'Cart not found'
    );
  END IF;
  
  -- Get cart item and deal info
  SELECT ci.deal_id, d.quantity, d.status, d.minimum_buy_quantity, d.unit
  INTO v_deal_id, v_available_quantity, v_deal_status, v_minimum_buy_quantity, v_unit
  FROM pharmacy_cart_items ci
  JOIN marketplace_deals d ON d.id = ci.deal_id
  WHERE ci.id = p_item_id AND ci.cart_id = v_cart_id;
  
  IF v_deal_id IS NULL THEN
    RETURN jsonb_build_object(
      'error', true,
      'message', 'Cart item not found'
    );
  END IF;
  
  -- Check deal is still active
  IF v_deal_status != 'active' THEN
    RETURN jsonb_build_object(
      'error', true,
      'message', 'This deal is no longer available (status: ' || v_deal_status || '). Please remove from cart.'
    );
  END IF;
  
  -- Check available quantity
  IF p_quantity > v_available_quantity THEN
    RETURN jsonb_build_object(
      'error', true,
      'message', 'Requested quantity exceeds available stock (' || v_available_quantity || ' available)'
    );
  END IF;
  
  -- Validate minimum buy quantity
  IF p_quantity < v_minimum_buy_quantity THEN
    RETURN jsonb_build_object(
      'error', true,
      'message', 'Minimum order quantity is ' || v_minimum_buy_quantity || ' ' || v_unit || '. To order less, please remove this item.'
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
    'message', 'Cart item updated'
  );
END;
$$;

-- ============================================================
-- 5. UPDATE get_pharmacy_cart - Include minimum buy quantity
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
  v_has_validation_errors BOOLEAN;
  v_validation_errors JSONB;
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
      ),
      'hasValidationErrors', false,
      'validationErrors', '[]'::jsonb
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
        'minimumBuyQuantity', d.minimum_buy_quantity,
        'unit', d.unit,
        'dealStatus', d.status,
        'expiryDate', d.expiry_date,
        'addedAt', ci.added_at,
        'isBelowMinimum', ci.quantity < d.minimum_buy_quantity,
        'isExceedsStock', ci.quantity > d.quantity,
        'isUnavailable', d.status != 'active'
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
  
  -- Check for validation errors
  SELECT 
    BOOL_OR(ci.quantity < d.minimum_buy_quantity OR ci.quantity > d.quantity OR d.status != 'active'),
    COALESCE(jsonb_agg(
      CASE 
        WHEN d.status != 'active' THEN 
          jsonb_build_object('dealId', ci.deal_id, 'productName', d.product_name, 'error', 'Deal is no longer available')
        WHEN ci.quantity < d.minimum_buy_quantity THEN 
          jsonb_build_object('dealId', ci.deal_id, 'productName', d.product_name, 'error', 'Quantity below minimum (' || d.minimum_buy_quantity || ' required)')
        WHEN ci.quantity > d.quantity THEN 
          jsonb_build_object('dealId', ci.deal_id, 'productName', d.product_name, 'error', 'Quantity exceeds available stock (' || d.quantity || ' available)')
        ELSE NULL
      END
    ) FILTER (WHERE ci.quantity < d.minimum_buy_quantity OR ci.quantity > d.quantity OR d.status != 'active'), '[]'::jsonb)
  INTO v_has_validation_errors, v_validation_errors
  FROM pharmacy_cart_items ci
  JOIN marketplace_deals d ON d.id = ci.deal_id
  WHERE ci.cart_id = v_cart_id;
  
  RETURN jsonb_build_object(
    'items', v_items,
    'summary', jsonb_build_object(
      'itemCount', v_item_count,
      'subtotal', v_subtotal,
      'totalSavings', v_total_savings,
      'estimatedTax', ROUND(v_subtotal * 0.08, 2),
      'total', ROUND(v_subtotal * 1.08, 2)
    ),
    'hasValidationErrors', COALESCE(v_has_validation_errors, false),
    'validationErrors', v_validation_errors
  );
END;
$$;

-- ============================================================
-- 6. UPDATE validate_pharmacy_cart - Check minimum buy quantity
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
  v_items JSONB;
  v_has_errors BOOLEAN;
  v_errors JSONB;
BEGIN
  -- Get cart
  SELECT id INTO v_cart_id
  FROM pharmacy_cart
  WHERE pharmacy_id = p_pharmacy_id;
  
  IF v_cart_id IS NULL THEN
    RETURN jsonb_build_object(
      'valid', false,
      'message', 'Cart not found',
      'items', '[]'::jsonb
    );
  END IF;
  
  -- Check each item
  SELECT 
    BOOL_OR(NOT validation.is_valid),
    COALESCE(jsonb_agg(
      jsonb_build_object(
        'dealId', validation.deal_id,
        'productName', validation.product_name,
        'quantity', validation.cart_quantity,
        'availableQuantity', validation.available_quantity,
        'minimumBuyQuantity', validation.minimum_buy_quantity,
        'isValid', validation.is_valid,
        'errors', validation.errors
      )
    ), '[]'::jsonb)
  INTO v_has_errors, v_items
  FROM (
    SELECT 
      ci.deal_id,
      d.product_name,
      ci.quantity AS cart_quantity,
      d.quantity AS available_quantity,
      d.minimum_buy_quantity,
      d.unit,
      d.status = 'active' AND 
      ci.quantity <= d.quantity AND 
      ci.quantity >= d.minimum_buy_quantity AS is_valid,
      CASE 
        WHEN d.status != 'active' THEN ARRAY['Deal is no longer available']
        WHEN ci.quantity > d.quantity THEN ARRAY['Exceeds available stock (' || d.quantity || ' available)']
        WHEN ci.quantity < d.minimum_buy_quantity THEN ARRAY['Below minimum quantity (' || d.minimum_buy_quantity || ' ' || d.unit || ' required)']
        ELSE ARRAY[]::TEXT[]
      END AS errors
    FROM pharmacy_cart_items ci
    JOIN marketplace_deals d ON d.id = ci.deal_id
    WHERE ci.cart_id = v_cart_id
  ) validation;
  
  -- Check if cart is empty
  IF v_items = '[]'::jsonb THEN
    RETURN jsonb_build_object(
      'valid', false,
      'message', 'Cart is empty',
      'items', '[]'::jsonb
    );
  END IF;
  
  RETURN jsonb_build_object(
    'valid', NOT COALESCE(v_has_errors, false),
    'message', CASE WHEN v_has_errors THEN 'Cart has validation errors' ELSE 'Cart is valid' END,
    'items', v_items
  );
END;
$$;

-- ============================================================
-- GRANT PERMISSIONS
-- ============================================================

GRANT EXECUTE ON FUNCTION create_marketplace_deal TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION update_marketplace_deal TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION add_to_pharmacy_cart TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION update_pharmacy_cart_item TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION get_pharmacy_cart TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION validate_pharmacy_cart TO authenticated, anon, service_role;

