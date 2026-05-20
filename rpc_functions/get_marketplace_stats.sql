-- Function : get_marketplace_stats
-- Arguments: none
-- Type     : FUNCTION
-- =============================================================

DROP FUNCTION IF EXISTS public.get_marketplace_stats() CASCADE;

CREATE OR REPLACE FUNCTION public.get_marketplace_stats()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_stats JSONB;
BEGIN
  -- First, update any expired deals
  UPDATE marketplace_deals
  SET status = 'expired', updated_at = NOW()
  WHERE status = 'active' AND expiry_date < CURRENT_DATE;
  
  SELECT jsonb_build_object(
    'totalDeals', COUNT(*)::INTEGER,
    'activeDeals', COUNT(*) FILTER (WHERE status = 'active')::INTEGER,
    'soldDeals', COUNT(*) FILTER (WHERE status = 'sold')::INTEGER,
    'expiredDeals', COUNT(*) FILTER (WHERE status = 'expired')::INTEGER,
    'totalItems', COALESCE(SUM(quantity), 0)::BIGINT,
    'totalValue', COALESCE(SUM(deal_price * quantity), 0)::NUMERIC(12,2),
    'avgSavings', COALESCE(AVG(ROUND(((original_price - deal_price) / original_price * 100), 0)), 0)::NUMERIC(5,2)
  )
  INTO v_stats
  FROM marketplace_deals;
  
  RETURN v_stats;
END;
$function$;
