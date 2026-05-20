-- Function : finalize_return_transaction
-- Arguments: p_id uuid, p_fedex_tracking text, p_box_count integer, p_prp_number text, p_package_tracking jsonb
-- Type     : FUNCTION
-- =============================================================

DROP FUNCTION IF EXISTS public.finalize_return_transaction(p_id uuid, p_fedex_tracking text, p_box_count integer, p_prp_number text, p_package_tracking jsonb) CASCADE;

CREATE OR REPLACE FUNCTION public.finalize_return_transaction(p_id uuid, p_fedex_tracking text DEFAULT NULL::text, p_box_count integer DEFAULT NULL::integer, p_prp_number text DEFAULT NULL::text, p_package_tracking jsonb DEFAULT NULL::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_row   return_transactions;
  v_total INTEGER;
BEGIN
  SELECT * INTO v_row FROM return_transactions WHERE id = p_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', true, 'code', 404,
      'message', 'Return transaction not found');
  END IF;

  IF v_row.status <> 'completed' THEN
    RETURN jsonb_build_object('error', true, 'code', 400,
      'message', format('Cannot finalize a return with status "%s". Must be completed first.', v_row.status));
  END IF;

  SELECT COUNT(*) INTO v_total FROM return_transaction_items WHERE transaction_id = p_id;
  IF v_total = 0 THEN
    RETURN jsonb_build_object('error', true, 'code', 400,
      'message', 'Cannot finalize a return with no items.');
  END IF;

  -- NOTE: TBD status check removed - TBD items are now handled by warehouse verification
  -- SELECT COUNT(*) INTO v_tbd
  --   FROM return_transaction_items
  --  WHERE transaction_id = p_id
  --    AND return_status = 'tbd';
  --
  -- IF v_tbd > 0 THEN
  --   RETURN jsonb_build_object('error', true, 'code', 400,
  --     'message', format('Cannot finalize: %s item(s) still have TBD status.', v_tbd));
  -- END IF;

  -- FedEx tracking: use provided value or existing value
  IF p_fedex_tracking IS NOT NULL AND TRIM(p_fedex_tracking) <> '' THEN
    v_row.fedex_tracking := TRIM(p_fedex_tracking);
  END IF;

  IF v_row.fedex_tracking IS NULL OR TRIM(v_row.fedex_tracking) = '' THEN
    RETURN jsonb_build_object('error', true, 'code', 400,
      'message', 'Cannot finalize: FedEx tracking number is required.');
  END IF;

  UPDATE return_transactions SET
    status             = 'finalized',
    finalized_at       = NOW(),
    fedex_tracking     = v_row.fedex_tracking,
    box_count          = COALESCE(p_box_count, box_count),
    prp_number         = COALESCE(NULLIF(TRIM(p_prp_number), ''), prp_number),
    package_tracking   = COALESCE(p_package_tracking, package_tracking)
  WHERE id = p_id
  RETURNING * INTO v_row;

  RETURN jsonb_build_object('error', false, 'data', _rt_to_json(v_row));
END;
$function$;
