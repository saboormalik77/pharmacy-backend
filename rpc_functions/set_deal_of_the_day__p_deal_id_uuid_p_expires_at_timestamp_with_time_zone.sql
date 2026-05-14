-- Function : set_deal_of_the_day
-- Arguments: p_deal_id uuid, p_expires_at timestamp with time zone
-- Type     : FUNCTION
-- =============================================================

DROP FUNCTION IF EXISTS public.set_deal_of_the_day(p_deal_id uuid, p_expires_at timestamp with time zone) CASCADE;

CREATE OR REPLACE FUNCTION public.set_deal_of_the_day(p_deal_id uuid, p_expires_at timestamp with time zone DEFAULT NULL::timestamp with time zone)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_deal RECORD;
BEGIN
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
      'message', 'Only active deals can be set as Deal of the Day'
    );
  END IF;
  
  IF v_deal.expiry_date < CURRENT_DATE THEN
    RETURN jsonb_build_object(
      'error', true,
      'message', 'Expired deals cannot be set as Deal of the Day'
    );
  END IF;
  
  IF v_deal.quantity <= 0 THEN
    RETURN jsonb_build_object(
      'error', true,
      'message', 'Deals with no remaining quantity cannot be set as Deal of the Day'
    );
  END IF;
  
  -- Unset previous Deal of the Day
  UPDATE marketplace_deals
  SET is_deal_of_the_day = FALSE,
      deal_of_the_day_until = NULL,
      updated_at = NOW()
  WHERE is_deal_of_the_day = TRUE;
  
  -- Set new Deal of the Day
  UPDATE marketplace_deals
  SET is_deal_of_the_day = TRUE,
      deal_of_the_day_until = p_expires_at,
      updated_at = NOW()
  WHERE id = p_deal_id;
  
  RETURN jsonb_build_object(
    'error', false,
    'message', 'Deal of the Day updated successfully',
    'dealId', p_deal_id,
    'productName', v_deal.product_name,
    'expiresAt', p_expires_at
  );
END;
$function$;
