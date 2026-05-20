-- Function : change_return_transaction_status
-- Arguments: p_id uuid, p_new_status text
-- Type     : FUNCTION
-- =============================================================

DROP FUNCTION IF EXISTS public.change_return_transaction_status(p_id uuid, p_new_status text) CASCADE;

CREATE OR REPLACE FUNCTION public.change_return_transaction_status(p_id uuid, p_new_status text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_row return_transactions;
BEGIN
  SELECT * INTO v_row FROM return_transactions WHERE id = p_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', true, 'code', 404, 'message', 'Return transaction not found');
  END IF;

  -- Validate transitions
  CASE p_new_status
    WHEN 'paused' THEN
      IF v_row.status <> 'in_progress' THEN
        RETURN jsonb_build_object('error', true, 'code', 400,
          'message', format('Cannot pause a return with status "%s". Only in_progress returns can be paused.', v_row.status));
      END IF;

    WHEN 'in_progress' THEN  -- resume
      IF v_row.status <> 'paused' THEN
        RETURN jsonb_build_object('error', true, 'code', 400,
          'message', format('Cannot resume a return with status "%s". Only paused returns can be resumed.', v_row.status));
      END IF;

    WHEN 'completed' THEN
      IF v_row.status NOT IN ('in_progress', 'paused') THEN
        RETURN jsonb_build_object('error', true, 'code', 400,
          'message', format('Cannot complete a return with status "%s".', v_row.status));
      END IF;

    WHEN 'finalized' THEN
      IF v_row.status <> 'completed' THEN
        RETURN jsonb_build_object('error', true, 'code', 400,
          'message', format('Cannot finalize a return with status "%s". Must be completed first.', v_row.status));
      END IF;

    ELSE
      RETURN jsonb_build_object('error', true, 'code', 400,
        'message', format('Invalid target status: %s', p_new_status));
  END CASE;

  -- Apply transition
  UPDATE return_transactions SET
    status       = p_new_status,
    time_out     = CASE WHEN p_new_status = 'completed'  THEN NOW()       ELSE time_out     END,
    finalized_at = CASE WHEN p_new_status = 'finalized'  THEN NOW()       ELSE finalized_at  END
  WHERE id = p_id
  RETURNING * INTO v_row;

  RETURN jsonb_build_object('error', false, 'data', _rt_to_json(v_row));
END;
$function$;
