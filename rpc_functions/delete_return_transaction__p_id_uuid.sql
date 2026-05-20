-- Function : delete_return_transaction
-- Arguments: p_id uuid
-- Type     : FUNCTION
-- =============================================================

DROP FUNCTION IF EXISTS public.delete_return_transaction(p_id uuid) CASCADE;

CREATE OR REPLACE FUNCTION public.delete_return_transaction(p_id uuid)
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

  IF v_row.status IN ('finalized', 'closed_out', 'received') THEN
    RETURN jsonb_build_object('error', true, 'code', 400,
      'message', format('Cannot delete a return with status "%s".', v_row.status));
  END IF;

  DELETE FROM return_transactions WHERE id = p_id;

  RETURN jsonb_build_object('error', false, 'message', 'Return transaction deleted');
END;
$function$;
