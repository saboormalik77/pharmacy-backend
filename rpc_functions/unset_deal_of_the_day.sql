-- Function : unset_deal_of_the_day
-- Arguments: none
-- Type     : FUNCTION
-- =============================================================

DROP FUNCTION IF EXISTS public.unset_deal_of_the_day() CASCADE;

CREATE OR REPLACE FUNCTION public.unset_deal_of_the_day()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_count INTEGER;
BEGIN
  -- Unset all Deal of the Day
  UPDATE marketplace_deals
  SET is_deal_of_the_day = FALSE,
      deal_of_the_day_until = NULL,
      updated_at = NOW()
  WHERE is_deal_of_the_day = TRUE;
  
  GET DIAGNOSTICS v_count = ROW_COUNT;
  
  RETURN jsonb_build_object(
    'error', false,
    'message', 'Deal of the Day removed successfully',
    'dealsUnset', v_count
  );
END;
$function$;
