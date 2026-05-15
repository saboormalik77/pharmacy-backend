-- Function : warehouse_verify_return
-- Arguments: p_id uuid, p_pieces_received integer, p_verified_integrity boolean, p_notes text, p_verified_by uuid
-- Type     : FUNCTION
-- =============================================================

DROP FUNCTION IF EXISTS public.warehouse_verify_return(p_id uuid, p_pieces_received integer, p_verified_integrity boolean, p_notes text, p_verified_by uuid) CASCADE;

CREATE OR REPLACE FUNCTION public.warehouse_verify_return(p_id uuid, p_pieces_received integer DEFAULT NULL::integer, p_verified_integrity boolean DEFAULT true, p_notes text DEFAULT NULL::text, p_verified_by uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_row            return_transactions;
  v_total_items    INTEGER;
  v_verified_items INTEGER;
  v_discrepancies  INTEGER;
BEGIN
  SELECT * INTO v_row FROM return_transactions WHERE id = p_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', true, 'code', 404,
      'message', 'Return transaction not found');
  END IF;

  IF v_row.status <> 'received' THEN
    RETURN jsonb_build_object('error', true, 'code', 400,
      'message', format('Cannot verify a return with status "%s". Must be received first.', v_row.status));
  END IF;

  SELECT COUNT(*) INTO v_total_items
    FROM return_transaction_items WHERE transaction_id = p_id;

  SELECT COUNT(*) INTO v_verified_items
    FROM return_transaction_items WHERE transaction_id = p_id AND verified = TRUE;

  SELECT COUNT(*) INTO v_discrepancies
    FROM warehouse_discrepancies WHERE transaction_id = p_id AND status = 'open';

  UPDATE return_transactions SET
    verified_integrity  = p_verified_integrity,
    verified_at         = NOW(),
    verified_by         = p_verified_by,
    pieces_received     = COALESCE(p_pieces_received, pieces_received),
    notes               = COALESCE(p_notes, notes)
  WHERE id = p_id
  RETURNING * INTO v_row;

  RETURN jsonb_build_object(
    'error', false,
    'data', _rt_to_json(v_row),
    'verification', jsonb_build_object(
      'totalItems',     v_total_items,
      'verifiedItems',  v_verified_items,
      'openDiscrepancies', v_discrepancies
    )
  );
END;
$function$;
