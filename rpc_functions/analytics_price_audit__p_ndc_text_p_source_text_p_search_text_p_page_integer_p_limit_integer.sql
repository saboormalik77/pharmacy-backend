-- Function : analytics_price_audit
-- Arguments: p_ndc text, p_source text, p_search text, p_page integer, p_limit integer
-- Type     : FUNCTION
-- =============================================================

DROP FUNCTION IF EXISTS public.analytics_price_audit(p_ndc text, p_source text, p_search text, p_page integer, p_limit integer) CASCADE;

CREATE OR REPLACE FUNCTION public.analytics_price_audit(p_ndc text DEFAULT NULL::text, p_source text DEFAULT NULL::text, p_search text DEFAULT NULL::text, p_page integer DEFAULT 1, p_limit integer DEFAULT 50)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
AS $function$
DECLARE
  v_offset  INTEGER;
  v_total   INTEGER;
  v_rows    jsonb;
  v_summary jsonb;
BEGIN
  v_offset := (GREATEST(p_page, 1) - 1) * p_limit;

  -- Summary
  SELECT jsonb_build_object(
    'totalChanges',     COUNT(*),
    'uniqueNdcs',       COUNT(DISTINCT nph.ndc),
    'uniqueSources',    COUNT(DISTINCT nph.price_source),
    'avgPriceIncrease', ROUND(COALESCE(AVG(
      CASE WHEN nph.old_price IS NOT NULL AND nph.old_price > 0
        THEN ((nph.new_price - nph.old_price) / nph.old_price) * 100
        ELSE NULL END
    ), 0), 2)
  )
  INTO v_summary
  FROM ndc_price_history nph
  WHERE (p_ndc IS NULL OR nph.ndc = p_ndc)
    AND (p_source IS NULL OR nph.price_source = p_source)
    AND (p_search IS NULL OR (
      nph.ndc LIKE '%' || p_search || '%'
      OR LOWER(COALESCE(nph.price_source, '')) LIKE '%' || LOWER(p_search) || '%'
    ));

  -- Count
  SELECT COUNT(*) INTO v_total
  FROM ndc_price_history nph
  WHERE (p_ndc IS NULL OR nph.ndc = p_ndc)
    AND (p_source IS NULL OR nph.price_source = p_source)
    AND (p_search IS NULL OR (
      nph.ndc LIKE '%' || p_search || '%'
      OR LOWER(COALESCE(nph.price_source, '')) LIKE '%' || LOWER(p_search) || '%'
    ));

  -- Data rows
  SELECT COALESCE(jsonb_agg(row_data ORDER BY changed_at DESC), '[]'::jsonb)
  INTO v_rows
  FROM (
    SELECT jsonb_build_object(
      'id',           nph.id,
      'ndc',          nph.ndc,
      'oldPrice',     nph.old_price,
      'newPrice',     nph.new_price,
      'priceChange',  CASE WHEN nph.old_price IS NOT NULL THEN nph.new_price - nph.old_price ELSE NULL END,
      'changePercent', CASE WHEN nph.old_price IS NOT NULL AND nph.old_price > 0
                         THEN ROUND(((nph.new_price - nph.old_price) / nph.old_price) * 100, 2)
                         ELSE NULL END,
      'priceSource',  nph.price_source,
      'changedBy',    nph.changed_by,
      'changedAt',    nph.changed_at
    ) AS row_data,
    nph.changed_at
    FROM ndc_price_history nph
    WHERE (p_ndc IS NULL OR nph.ndc = p_ndc)
      AND (p_source IS NULL OR nph.price_source = p_source)
      AND (p_search IS NULL OR (
        nph.ndc LIKE '%' || p_search || '%'
        OR LOWER(COALESCE(nph.price_source, '')) LIKE '%' || LOWER(p_search) || '%'
      ))
    ORDER BY nph.changed_at DESC
    LIMIT p_limit OFFSET v_offset
  ) sub;

  RETURN jsonb_build_object(
    'error', false,
    'data', v_rows,
    'summary', v_summary,
    'pagination', jsonb_build_object(
      'page', p_page, 'limit', p_limit, 'total', v_total,
      'totalPages', CEIL(GREATEST(v_total, 1)::float / p_limit)::integer
    )
  );
END;
$function$;
