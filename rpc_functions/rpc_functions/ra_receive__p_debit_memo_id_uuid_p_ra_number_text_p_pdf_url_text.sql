-- Function : ra_receive
-- Arguments: p_debit_memo_id uuid, p_ra_number text, p_pdf_url text
-- Type     : FUNCTION
-- =============================================================

DROP FUNCTION IF EXISTS public.ra_receive(p_debit_memo_id uuid, p_ra_number text, p_pdf_url text) CASCADE;

CREATE OR REPLACE FUNCTION public.ra_receive(p_debit_memo_id uuid, p_ra_number text, p_pdf_url text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_memo debit_memos;
BEGIN
  SELECT * INTO v_memo FROM debit_memos WHERE id = p_debit_memo_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', true, 'code', 404, 'message', 'Debit memo not found');
  END IF;

  IF p_ra_number IS NULL OR TRIM(p_ra_number) = '' THEN
    RETURN jsonb_build_object('error', true, 'code', 400, 'message', 'RA number is required');
  END IF;

  UPDATE debit_memos SET
    ra_number = TRIM(p_ra_number),
    ra_received_at = NOW(),
    ra_status = 'received'
  WHERE id = p_debit_memo_id;

  SELECT * INTO v_memo FROM debit_memos WHERE id = p_debit_memo_id;

  RETURN jsonb_build_object(
    'error', false,
    'data', _debit_memo_to_json(v_memo)
  );
END;
$function$;
