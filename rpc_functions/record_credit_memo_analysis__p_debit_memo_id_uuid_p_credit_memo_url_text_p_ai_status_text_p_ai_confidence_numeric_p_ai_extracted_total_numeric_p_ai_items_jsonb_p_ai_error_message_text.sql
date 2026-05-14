-- Function : record_credit_memo_analysis
-- Arguments: p_debit_memo_id uuid, p_credit_memo_url text, p_ai_status text, p_ai_confidence numeric, p_ai_extracted_total numeric, p_ai_items jsonb, p_ai_error_message text
-- Type     : FUNCTION
-- =============================================================

DROP FUNCTION IF EXISTS public.record_credit_memo_analysis(p_debit_memo_id uuid, p_credit_memo_url text, p_ai_status text, p_ai_confidence numeric, p_ai_extracted_total numeric, p_ai_items jsonb, p_ai_error_message text) CASCADE;

CREATE OR REPLACE FUNCTION public.record_credit_memo_analysis(p_debit_memo_id uuid, p_credit_memo_url text, p_ai_status text, p_ai_confidence numeric, p_ai_extracted_total numeric, p_ai_items jsonb, p_ai_error_message text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_analysis_id UUID;
  v_inserted    INTEGER := 0;
  v_skipped     INTEGER := 0;
  v_items_updated INTEGER := 0;
  v_item        JSONB;
  v_norm        TEXT;
  v_item_ndc    TEXT;
  v_received    DECIMAL;
  v_distinct    JSONB := '[]'::jsonb;
  v_rec_ndcs    TEXT[] := ARRAY[]::TEXT[];
BEGIN
  -- Persist the audit row first (so failures still leave a trace)
  INSERT INTO public.credit_memo_analysis (
    debit_memo_id, credit_memo_url,
    ai_status, ai_confidence, ai_extracted_total,
    ai_extracted_items, ai_error_message
  ) VALUES (
    p_debit_memo_id, p_credit_memo_url,
    COALESCE(p_ai_status, 'completed'),
    p_ai_confidence, p_ai_extracted_total,
    COALESCE(p_ai_items, '[]'::jsonb), p_ai_error_message
  )
  RETURNING id INTO v_analysis_id;

  IF p_ai_items IS NULL OR jsonb_typeof(p_ai_items) <> 'array' THEN
    RETURN jsonb_build_object(
      'error', false,
      'data', jsonb_build_object(
        'analysisId', v_analysis_id,
        'inserted',   0,
        'skipped',    0,
        'itemsUpdated', 0
      )
    );
  END IF;

  -- Walk each line item; insert into payment history if both prices present
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_ai_items) LOOP
    IF (v_item->>'ndc') IS NULL OR TRIM(v_item->>'ndc') = '' THEN
      v_skipped := v_skipped + 1;
      CONTINUE;
    END IF;
    IF (v_item->>'askPrice') IS NULL OR (v_item->>'receivedPrice') IS NULL THEN
      v_skipped := v_skipped + 1;
      CONTINUE;
    END IF;

    v_item_ndc := TRIM(v_item->>'ndc');
    v_received := (v_item->>'receivedPrice')::DECIMAL;
    v_norm := LOWER(REPLACE(v_item_ndc, '-', ''));
    IF LENGTH(v_norm) < 10 THEN
      v_norm := LPAD(v_norm, 11, '0');
    END IF;

    -- Insert into ndc_payment_history (existing behavior)
    INSERT INTO public.ndc_payment_history (
      ndc, ndc_normalized, debit_memo_id,
      ask_price, received_price,
      manufacturer, product_name, pharmacy_name,
      ask_date, receive_date, payment_method,
      is_partial, percentage_returned,
      ai_extracted, ai_confidence, source
    ) VALUES (
      v_item_ndc, v_norm, p_debit_memo_id,
      (v_item->>'askPrice')::DECIMAL,
      v_received,
      NULLIF(TRIM(COALESCE(v_item->>'manufacturer', '')), ''),
      NULLIF(TRIM(COALESCE(v_item->>'productName',  '')), ''),
      NULLIF(TRIM(COALESCE(v_item->>'pharmacyName', '')), ''),
      NULLIF(v_item->>'askDate',     '')::DATE,
      NULLIF(v_item->>'receiveDate', '')::DATE,
      NULLIF(TRIM(COALESCE(v_item->>'paymentMethod', '')), ''),
      COALESCE((v_item->>'isPartial')::BOOLEAN, FALSE),
      NULLIF(v_item->>'percentageReturned', '')::DECIMAL,
      TRUE,
      COALESCE((v_item->>'aiConfidence')::DECIMAL, p_ai_confidence),
      'credit_memo_ai'
    );

    -- ========================================================================
    -- NEW: Update received_price in debit_memo_items by matching NDC
    -- ========================================================================
    -- Match by exact NDC or normalized NDC (handles dashes and leading zeros)
    UPDATE debit_memo_items
    SET received_price = ROUND(v_received, 2)
    WHERE debit_memo_id = p_debit_memo_id
      AND (
        -- Exact match
        ndc = v_item_ndc
        -- Or normalized match (remove dashes, compare digits)
        OR LOWER(REPLACE(ndc, '-', '')) = v_norm
        -- Or the digits match when padded
        OR LPAD(LOWER(REPLACE(ndc, '-', '')), 11, '0') = v_norm
      )
      AND received_price IS NULL;  -- Only update if not already set
    
    IF FOUND THEN
      v_items_updated := v_items_updated + 1;
    END IF;
    -- ========================================================================

    v_inserted := v_inserted + 1;
    IF NOT (v_norm = ANY(v_rec_ndcs)) THEN
      v_rec_ndcs := array_append(v_rec_ndcs, v_norm);
    END IF;
  END LOOP;

  -- Recompute aggregates once per distinct NDC touched
  IF array_length(v_rec_ndcs, 1) IS NOT NULL THEN
    FOR v_norm IN SELECT unnest(v_rec_ndcs) LOOP
      PERFORM public.recompute_ndc_pricing_intelligence(v_norm);
    END LOOP;
  END IF;

  -- ========================================================================
  -- NEW: Recalculate debit memo totals from items after updating received_price
  -- ========================================================================
  IF v_items_updated > 0 THEN
    DECLARE
      v_total_received DECIMAL;
      v_total_ask      DECIMAL;
      v_status         TEXT;
    BEGIN
      -- Calculate totals from items
      SELECT 
        COALESCE(SUM(ask_price * quantity), 0),
        COALESCE(SUM(COALESCE(received_price, 0) * quantity), 0)
      INTO v_total_ask, v_total_received
      FROM debit_memo_items
      WHERE debit_memo_id = p_debit_memo_id;

      -- Determine payment status
      IF v_total_received >= v_total_ask AND v_total_ask > 0 THEN
        v_status := 'paid';
      ELSIF v_total_received > 0 THEN
        v_status := 'partial';
      ELSE
        v_status := 'pending';
      END IF;

      -- Update the debit memo with recalculated totals
      UPDATE debit_memos SET
        amount_received      = v_total_received,
        total_received_value = v_total_received,
        payment_status       = v_status
      WHERE id = p_debit_memo_id;
    END;
  END IF;
  -- ========================================================================

  v_distinct := COALESCE(to_jsonb(v_rec_ndcs), '[]'::jsonb);

  RETURN jsonb_build_object(
    'error', false,
    'data', jsonb_build_object(
      'analysisId',    v_analysis_id,
      'inserted',      v_inserted,
      'skipped',       v_skipped,
      'itemsUpdated',  v_items_updated,
      'distinctNdcs',  v_distinct
    )
  );
END;
$function$;
