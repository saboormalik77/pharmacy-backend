-- Function : get_ndc_pricing_index
-- Arguments: p_limit integer, p_offset integer, p_updated_after timestamp with time zone
-- Type     : FUNCTION
-- =============================================================

DROP FUNCTION IF EXISTS public.get_ndc_pricing_index(p_limit integer, p_offset integer, p_updated_after timestamp with time zone) CASCADE;

CREATE OR REPLACE FUNCTION public.get_ndc_pricing_index(p_limit integer DEFAULT 10000, p_offset integer DEFAULT 0, p_updated_after timestamp with time zone DEFAULT NULL::timestamp with time zone)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_results JSONB;
  v_total INTEGER;
BEGIN
  SELECT COUNT(DISTINCT ndc_normalized)::INTEGER INTO v_total
  FROM ndc_pricing_index
  WHERE p_updated_after IS NULL OR updated_at > p_updated_after;

  -- IMPORTANT: Use COALESCE(report_date, uploaded_at, created_at) for ordering
  -- This matches the optimization API's fallback chain for determining "latest" prices
  WITH unique_ndcs AS (
    SELECT DISTINCT ON (ndc_normalized)
      ndc_original,
      ndc_normalized,
      product_name
    FROM ndc_pricing_index
    WHERE p_updated_after IS NULL OR updated_at > p_updated_after
    ORDER BY ndc_normalized, COALESCE(report_date::timestamp, uploaded_at, source_created_at) DESC NULLS LAST
    LIMIT p_limit
    OFFSET p_offset
  ),
  aggregated AS (
    SELECT 
      u.ndc_original,
      u.ndc_normalized,
      u.product_name,
      (
        -- CRITICAL: Group by distributor_name (NOT distributor_id) - same as optimization API
        SELECT jsonb_agg(
          jsonb_build_object(
            'id', d.distributor_id,
            'name', d.distributor_name,
            'email', d.distributor_email,
            'phone', d.distributor_phone,
            'location', d.distributor_location,
            -- CRITICAL FIX: Add ORDER BY to get LATEST price (same as optimization API)
            'fullPrice', COALESCE(
              (SELECT price_per_unit FROM ndc_pricing_index 
               WHERE ndc_normalized = u.ndc_normalized 
                 AND distributor_name = d.distributor_name 
                 AND is_full_record = TRUE
               ORDER BY COALESCE(report_date::timestamp, uploaded_at, source_created_at) DESC NULLS LAST,
                        source_report_id ASC
               LIMIT 1), 0
            ),
            -- CRITICAL FIX: Add ORDER BY to get LATEST price (same as optimization API)
            'partialPrice', COALESCE(
              (SELECT price_per_unit FROM ndc_pricing_index 
               WHERE ndc_normalized = u.ndc_normalized 
                 AND distributor_name = d.distributor_name 
                 AND is_partial_record = TRUE
               ORDER BY COALESCE(report_date::timestamp, uploaded_at, source_created_at) DESC NULLS LAST,
                        source_report_id ASC
               LIMIT 1), 0
            )
          ) ORDER BY d.price_per_unit DESC NULLS LAST
        )
        FROM (
          SELECT DISTINCT ON (distributor_name) *
          FROM ndc_pricing_index
          WHERE ndc_normalized = u.ndc_normalized
          ORDER BY distributor_name, COALESCE(report_date::timestamp, uploaded_at, source_created_at) DESC NULLS LAST
        ) d
      ) AS distributors,
      -- CRITICAL FIX: Get max of LATEST prices per distributor, not max of ALL prices
      (SELECT MAX(latest_price) FROM (
        SELECT DISTINCT ON (distributor_name) price_per_unit AS latest_price
        FROM ndc_pricing_index 
        WHERE ndc_normalized = u.ndc_normalized AND is_full_record = TRUE
        ORDER BY distributor_name, 
                 COALESCE(report_date::timestamp, uploaded_at, source_created_at) DESC NULLS LAST,
                 source_report_id ASC
      ) sub) AS best_full_price,
      -- CRITICAL FIX: Get max of LATEST prices per distributor, not max of ALL prices
      (SELECT MAX(latest_price) FROM (
        SELECT DISTINCT ON (distributor_name) price_per_unit AS latest_price
        FROM ndc_pricing_index 
        WHERE ndc_normalized = u.ndc_normalized AND is_partial_record = TRUE
        ORDER BY distributor_name, 
                 COALESCE(report_date::timestamp, uploaded_at, source_created_at) DESC NULLS LAST,
                 source_report_id ASC
      ) sub) AS best_partial_price,
      (SELECT MAX(updated_at) FROM ndc_pricing_index WHERE ndc_normalized = u.ndc_normalized) AS last_updated
    FROM unique_ndcs u
  )
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'ndc', a.ndc_original,
      'ndcNormalized', a.ndc_normalized,
      'productName', a.product_name,
      'distributors', COALESCE(a.distributors, '[]'::jsonb),
      'bestFullPrice', COALESCE(a.best_full_price, 0),
      'bestPartialPrice', COALESCE(a.best_partial_price, 0),
      'lastUpdated', a.last_updated
    )
  ), '[]'::jsonb) INTO v_results
  FROM aggregated a;

  RETURN jsonb_build_object(
    'data', v_results,
    'total', v_total,
    'limit', p_limit,
    'offset', p_offset
  );
END;
$function$;
