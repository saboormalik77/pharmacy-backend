-- Function : bulk_seed_ndc_payment_history
-- Arguments: p_records jsonb
-- Type     : FUNCTION
-- =============================================================

DROP FUNCTION IF EXISTS public.bulk_seed_ndc_payment_history(p_records jsonb) CASCADE;

CREATE OR REPLACE FUNCTION public.bulk_seed_ndc_payment_history(p_records jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_item     JSONB;
  v_norm     TEXT;
  v_inserted INTEGER := 0;
  v_skipped  INTEGER := 0;
  v_ndcs     TEXT[]  := ARRAY[]::TEXT[];
BEGIN
  IF p_records IS NULL OR jsonb_typeof(p_records) <> 'array' THEN
    RETURN jsonb_build_object('error', true, 'code', 400, 'message',
      'p_records must be a JSONB array');
  END IF;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_records) LOOP
    IF (v_item->>'ndc') IS NULL OR TRIM(v_item->>'ndc') = ''
       OR (v_item->>'askPrice')      IS NULL OR (v_item->>'askPrice')      = ''
       OR (v_item->>'receivedPrice') IS NULL OR (v_item->>'receivedPrice') = ''
    THEN
      v_skipped := v_skipped + 1;
      CONTINUE;
    END IF;

    v_norm := LOWER(REPLACE(TRIM(v_item->>'ndc'), '-', ''));
    IF LENGTH(v_norm) < 10 THEN
      v_norm := LPAD(v_norm, 11, '0');
    END IF;

    INSERT INTO public.ndc_payment_history (
      ndc, ndc_normalized,
      ask_price, received_price,
      manufacturer, product_name, pharmacy_name,
      ask_date, receive_date, payment_method,
      is_partial, percentage_returned,
      ai_extracted, ai_confidence, source
    ) VALUES (
      TRIM(v_item->>'ndc'), v_norm,
      (v_item->>'askPrice')::DECIMAL,
      (v_item->>'receivedPrice')::DECIMAL,
      NULLIF(TRIM(COALESCE(v_item->>'manufacturer', '')), ''),
      NULLIF(TRIM(COALESCE(v_item->>'productName',  '')), ''),
      NULLIF(TRIM(COALESCE(v_item->>'pharmacyName', '')), ''),
      NULLIF(v_item->>'askDate',     '')::DATE,
      NULLIF(v_item->>'receiveDate', '')::DATE,
      NULLIF(TRIM(COALESCE(v_item->>'paymentMethod', '')), ''),
      COALESCE((v_item->>'isPartial')::BOOLEAN, FALSE),
      NULLIF(v_item->>'percentageReturned', '')::DECIMAL,
      FALSE,
      NULLIF(v_item->>'aiConfidence', '')::DECIMAL,
      'csv_seed'
    );

    v_inserted := v_inserted + 1;
    IF NOT (v_norm = ANY(v_ndcs)) THEN
      v_ndcs := array_append(v_ndcs, v_norm);
    END IF;
  END LOOP;

  IF array_length(v_ndcs, 1) IS NOT NULL THEN
    FOR v_norm IN SELECT unnest(v_ndcs) LOOP
      PERFORM public.recompute_ndc_pricing_intelligence(v_norm);
    END LOOP;
  END IF;

  RETURN jsonb_build_object(
    'error', false,
    'data', jsonb_build_object(
      'inserted',     v_inserted,
      'skipped',      v_skipped,
      'distinctNdcs', COALESCE(array_length(v_ndcs, 1), 0)
    )
  );
END;
$function$;
