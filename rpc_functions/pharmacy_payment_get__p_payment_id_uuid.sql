-- Function : pharmacy_payment_get
-- Arguments: p_payment_id uuid
-- Type     : FUNCTION
-- =============================================================

DROP FUNCTION IF EXISTS public.pharmacy_payment_get(p_payment_id uuid) CASCADE;

CREATE OR REPLACE FUNCTION public.pharmacy_payment_get(p_payment_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
AS $function$
DECLARE
  v_payment pharmacy_payments;
  v_memos   jsonb;
BEGIN
  SELECT * INTO v_payment FROM pharmacy_payments WHERE id = p_payment_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', true, 'code', 404, 'message', 'Payment not found');
  END IF;

  -- Get related debit memos
  SELECT COALESCE(jsonb_agg(_debit_memo_to_json(dm) ORDER BY dm.created_at), '[]'::jsonb)
  INTO v_memos
  FROM debit_memos dm
  WHERE dm.pharmacy_id = v_payment.pharmacy_id
    AND (v_payment.batch_id IS NULL OR dm.batch_id = v_payment.batch_id);

  RETURN jsonb_build_object(
    'error', false,
    'data', _pharmacy_payment_to_json(v_payment) || jsonb_build_object('debitMemos', v_memos)
  );
EXCEPTION
  WHEN OTHERS THEN
    -- Fallback without debit memos if _debit_memo_to_json doesn't exist
    RETURN jsonb_build_object(
      'error', false,
      'data', _pharmacy_payment_to_json(v_payment)
    );
END;
$function$;
