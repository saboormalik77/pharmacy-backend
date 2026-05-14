-- Function : unset_featured_deal
-- Arguments: p_type text
-- Type     : FUNCTION
-- =============================================================

DROP FUNCTION IF EXISTS public.unset_featured_deal(p_type text) CASCADE;

CREATE OR REPLACE FUNCTION public.unset_featured_deal(p_type text DEFAULT 'day'::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_count INTEGER;
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

  IF p_type = 'day' THEN
    UPDATE marketplace_deals
    SET is_deal_of_the_day = FALSE,
        deal_of_the_day_until = NULL,
        updated_at = NOW()
    WHERE is_deal_of_the_day = TRUE;
    
  ELSIF p_type = 'week' THEN
    UPDATE marketplace_deals
    SET is_deal_of_the_week = FALSE,
        deal_of_the_week_until = NULL,
        updated_at = NOW()
    WHERE is_deal_of_the_week = TRUE;
    
  ELSIF p_type = 'month' THEN
    UPDATE marketplace_deals
    SET is_deal_of_the_month = FALSE,
        deal_of_the_month_until = NULL,
        updated_at = NOW()
    WHERE is_deal_of_the_month = TRUE;
  END IF;
  
  GET DIAGNOSTICS v_count = ROW_COUNT;
  
  RETURN jsonb_build_object(
    'error', false,
    'message', 'Deal of the ' || v_type_label || ' removed successfully',
    'type', p_type,
    'dealsUnset', v_count
  );
END;
$function$;
