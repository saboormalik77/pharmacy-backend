-- Function : ra_ship_debit_memo
-- Arguments: p_debit_memo_id uuid, p_outbound_tracking text, p_shipped_at timestamp with time zone
-- Type     : FUNCTION
-- =============================================================

DROP FUNCTION IF EXISTS public.ra_ship_debit_memo(p_debit_memo_id uuid, p_outbound_tracking text, p_shipped_at timestamp with time zone) CASCADE;

CREATE OR REPLACE FUNCTION public.ra_ship_debit_memo(p_debit_memo_id uuid, p_outbound_tracking text, p_shipped_at timestamp with time zone DEFAULT now())
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_memo debit_memos;
BEGIN
  -- Find the debit memo
  SELECT * INTO v_memo FROM debit_memos WHERE id = p_debit_memo_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', true, 'code', 404, 'message', 'Debit memo not found');
  END IF;

  -- Check if RA number exists
  IF v_memo.ra_number IS NULL OR TRIM(v_memo.ra_number) = '' THEN
    RETURN jsonb_build_object('error', true, 'code', 400,
      'message', 'Cannot ship without an RA number. Record RA received first.');
  END IF;

  -- Validate tracking number
  IF p_outbound_tracking IS NULL OR TRIM(p_outbound_tracking) = '' THEN
    RETURN jsonb_build_object('error', true, 'code', 400, 'message', 'Outbound tracking number is required');
  END IF;

  -- Update the debit memo with shipping information
  UPDATE debit_memos SET
    outbound_tracking = TRIM(p_outbound_tracking),
    shipped_at = p_shipped_at,
    ra_status = 'shipped',
    updated_at = NOW()
  WHERE id = p_debit_memo_id;

  -- Get the updated memo
  SELECT * INTO v_memo FROM debit_memos WHERE id = p_debit_memo_id;

  -- Return success response
  RETURN jsonb_build_object(
    'error', false,
    'data', _debit_memo_to_json(v_memo)
  );
END;
$function$;
