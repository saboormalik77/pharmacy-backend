-- Function : set_featured_deal
-- Arguments: p_deal_id uuid, p_type text, p_expires_at timestamp with time zone
-- Type     : FUNCTION
-- =============================================================

DROP FUNCTION IF EXISTS public.set_featured_deal(p_deal_id uuid, p_type text, p_expires_at timestamp with time zone) CASCADE;

CREATE OR REPLACE FUNCTION public.set_featured_deal(p_deal_id uuid, p_type text DEFAULT 'day'::text, p_expires_at timestamp with time zone DEFAULT NULL::timestamp with time zone)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_deal RECORD;
  v_type_label TEXT;
BEGIN
  -- Validate type
  IF p_type NOT IN ('day', 'week', 'month') THEN
    RETURN jsonb_build_object(
      'error', true,
      'message', 'Invalid type. Must be day, week, or month'
    );
  END IF;

  v_type_label := CASE p_type
    WHEN 'day' THEN 'Day'
    WHEN 'week' THEN 'Week'
    WHEN 'month' THEN 'Month'
  END;

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
      'message', 'Only active deals can be set as Deal of the ' || v_type_label
    );
  END IF;
  
  IF v_deal.expiry_date < CURRENT_DATE THEN
    RETURN jsonb_build_object(
      'error', true,
      'message', 'Expired deals cannot be set as Deal of the ' || v_type_label
    );
  END IF;
  
  IF v_deal.quantity <= 0 THEN
    RETURN jsonb_build_object(
      'error', true,
      'message', 'Deals with no remaining quantity cannot be set as Deal of the ' || v_type_label
    );
  END IF;

  -- Unset previous featured deal and set new one based on type
  IF p_type = 'day' THEN
    UPDATE marketplace_deals
    SET is_deal_of_the_day = FALSE,
        deal_of_the_day_until = NULL,
        updated_at = NOW()
    WHERE is_deal_of_the_day = TRUE;
    
    UPDATE marketplace_deals
    SET is_deal_of_the_day = TRUE,
        deal_of_the_day_until = p_expires_at,
        updated_at = NOW()
    WHERE id = p_deal_id;
    
  ELSIF p_type = 'week' THEN
    UPDATE marketplace_deals
    SET is_deal_of_the_week = FALSE,
        deal_of_the_week_until = NULL,
        updated_at = NOW()
    WHERE is_deal_of_the_week = TRUE;
    
    UPDATE marketplace_deals
    SET is_deal_of_the_week = TRUE,
        deal_of_the_week_until = p_expires_at,
        updated_at = NOW()
    WHERE id = p_deal_id;
    
  ELSIF p_type = 'month' THEN
    UPDATE marketplace_deals
    SET is_deal_of_the_month = FALSE,
        deal_of_the_month_until = NULL,
        updated_at = NOW()
    WHERE is_deal_of_the_month = TRUE;
    
    UPDATE marketplace_deals
    SET is_deal_of_the_month = TRUE,
        deal_of_the_month_until = p_expires_at,
        updated_at = NOW()
    WHERE id = p_deal_id;
  END IF;
  
  RETURN jsonb_build_object(
    'error', false,
    'message', 'Deal of the ' || v_type_label || ' updated successfully',
    'dealId', p_deal_id,
    'productName', v_deal.product_name,
    'type', p_type,
    'expiresAt', p_expires_at
  );
END;
$function$;
