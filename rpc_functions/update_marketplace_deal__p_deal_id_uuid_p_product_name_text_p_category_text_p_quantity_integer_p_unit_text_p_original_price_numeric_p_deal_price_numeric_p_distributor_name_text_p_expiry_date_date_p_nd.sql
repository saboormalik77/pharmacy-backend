-- Function : update_marketplace_deal
-- Arguments: p_deal_id uuid, p_product_name text, p_category text, p_quantity integer, p_unit text, p_original_price numeric, p_deal_price numeric, p_distributor_name text, p_expiry_date date, p_ndc text, p_status text, p_notes text, p_image_url text
-- Type     : FUNCTION
-- =============================================================

DROP FUNCTION IF EXISTS public.update_marketplace_deal(p_deal_id uuid, p_product_name text, p_category text, p_quantity integer, p_unit text, p_original_price numeric, p_deal_price numeric, p_distributor_name text, p_expiry_date date, p_ndc text, p_status text, p_notes text, p_image_url text) CASCADE;

CREATE OR REPLACE FUNCTION public.update_marketplace_deal(p_deal_id uuid, p_product_name text DEFAULT NULL::text, p_category text DEFAULT NULL::text, p_quantity integer DEFAULT NULL::integer, p_unit text DEFAULT NULL::text, p_original_price numeric DEFAULT NULL::numeric, p_deal_price numeric DEFAULT NULL::numeric, p_distributor_name text DEFAULT NULL::text, p_expiry_date date DEFAULT NULL::date, p_ndc text DEFAULT NULL::text, p_status text DEFAULT NULL::text, p_notes text DEFAULT NULL::text, p_image_url text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_deal JSONB;
  v_current_status TEXT;
BEGIN
  -- Check if deal exists
  SELECT status INTO v_current_status FROM marketplace_deals WHERE id = p_deal_id;
  
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
    'updatedAt', d.updated_at,
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
  
  RETURN jsonb_build_object(
    'error', false,
    'message', 'Deal updated successfully',
    'deal', v_deal
  );
END;
$function$;
