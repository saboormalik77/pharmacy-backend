-- Function : get_current_deal_of_the_day_info
-- Arguments: none
-- Type     : FUNCTION
-- =============================================================

DROP FUNCTION IF EXISTS public.get_current_deal_of_the_day_info() CASCADE;

CREATE OR REPLACE FUNCTION public.get_current_deal_of_the_day_info()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_info JSONB;
  v_manual_deal JSONB;
BEGIN
  -- Get manual Deal of the Day if exists
  SELECT jsonb_build_object(
    'id', d.id,
    'dealNumber', d.deal_number,
    'productName', d.product_name,
    'isDealOfTheDay', d.is_deal_of_the_day,
    'dealOfTheDayUntil', d.deal_of_the_day_until,
    'isExpired', d.deal_of_the_day_until IS NOT NULL AND d.deal_of_the_day_until < NOW(),
    'type', 'manual'
  )
  INTO v_manual_deal
  FROM marketplace_deals d
  WHERE d.is_deal_of_the_day = TRUE
  LIMIT 1;
  
  -- Get automatic selection
  SELECT jsonb_build_object(
    'deal', get_deal_of_the_day(),
    'manualDeal', v_manual_deal,
    'hasManualSelection', v_manual_deal IS NOT NULL
  )
  INTO v_info;
  
  RETURN v_info;
END;
$function$;
