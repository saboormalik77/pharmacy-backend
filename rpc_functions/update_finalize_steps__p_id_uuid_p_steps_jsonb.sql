-- Function : update_finalize_steps
-- Arguments: p_id uuid, p_steps jsonb
-- Type     : FUNCTION
-- =============================================================

DROP FUNCTION IF EXISTS public.update_finalize_steps(p_id uuid, p_steps jsonb) CASCADE;

CREATE OR REPLACE FUNCTION public.update_finalize_steps(p_id uuid, p_steps jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_row return_transactions;
BEGIN
  SELECT * INTO v_row FROM return_transactions WHERE id = p_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', true, 'code', 404,
      'message', 'Return transaction not found');
  END IF;

  -- Only block if already finalized (permanently locked)
  -- Allow finalize steps updates for ALL other statuses
  IF v_row.status = 'finalized' THEN
    RETURN jsonb_build_object('error', true, 'code', 400,
      'message', 'Cannot update finalize steps for a finalized return. The return is permanently locked.');
  END IF;

  -- Merge the new steps with existing steps
  UPDATE return_transactions
     SET finalize_steps = COALESCE(finalize_steps, '{"printManifest": false, "fedexEntered": false, "printJobSheets": false}'::jsonb) || p_steps,
         updated_at     = NOW()
   WHERE id = p_id
   RETURNING * INTO v_row;

  RETURN jsonb_build_object(
    'error', false,
    'data',  _rt_to_json(v_row)
  );
END;
$function$;
