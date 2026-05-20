-- Function : fix_batch_destinations
-- Arguments: p_batch_id uuid
-- Type     : FUNCTION
-- =============================================================

DROP FUNCTION IF EXISTS public.fix_batch_destinations(p_batch_id uuid) CASCADE;

CREATE OR REPLACE FUNCTION public.fix_batch_destinations(p_batch_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_item RECORD;
  v_destination TEXT;
  v_updated_count INTEGER := 0;
BEGIN
  FOR v_item IN 
    SELECT rti.id, rti.ndc
    FROM return_transaction_items rti
    JOIN return_transactions rt ON rt.id = rti.transaction_id
    WHERE rt.batch_id = p_batch_id
    AND rti.return_status = 'returnable' 
    AND (rti.destination IS NULL OR TRIM(rti.destination) = '')
  LOOP
    v_destination := get_destination_for_ndc(v_item.ndc);
    
    IF v_destination IS NOT NULL THEN
      PERFORM update_return_transaction_item(
        v_item.id, 
        jsonb_build_object('destination', v_destination)
      );
      v_updated_count := v_updated_count + 1;
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'error', false, 
    'message', format('Fixed %s items in batch with auto-assigned destinations', v_updated_count),
    'updated_count', v_updated_count
  );
END;
$function$;
