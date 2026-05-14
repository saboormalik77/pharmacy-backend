-- Function : check_legacy_return_lock_status
-- Arguments: p_id uuid
-- Type     : FUNCTION
-- =============================================================

DROP FUNCTION IF EXISTS public.check_legacy_return_lock_status(p_id uuid) CASCADE;

CREATE OR REPLACE FUNCTION public.check_legacy_return_lock_status(p_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_status TEXT;
  v_is_locked BOOLEAN;
BEGIN
  -- Check if returns table exists
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'returns') THEN
    RETURN jsonb_build_object('error', true, 'code', 404, 'message', 'Legacy returns system not available');
  END IF;
  
  -- Get return status
  EXECUTE 'SELECT status FROM returns WHERE id = $1' INTO v_status USING p_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', true, 'code', 404, 'message', 'Return not found');
  END IF;
  
  v_is_locked := is_legacy_return_locked(v_status);
  
  RETURN jsonb_build_object(
    'error', false,
    'data', jsonb_build_object(
      'id', p_id,
      'status', v_status,
      'isLocked', v_is_locked,
      'canEdit', NOT v_is_locked,
      'lockReason', CASE 
        WHEN v_is_locked THEN 'Return is locked after shipment to prevent data discrepancies'
        ELSE null
      END
    )
  );
END;
$function$;
