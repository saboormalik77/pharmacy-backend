-- Function : import_ndc_pricing_from_reports
-- Arguments: p_user_id uuid
-- Type     : FUNCTION
-- =============================================================

DROP FUNCTION IF EXISTS public.import_ndc_pricing_from_reports(p_user_id uuid) CASCADE;

CREATE OR REPLACE FUNCTION public.import_ndc_pricing_from_reports(p_user_id uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_imported INTEGER := 0;
  v_updated  INTEGER := 0;
  rec        RECORD;
BEGIN
  FOR rec IN
    WITH latest_per_ndc AS (
      SELECT DISTINCT ON (ndc_norm)
        COALESCE(rr.data->>'ndcCode', rr.data->>'ndc') AS ndc_raw,
        LOWER(REPLACE(COALESCE(rr.data->>'ndcCode', rr.data->>'ndc', ''), '-', '')) AS ndc_norm,
        COALESCE(
          NULLIF(TRIM(rr.data->>'itemName'), ''),
          NULLIF(TRIM(rr.data->>'productName'), '')
        ) AS product_name,
        (rr.data->>'pricePerUnit')::DECIMAL AS price,
        COALESCE(ud.report_date::TIMESTAMPTZ, rr.created_at) AS report_ts
      FROM return_reports rr
      LEFT JOIN uploaded_documents ud ON rr.document_id = ud.id
      WHERE COALESCE(rr.data->>'ndcCode', rr.data->>'ndc') IS NOT NULL
        AND TRIM(COALESCE(rr.data->>'ndcCode', rr.data->>'ndc', '')) != ''
        AND (rr.data->>'pricePerUnit')::DECIMAL > 0
      ORDER BY ndc_norm, COALESCE(ud.report_date::TIMESTAMPTZ, rr.created_at) DESC
    )
    SELECT * FROM latest_per_ndc
    WHERE LENGTH(ndc_norm) >= 10
  LOOP
    INSERT INTO ndc_pricing (
      ndc, ndc_normalized, product_name,
      current_price, price_source, last_price_update,
      created_by, updated_by
    ) VALUES (
      rec.ndc_raw, rec.ndc_norm, rec.product_name,
      rec.price, 'Imported from Return Reports', rec.report_ts,
      p_user_id, p_user_id
    )
    ON CONFLICT (ndc_normalized) DO UPDATE SET
      product_name      = COALESCE(NULLIF(TRIM(EXCLUDED.product_name), ''), ndc_pricing.product_name),
      last_price        = ndc_pricing.current_price,
      current_price     = CASE
                            WHEN EXCLUDED.last_price_update > COALESCE(ndc_pricing.last_price_update, '1970-01-01'::TIMESTAMPTZ)
                            THEN EXCLUDED.current_price
                            ELSE ndc_pricing.current_price
                          END,
      last_price_update = GREATEST(EXCLUDED.last_price_update, ndc_pricing.last_price_update),
      updated_by        = COALESCE(p_user_id, ndc_pricing.updated_by);

    IF FOUND THEN
      v_imported := v_imported + 1;
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'error', false,
    'data', jsonb_build_object('imported', v_imported)
  );
END;
$function$;
