-- Function : create_marketplace_deal
-- Arguments: p_product_name text, p_category text, p_quantity integer, p_unit text, p_original_price numeric, p_deal_price numeric, p_distributor_name text, p_expiry_date date, p_ndc text, p_distributor_id uuid, p_notes text, p_image_url text, p_created_by uuid
-- Type     : FUNCTION
-- =============================================================

DROP FUNCTION IF EXISTS public.create_marketplace_deal(p_product_name text, p_category text, p_quantity integer, p_unit text, p_original_price numeric, p_deal_price numeric, p_distributor_name text, p_expiry_date date, p_ndc text, p_distributor_id uuid, p_notes text, p_image_url text, p_created_by uuid) CASCADE;

CREATE OR REPLACE FUNCTION public.create_marketplace_deal(p_product_name text, p_category text, p_quantity integer, p_unit text, p_original_price numeric, p_deal_price numeric, p_distributor_name text, p_expiry_date date, p_ndc text DEFAULT NULL::text, p_distributor_id uuid DEFAULT NULL::uuid, p_notes text DEFAULT NULL::text, p_image_url text DEFAULT NULL::text, p_created_by uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
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
    created_at,
    updated_at
  ) VALUES (
    p_product_name,
    p_category,
    p_ndc,
    p_quantity,
    p_quantity, -- original_quantity = initial quantity
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
    'createdAt', d.created_at,
    'isDealOfTheDay', COALESCE(d.is_deal_of_the_day, false),
    'dealOfTheDayUntil', d.deal_of_the_day_until,
    'isDealOfTheWeek', COALESCE(d.is_deal_of_the_week, false),
    'dealOfTheWeekUntil', d.deal_of_the_week_until,
    'isDealOfTheMonth', COALESCE(d.is_deal_of_the_month, false),
    'dealOfTheMonthUntil', d.deal_of_the_month_until
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
$function$;
