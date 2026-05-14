-- Function : fix_missing_destinations
-- Arguments: none
-- Type     : FUNCTION
-- =============================================================

DROP FUNCTION IF EXISTS public.fix_missing_destinations() CASCADE;

CREATE OR REPLACE FUNCTION public.fix_missing_destinations()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_item RECORD;
  v_destination TEXT;
  v_updated_count INTEGER := 0;
  v_skipped_count INTEGER := 0;
BEGIN
  FOR v_item IN 
    SELECT rti.id, rti.ndc, rt.status as return_status
    FROM return_transaction_items rti
    JOIN return_transactions rt ON rt.id = rti.transaction_id
    WHERE rti.return_status = 'returnable' 
    AND (rti.destination IS NULL OR TRIM(rti.destination) = '')
  LOOP
    v_destination := get_destination_for_ndc(v_item.ndc);
    
    IF v_destination IS NOT NULL THEN
      -- Use the RPC function which handles granular locking properly
      PERFORM update_return_transaction_item(
        v_item.id, 
        jsonb_build_object('destination', v_destination)
      );
      v_updated_count := v_updated_count + 1;
    ELSE
      v_skipped_count := v_skipped_count + 1;
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'error', false, 
    'message', format('Updated %s items. Skipped %s (no matching policy).', v_updated_count, v_skipped_count),
    'updated_count', v_updated_count,
    'skipped_count', v_skipped_count
  );
END;
$function$;
