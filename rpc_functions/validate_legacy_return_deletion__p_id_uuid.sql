-- Function : validate_legacy_return_deletion
-- Arguments: p_id uuid
-- Type     : FUNCTION
-- =============================================================

DROP FUNCTION IF EXISTS public.validate_legacy_return_deletion(p_id uuid) CASCADE;

CREATE OR REPLACE FUNCTION public.validate_legacy_return_deletion(p_id uuid)
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
  
  IF v_is_locked THEN
    RETURN jsonb_build_object('error', true, 'code', 400,
      'message', format('Cannot delete return with status "%s". Return is locked after shipment.', v_status));
  END IF;
  
  RETURN jsonb_build_object('error', false, 'message', 'Deletion allowed');
END;
$function$;
