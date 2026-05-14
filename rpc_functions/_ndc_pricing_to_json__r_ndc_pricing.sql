-- Function : _ndc_pricing_to_json
-- Arguments: r ndc_pricing
-- Type     : FUNCTION
-- =============================================================

DROP FUNCTION IF EXISTS public._ndc_pricing_to_json(r ndc_pricing) CASCADE;

CREATE OR REPLACE FUNCTION public._ndc_pricing_to_json(r ndc_pricing)
 RETURNS jsonb
 LANGUAGE sql
 STABLE
AS $function$
  SELECT jsonb_build_object(
    'id',                       r.id,
    'ndc',                      r.ndc,
    'ndcNormalized',            r.ndc_normalized,
    'productName',              r.product_name,
    'manufacturer',             r.manufacturer,
    'currentPrice',             r.current_price,
    'lastPrice',                r.last_price,
    'estimatedStorePrice',      r.estimated_store_price,
    'lastReimbursement',        r.last_reimbursement,
    'priceSource',              r.price_source,
    'closeOutDestination',      r.close_out_destination,
    'lastPriceUpdate',          r.last_price_update,
    'createdBy',                r.created_by,
    'updatedBy',                r.updated_by,
    'createdAt',                r.created_at,
    'updatedAt',                r.updated_at,
    -- FCR-56 intelligence
    'avgAskPrice',              r.avg_ask_price,
    'avgReceivedPrice',         r.avg_received_price,
    'askReceivedRatio',         r.ask_received_ratio,
    'paymentSampleCount',       r.payment_sample_count,
    'aiConfidence',             r.ai_confidence,
    'manufacturerReliability',  COALESCE(r.manufacturer_reliability, 'unknown'),
    'lastAskReceivedUpdate',    r.last_ask_received_update,
    'minReceivedPrice',         r.min_received_price,
    'maxReceivedPrice',         r.max_received_price,
    'last5Payments',            COALESCE(r.last_5_payments, '[]'::jsonb)
  );
$function$;
