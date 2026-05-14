-- Function : check_return_transaction_lock_status
-- Arguments: p_id uuid
-- Type     : FUNCTION
-- =============================================================

DROP FUNCTION IF EXISTS public.check_return_transaction_lock_status(p_id uuid) CASCADE;

CREATE OR REPLACE FUNCTION public.check_return_transaction_lock_status(p_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_status TEXT;
  v_is_locked BOOLEAN;
BEGIN
  SELECT status INTO v_status FROM return_transactions WHERE id = p_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', true, 'code', 404, 'message', 'Return transaction not found');
  END IF;
  
  v_is_locked := is_return_transaction_locked(v_status);
  
  RETURN jsonb_build_object(
    'error', false,
    'data', jsonb_build_object(
      'id', p_id,
      'status', v_status,
      'isLocked', v_is_locked,
      'canEdit', NOT v_is_locked,
      'canEditClassification', true,
      'canEditNotes', true,
      'canEditCoreData', NOT v_is_locked,
      'canAddDeleteItems', NOT v_is_locked,
      'lockReason', CASE 
        WHEN v_is_locked THEN format('Return is "%s". Core data is locked. Classification fields and notes can still be updated.', v_status)
        ELSE null
      END
    )
  );
END;
$function$;
