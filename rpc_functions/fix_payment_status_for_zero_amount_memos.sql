-- Function : fix_payment_status_for_zero_amount_memos
-- Arguments: none
-- Type     : FUNCTION
-- =============================================================

DROP FUNCTION IF EXISTS public.fix_payment_status_for_zero_amount_memos() CASCADE;

CREATE OR REPLACE FUNCTION public.fix_payment_status_for_zero_amount_memos()
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_updated_count INTEGER;
BEGIN
  -- Fix memos where amount_requested is 0 but payment was received and status is still 'partial'
  UPDATE debit_memos SET
    payment_status = 'paid',
    updated_at = NOW()
  WHERE amount_requested <= 0 
    AND amount_received > 0 
    AND payment_status = 'partial';
    
  GET DIAGNOSTICS v_updated_count = ROW_COUNT;
  
  RETURN 'Fixed payment status for ' || v_updated_count || ' memos with zero amount requested';
END;
$function$;
