-- FCR-56c: resolve_ndc_price — include avg_ask_price in response
--
-- The avg_ask_price column was added by fcr_56_ndc_pricing_intelligence.sql.
-- It stores the average ask price computed from real payment history
-- (historical ask values from debit memos vs. received values from credit memos).
--
-- Change: expose avg_ask_price as "avgAskPrice" so callers can prefer it
-- over the manually-entered current_price when historical data exists.
--
-- Run once in Supabase SQL Editor.
-- ============================================================

CREATE OR REPLACE FUNCTION resolve_ndc_price(p_ndc TEXT)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER AS $$
DECLARE
  v_norm TEXT;
  v_row  ndc_pricing;
BEGIN
  v_norm := LOWER(REPLACE(TRIM(p_ndc), '-', ''));
  IF LENGTH(v_norm) < 10 THEN
    v_norm := LPAD(v_norm, 11, '0');
  END IF;

  SELECT * INTO v_row FROM ndc_pricing WHERE ndc_normalized = v_norm;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'found',               false,
      'avgAskPrice',         NULL,
      'currentPrice',        NULL,
      'estimatedStorePrice', NULL,
      'priceSource',         NULL,
      'closeOutDestination', NULL,
      'lastPriceUpdate',     NULL,
      'productName',         NULL
    );
  END IF;

  RETURN jsonb_build_object(
    'found',               true,
    'avgAskPrice',         v_row.avg_ask_price,
    'currentPrice',        v_row.current_price,
    'estimatedStorePrice', v_row.estimated_store_price,
    'priceSource',         v_row.price_source,
    'closeOutDestination', v_row.close_out_destination,
    'lastPriceUpdate',     v_row.last_price_update,
    'productName',         v_row.product_name
  );
END;
$$;

GRANT EXECUTE ON FUNCTION resolve_ndc_price TO authenticated, anon, service_role;
