-- Function : get_pharmacy_cart_count
-- Arguments: p_pharmacy_id uuid
-- Type     : FUNCTION
-- =============================================================

DROP FUNCTION IF EXISTS public.get_pharmacy_cart_count(p_pharmacy_id uuid) CASCADE;

CREATE OR REPLACE FUNCTION public.get_pharmacy_cart_count(p_pharmacy_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COALESCE(COUNT(*), 0)::INTEGER
  INTO v_count
  FROM pharmacy_cart c
  JOIN pharmacy_cart_items ci ON ci.cart_id = c.id
  WHERE c.pharmacy_id = p_pharmacy_id;
  
  RETURN jsonb_build_object(
    'count', v_count
  );
END;
$function$;
