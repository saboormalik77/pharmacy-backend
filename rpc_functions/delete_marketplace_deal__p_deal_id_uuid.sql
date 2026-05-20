-- Function : delete_marketplace_deal
-- Arguments: p_deal_id uuid
-- Type     : FUNCTION
-- =============================================================

DROP FUNCTION IF EXISTS public.delete_marketplace_deal(p_deal_id uuid) CASCADE;

CREATE OR REPLACE FUNCTION public.delete_marketplace_deal(p_deal_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_deal_number TEXT;
BEGIN
  -- Check if deal exists
  SELECT deal_number INTO v_deal_number FROM marketplace_deals WHERE id = p_deal_id;
  
  IF v_deal_number IS NULL THEN
    RETURN jsonb_build_object(
      'error', true,
      'message', 'Deal not found'
    );
  END IF;
  
  -- Delete deal
  DELETE FROM marketplace_deals WHERE id = p_deal_id;
  
  RETURN jsonb_build_object(
    'error', false,
    'message', 'Deal deleted successfully',
    'dealNumber', v_deal_number
  );
END;
$function$;
