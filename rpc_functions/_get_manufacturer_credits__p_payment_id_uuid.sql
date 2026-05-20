-- Function : _get_manufacturer_credits
-- Arguments: p_payment_id uuid
-- Type     : FUNCTION
-- =============================================================

DROP FUNCTION IF EXISTS public._get_manufacturer_credits(p_payment_id uuid) CASCADE;

CREATE OR REPLACE FUNCTION public._get_manufacturer_credits(p_payment_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
AS $function$
DECLARE
  v_payment pharmacy_payments;
  v_manual_credits jsonb;
  v_debit_memo_credits jsonb;
  v_has_manual_credits BOOLEAN;
BEGIN
  SELECT * INTO v_payment FROM pharmacy_payments WHERE id = p_payment_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('included', '[]'::jsonb, 'direct', '[]'::jsonb, 'por', '[]'::jsonb);
  END IF;

  SELECT EXISTS(
    SELECT 1 FROM payment_manufacturer_credits WHERE payment_id = p_payment_id
  ) INTO v_has_manual_credits;

  IF v_has_manual_credits THEN
    SELECT jsonb_build_object(
      'included', COALESCE(jsonb_agg(
        jsonb_build_object(
          'manufacturerName', pmc.manufacturer_name,
          'creditAmount', pmc.credit_amount,
          'isControlledSubstance', pmc.is_controlled_substance,
          'notes', pmc.notes
        ) ORDER BY pmc.manufacturer_name
      ) FILTER (WHERE pmc.credit_type = 'included'), '[]'::jsonb),
      'direct', COALESCE(jsonb_agg(
        jsonb_build_object(
          'manufacturerName', pmc.manufacturer_name,
          'creditAmount', pmc.credit_amount,
          'isControlledSubstance', pmc.is_controlled_substance,
          'notes', pmc.notes
        ) ORDER BY pmc.manufacturer_name
      ) FILTER (WHERE pmc.credit_type = 'direct'), '[]'::jsonb),
      'por', COALESCE(jsonb_agg(
        jsonb_build_object(
          'manufacturerName', pmc.manufacturer_name,
          'creditAmount', pmc.credit_amount,
          'isControlledSubstance', pmc.is_controlled_substance,
          'notes', pmc.notes
        ) ORDER BY pmc.manufacturer_name
      ) FILTER (WHERE pmc.credit_type = 'por'), '[]'::jsonb)
    ) INTO v_manual_credits
    FROM payment_manufacturer_credits pmc
    WHERE pmc.payment_id = p_payment_id;
    
    RETURN v_manual_credits;
  END IF;

  SELECT jsonb_build_object(
    'included', COALESCE(jsonb_agg(
      jsonb_build_object(
        'manufacturerName', dm.labeler_name,
        'creditAmount', COALESCE(dm.amount_received, dm.total_ask_value, 0),
        'isControlledSubstance', false,
        'notes', 'From debit memo ' || dm.memo_number
      ) ORDER BY dm.labeler_name
    ) FILTER (WHERE dm.payment_status = 'paid' AND dm.amount_received > 0), '[]'::jsonb),
    'direct', COALESCE(jsonb_agg(
      jsonb_build_object(
        'manufacturerName', dm.labeler_name,
        'creditAmount', COALESCE(dm.amount_received, dm.total_ask_value, 0),
        'isControlledSubstance', false,
        'notes', 'Direct credit from memo ' || dm.memo_number
      ) ORDER BY dm.labeler_name
    ) FILTER (WHERE dm.payment_status = 'partial' AND dm.amount_received > 0), '[]'::jsonb),
    'por', COALESCE(jsonb_agg(
      jsonb_build_object(
        'manufacturerName', dm.labeler_name,
        'creditAmount', COALESCE(dm.amount_received, dm.total_ask_value, 0),
        'isControlledSubstance', false,
        'notes', 'POR from memo ' || dm.memo_number
      ) ORDER BY dm.labeler_name
    ) FILTER (WHERE dm.payment_status = 'disputed' AND dm.amount_received > 0), '[]'::jsonb)
  ) INTO v_debit_memo_credits
  FROM debit_memos dm
  WHERE dm.pharmacy_id = v_payment.pharmacy_id
    AND dm.batch_id = v_payment.batch_id
    AND dm.labeler_name IS NOT NULL
    AND dm.labeler_name != '';

  RETURN COALESCE(
    v_debit_memo_credits,
    jsonb_build_object('included', '[]'::jsonb, 'direct', '[]'::jsonb, 'por', '[]'::jsonb)
  );
END;
$function$;
