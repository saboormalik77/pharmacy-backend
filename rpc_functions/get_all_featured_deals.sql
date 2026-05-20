-- Function : get_all_featured_deals
-- Arguments: none
-- Type     : FUNCTION
-- =============================================================

DROP FUNCTION IF EXISTS public.get_all_featured_deals() CASCADE;

CREATE OR REPLACE FUNCTION public.get_all_featured_deals()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  RETURN jsonb_build_object(
    'dealOfTheDay', get_featured_deal('day'),
    'dealOfTheWeek', get_featured_deal('week'),
    'dealOfTheMonth', get_featured_deal('month')
  );
END;
$function$;
