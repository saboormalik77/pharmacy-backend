-- Function : search_ndc_pricing_book
-- Arguments: p_search text, p_page integer, p_limit integer, p_sort_by text, p_sort_order text
-- Type     : FUNCTION
-- =============================================================

DROP FUNCTION IF EXISTS public.search_ndc_pricing_book(p_search text, p_page integer, p_limit integer, p_sort_by text, p_sort_order text) CASCADE;

CREATE OR REPLACE FUNCTION public.search_ndc_pricing_book(p_search text DEFAULT ''::text, p_page integer DEFAULT 1, p_limit integer DEFAULT 25, p_sort_by text DEFAULT 'updated_at'::text, p_sort_order text DEFAULT 'desc'::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
AS $function$
DECLARE
  v_search   TEXT;
  v_offset   INTEGER;
  v_total    INTEGER;
  v_items    jsonb;
  v_sort_col TEXT;
  v_sort_dir TEXT;
BEGIN
  v_search := LOWER(REPLACE(TRIM(COALESCE(p_search, '')), '-', ''));
  v_offset := (GREATEST(p_page, 1) - 1) * p_limit;

  v_sort_col := CASE p_sort_by
    WHEN 'ndc' THEN 'ndc_normalized'
    WHEN 'productName' THEN 'product_name'
    WHEN 'manufacturer' THEN 'manufacturer'
    WHEN 'currentPrice' THEN 'current_price'
    WHEN 'updatedAt' THEN 'updated_at'
    ELSE 'updated_at'
  END;
  v_sort_dir := CASE WHEN LOWER(p_sort_order) = 'asc' THEN 'ASC' ELSE 'DESC' END;

  IF v_search = '' THEN
    SELECT COUNT(*) INTO v_total FROM ndc_pricing;

    EXECUTE format(
      'SELECT COALESCE(jsonb_agg(_ndc_pricing_to_json(t)), ''[]''::jsonb)
       FROM (SELECT * FROM ndc_pricing ORDER BY %I %s LIMIT $1 OFFSET $2) t',
      v_sort_col, v_sort_dir
    ) INTO v_items USING p_limit, v_offset;
  ELSE
    SELECT COUNT(*) INTO v_total
    FROM ndc_pricing
      WHERE ndc_normalized LIKE v_search || '%'
         OR LOWER(product_name) LIKE '%' || v_search || '%';

    EXECUTE format(
      'SELECT COALESCE(jsonb_agg(_ndc_pricing_to_json(t)), ''[]''::jsonb)
       FROM (
         SELECT * FROM ndc_pricing
         WHERE ndc_normalized LIKE $3 || ''%%''
            OR LOWER(product_name) LIKE ''%%'' || $3 || ''%%''
         ORDER BY %I %s
         LIMIT $1 OFFSET $2
       ) t',
      v_sort_col, v_sort_dir
    ) INTO v_items USING p_limit, v_offset, v_search;
  END IF;

  RETURN jsonb_build_object(
    'error', false,
    'data', jsonb_build_object(
      'items', COALESCE(v_items, '[]'::jsonb),
      'pagination', jsonb_build_object(
        'page', p_page,
        'limit', p_limit,
        'total', v_total,
        'totalPages', CEIL(v_total::DECIMAL / p_limit)
      )
    )
  );
END;
$function$;
