-- Function : mark_marketplace_deal_sold
-- Arguments: p_deal_id uuid
-- Type     : FUNCTION
-- =============================================================

DROP FUNCTION IF EXISTS public.mark_marketplace_deal_sold(p_deal_id uuid) CASCADE;

CREATE OR REPLACE FUNCTION public.mark_marketplace_deal_sold(p_deal_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_current_status TEXT;
BEGIN
  -- Check if deal exists and get current status
  SELECT status INTO v_current_status FROM marketplace_deals WHERE id = p_deal_id;
  
  IF v_current_status IS NULL THEN
    RETURN jsonb_build_object('error', true, 'message', 'Deal not found');
  END IF;
  
  IF v_current_status = 'sold' THEN
    RETURN jsonb_build_object('error', true, 'message', 'Deal is already marked as sold');
  END IF;
  
  IF v_current_status = 'expired' THEN
    RETURN jsonb_build_object('error', true, 'message', 'Cannot sell an expired deal');
  END IF;
  
  -- Update status to sold
  UPDATE marketplace_deals
  SET status = 'sold', updated_at = NOW()
  WHERE id = p_deal_id;
  
  RETURN jsonb_build_object(
    'error', false,
    'message', 'Deal marked as sold successfully'
  );
END;
$function$;
