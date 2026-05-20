-- Function : validate_legacy_return_update
-- Arguments: p_id uuid, p_updates jsonb
-- Type     : FUNCTION
-- =============================================================

DROP FUNCTION IF EXISTS public.validate_legacy_return_update(p_id uuid, p_updates jsonb) CASCADE;

CREATE OR REPLACE FUNCTION public.validate_legacy_return_update(p_id uuid, p_updates jsonb)
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
  
  -- Get current status
  EXECUTE 'SELECT status FROM returns WHERE id = $1' INTO v_status USING p_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', true, 'code', 404, 'message', 'Return not found');
  END IF;
  
  v_is_locked := is_legacy_return_locked(v_status);
  
  -- If locked, only allow status changes to cancelled (for emergency cancellation)
  IF v_is_locked THEN
    -- Check if this is just a status change to cancelled
    IF p_updates ? 'status' AND (p_updates->>'status') = 'cancelled' THEN
      -- Allow cancellation
      RETURN jsonb_build_object('error', false, 'message', 'Cancellation allowed');
    ELSE
      -- Block other modifications
      RETURN jsonb_build_object('error', true, 'code', 400,
        'message', format('Cannot modify return with status "%s". Return is locked after shipment.', v_status));
    END IF;
  END IF;
  
  -- Not locked, allow modification
  RETURN jsonb_build_object('error', false, 'message', 'Modification allowed');
END;
$function$;
