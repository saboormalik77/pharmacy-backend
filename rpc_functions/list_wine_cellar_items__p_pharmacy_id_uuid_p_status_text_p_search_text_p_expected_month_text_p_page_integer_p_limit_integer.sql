-- Function : list_wine_cellar_items
-- Arguments: p_pharmacy_id uuid, p_status text, p_search text, p_expected_month text, p_page integer, p_limit integer
-- Type     : FUNCTION
-- =============================================================

DROP FUNCTION IF EXISTS public.list_wine_cellar_items(p_pharmacy_id uuid, p_status text, p_search text, p_expected_month text, p_page integer, p_limit integer) CASCADE;

CREATE OR REPLACE FUNCTION public.list_wine_cellar_items(p_pharmacy_id uuid DEFAULT NULL::uuid, p_status text DEFAULT NULL::text, p_search text DEFAULT NULL::text, p_expected_month text DEFAULT NULL::text, p_page integer DEFAULT 1, p_limit integer DEFAULT 50)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
AS $function$
DECLARE
  v_offset         INT;
  v_total          INT;
  v_rows           jsonb;
  v_total_shelved  INT;
  v_total_ready    INT;
  v_total_value    DECIMAL(12,2);
  v_month_start    DATE;
  v_month_end      DATE;
BEGIN
  v_offset := (GREATEST(p_page, 1) - 1) * LEAST(p_limit, 100);

  -- Parse expected_month filter
  IF p_expected_month IS NOT NULL AND p_expected_month <> '' THEN
    v_month_start := (p_expected_month || '-01')::DATE;
    v_month_end   := (v_month_start + INTERVAL '1 month')::DATE;
  END IF;

  -- Count total matching
  SELECT COUNT(*) INTO v_total
    FROM wine_cellar w
   WHERE (p_pharmacy_id IS NULL OR w.pharmacy_id = p_pharmacy_id)
     AND (p_status IS NULL      OR w.status = p_status)
     AND (p_search IS NULL      OR p_search = '' OR (
           w.ndc            ILIKE '%' || p_search || '%' OR
           w.product_name   ILIKE '%' || p_search || '%' OR
           w.manufacturer   ILIKE '%' || p_search || '%' OR
           w.lot_number     ILIKE '%' || p_search || '%' OR
           w.baggie_barcode ILIKE '%' || p_search || '%'
         ))
     AND (v_month_start IS NULL OR (
           w.expected_returnable_date >= v_month_start
           AND w.expected_returnable_date < v_month_end
         ));

  -- Fetch rows
  SELECT COALESCE(jsonb_agg(row_json ORDER BY date_shelved DESC), '[]'::jsonb)
    INTO v_rows
    FROM (
      SELECT _wc_to_json(w) AS row_json, w.date_shelved
        FROM wine_cellar w
       WHERE (p_pharmacy_id IS NULL OR w.pharmacy_id = p_pharmacy_id)
         AND (p_status IS NULL      OR w.status = p_status)
         AND (p_search IS NULL      OR p_search = '' OR (
               w.ndc            ILIKE '%' || p_search || '%' OR
               w.product_name   ILIKE '%' || p_search || '%' OR
               w.manufacturer   ILIKE '%' || p_search || '%' OR
               w.lot_number     ILIKE '%' || p_search || '%' OR
               w.baggie_barcode ILIKE '%' || p_search || '%'
             ))
         AND (v_month_start IS NULL OR (
               w.expected_returnable_date >= v_month_start
               AND w.expected_returnable_date < v_month_end
             ))
       ORDER BY w.date_shelved DESC
       LIMIT LEAST(p_limit, 100)
      OFFSET v_offset
    ) sub;

  -- Summary stats (across ALL matching, not just current page)
  SELECT
    COALESCE(COUNT(*) FILTER (WHERE w.status = 'shelved'), 0),
    COALESCE(COUNT(*) FILTER (WHERE w.status = 'ready_to_return'), 0),
    COALESCE(SUM(w.estimated_value) FILTER (WHERE w.status IN ('shelved', 'ready_to_return')), 0)
  INTO v_total_shelved, v_total_ready, v_total_value
    FROM wine_cellar w
   WHERE (p_pharmacy_id IS NULL OR w.pharmacy_id = p_pharmacy_id)
     AND (p_status IS NULL      OR w.status = p_status)
     AND (p_search IS NULL      OR p_search = '' OR (
           w.ndc            ILIKE '%' || p_search || '%' OR
           w.product_name   ILIKE '%' || p_search || '%' OR
           w.manufacturer   ILIKE '%' || p_search || '%' OR
           w.lot_number     ILIKE '%' || p_search || '%' OR
           w.baggie_barcode ILIKE '%' || p_search || '%'
         ))
     AND (v_month_start IS NULL OR (
           w.expected_returnable_date >= v_month_start
           AND w.expected_returnable_date < v_month_end
         ));

  RETURN jsonb_build_object(
    'error', false,
    'data', jsonb_build_object(
      'items',   v_rows,
      'summary', jsonb_build_object(
        'totalItems',   v_total,
        'totalShelved', v_total_shelved,
        'totalReady',   v_total_ready,
        'totalValue',   v_total_value
      ),
      'pagination', jsonb_build_object(
        'page',       GREATEST(p_page, 1),
        'limit',      LEAST(p_limit, 100),
        'total',      v_total,
        'totalPages', CEIL(v_total::DECIMAL / LEAST(p_limit, 100))
      )
    )
  );
END;
$function$;
