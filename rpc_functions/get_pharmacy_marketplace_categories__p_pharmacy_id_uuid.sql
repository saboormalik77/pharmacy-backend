-- Function : get_pharmacy_marketplace_categories
-- Arguments: p_pharmacy_id uuid
-- Type     : FUNCTION
-- =============================================================

DROP FUNCTION IF EXISTS public.get_pharmacy_marketplace_categories(p_pharmacy_id uuid) CASCADE;

CREATE OR REPLACE FUNCTION public.get_pharmacy_marketplace_categories(p_pharmacy_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_categories JSONB;
BEGIN
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'value', category,
        'label', category,
        'count', count
      )
      ORDER BY count DESC, category
    ),
    '[]'::jsonb
  )
  INTO v_categories
  FROM (
    SELECT category, COUNT(*)::INTEGER as count
    FROM marketplace_deals
    GROUP BY category
  ) sub;
  
  RETURN jsonb_build_object(
    'categories', v_categories
  );
END;
$function$;
