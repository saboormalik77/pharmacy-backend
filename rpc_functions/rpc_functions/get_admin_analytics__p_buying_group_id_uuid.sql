-- Function : get_admin_analytics
-- Arguments: p_buying_group_id uuid
-- Type     : FUNCTION
-- =============================================================

DROP FUNCTION IF EXISTS public.get_admin_analytics(p_buying_group_id uuid) CASCADE;

CREATE OR REPLACE FUNCTION public.get_admin_analytics(p_buying_group_id uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_result JSONB;

  v_total_returns_value NUMERIC;
  v_total_returns INTEGER;
  v_avg_return_value NUMERIC;
  v_active_pharmacies INTEGER;

  v_current_month_value NUMERIC;
  v_current_month_returns INTEGER;
  v_current_month_pharmacies INTEGER;

  v_last_month_returns_value NUMERIC;
  v_last_month_returns INTEGER;
  v_last_month_pharmacies INTEGER;

  v_returns_value_change NUMERIC;
  v_total_returns_change NUMERIC;
  v_avg_value_change NUMERIC;
  v_pharmacies_change NUMERIC;

  v_returns_value_trend JSONB;
  v_top_products JSONB;
  v_distributor_breakdown JSONB;
  v_state_breakdown JSONB;

  v_current_month_start DATE;
  v_last_month_start DATE;
  v_last_month_end DATE;
  v_twelve_months_ago DATE;
BEGIN
  v_current_month_start := DATE_TRUNC('month', CURRENT_DATE)::DATE;
  v_last_month_start    := (DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '1 month')::DATE;
  v_last_month_end      := (DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '1 day')::DATE;
  v_twelve_months_ago   := (DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '11 months')::DATE;

  -- 1. ALL-TIME key metrics
  SELECT
    COALESCE(SUM(COALESCE(rt.total_returnable_value, 0) + COALESCE(rt.total_non_returnable_value, 0)), 0),
    COUNT(rt.id)::INTEGER,
    CASE WHEN COUNT(rt.id) > 0
         THEN ROUND(SUM(COALESCE(rt.total_returnable_value, 0) + COALESCE(rt.total_non_returnable_value, 0)) / COUNT(rt.id), 2)
         ELSE 0 END
  INTO v_total_returns_value, v_total_returns, v_avg_return_value
  FROM return_transactions rt
  INNER JOIN pharmacy p ON p.id = rt.pharmacy_id
  WHERE (p_buying_group_id IS NULL OR p.created_by = p_buying_group_id);

  SELECT COUNT(DISTINCT p.id)::INTEGER
  INTO v_active_pharmacies
  FROM pharmacy p
  WHERE (p_buying_group_id IS NULL OR p.created_by = p_buying_group_id);

  -- 2. CURRENT MONTH metrics
  SELECT
    COALESCE(SUM(COALESCE(rt.total_returnable_value, 0) + COALESCE(rt.total_non_returnable_value, 0)), 0),
    COUNT(rt.id)::INTEGER,
    COUNT(DISTINCT rt.pharmacy_id)::INTEGER
  INTO v_current_month_value, v_current_month_returns, v_current_month_pharmacies
  FROM return_transactions rt
  INNER JOIN pharmacy p ON p.id = rt.pharmacy_id
  WHERE rt.created_at >= v_current_month_start
    AND (p_buying_group_id IS NULL OR p.created_by = p_buying_group_id);

  -- 3. LAST MONTH metrics
  SELECT
    COALESCE(SUM(COALESCE(rt.total_returnable_value, 0) + COALESCE(rt.total_non_returnable_value, 0)), 0),
    COUNT(rt.id)::INTEGER,
    COUNT(DISTINCT rt.pharmacy_id)::INTEGER
  INTO v_last_month_returns_value, v_last_month_returns, v_last_month_pharmacies
  FROM return_transactions rt
  INNER JOIN pharmacy p ON p.id = rt.pharmacy_id
  WHERE rt.created_at >= v_last_month_start
    AND rt.created_at < v_current_month_start
    AND (p_buying_group_id IS NULL OR p.created_by = p_buying_group_id);

  -- 4. PERCENTAGE CHANGES
  v_returns_value_change := CASE
    WHEN v_last_month_returns_value > 0
    THEN ROUND(((v_current_month_value - v_last_month_returns_value) / v_last_month_returns_value) * 100, 1)
    WHEN v_current_month_value > 0 THEN 100
    ELSE 0 END;

  v_total_returns_change := CASE
    WHEN v_last_month_returns > 0
    THEN ROUND(((v_current_month_returns - v_last_month_returns)::NUMERIC / v_last_month_returns) * 100, 1)
    WHEN v_current_month_returns > 0 THEN 100
    ELSE 0 END;

  v_avg_value_change := CASE
    WHEN v_last_month_returns > 0 AND v_last_month_returns_value > 0
    THEN ROUND((
      ((v_current_month_value / GREATEST(v_current_month_returns, 1)) -
       (v_last_month_returns_value / v_last_month_returns)) /
      (v_last_month_returns_value / v_last_month_returns)
    ) * 100, 1)
    ELSE 0 END;

  v_pharmacies_change := CASE
    WHEN v_last_month_pharmacies > 0
    THEN ROUND(((v_current_month_pharmacies - v_last_month_pharmacies)::NUMERIC / v_last_month_pharmacies) * 100, 1)
    WHEN v_current_month_pharmacies > 0 THEN 100
    ELSE 0 END;

  -- 5. RETURNS VALUE TREND (last 12 months)
  WITH months AS (
    SELECT generate_series(
      v_twelve_months_ago,
      v_current_month_start,
      '1 month'::INTERVAL
    )::DATE AS month_start
  ),
  monthly_data AS (
    SELECT
      DATE_TRUNC('month', rt.created_at)::DATE AS month_start,
      COUNT(rt.id)::INTEGER AS returns_count,
      COALESCE(SUM(COALESCE(rt.total_returnable_value, 0) + COALESCE(rt.total_non_returnable_value, 0)), 0) AS total_value,
      COUNT(DISTINCT rt.pharmacy_id)::INTEGER AS pharmacies_count,
      COALESCE(SUM(rt.total_items), 0)::INTEGER AS items_count
    FROM return_transactions rt
    INNER JOIN pharmacy p ON p.id = rt.pharmacy_id
    WHERE rt.created_at >= v_twelve_months_ago
      AND (p_buying_group_id IS NULL OR p.created_by = p_buying_group_id)
    GROUP BY DATE_TRUNC('month', rt.created_at)::DATE
  )
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'month', TO_CHAR(m.month_start, 'Mon YYYY'),
      'monthKey', TO_CHAR(m.month_start, 'YYYY-MM'),
      'returnsCount', COALESCE(md.returns_count, 0),
      'totalValue', COALESCE(md.total_value, 0),
      'pharmaciesCount', COALESCE(md.pharmacies_count, 0),
      'itemsCount', COALESCE(md.items_count, 0)
    ) ORDER BY m.month_start
  ), '[]'::jsonb)
  INTO v_returns_value_trend
  FROM months m
  LEFT JOIN monthly_data md ON m.month_start = md.month_start;

  -- 6. TOP 5 PRODUCTS BY RETURNS VALUE (with OR-precedence fix)
  WITH product_returns AS (
    SELECT
      COALESCE(
        NULLIF(TRIM(rti.proprietary_name), ''),
        NULLIF(TRIM(rti.generic_name), ''),
        'Unknown Product'
      ) AS product_name,
      SUM(COALESCE(rti.estimated_value, 0)) AS total_value,
      SUM(COALESCE(rti.quantity, 1)) AS total_quantity,
      COUNT(*) AS return_count
    FROM return_transaction_items rti
    INNER JOIN return_transactions rt ON rt.id = rti.transaction_id
    INNER JOIN pharmacy p ON p.id = rt.pharmacy_id
    WHERE ((rti.proprietary_name IS NOT NULL AND TRIM(rti.proprietary_name) != '')
       OR (rti.generic_name IS NOT NULL AND TRIM(rti.generic_name) != ''))
      AND (p_buying_group_id IS NULL OR p.created_by = p_buying_group_id)
    GROUP BY COALESCE(
      NULLIF(TRIM(rti.proprietary_name), ''),
      NULLIF(TRIM(rti.generic_name), ''),
      'Unknown Product'
    )
    ORDER BY total_value DESC
    LIMIT 5
  )
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'productName', pr.product_name,
      'totalValue', ROUND(pr.total_value, 2),
      'totalQuantity', pr.total_quantity,
      'returnCount', pr.return_count
    ) ORDER BY pr.total_value DESC
  ), '[]'::jsonb)
  INTO v_top_products
  FROM product_returns pr;

  -- 7. DISTRIBUTOR BREAKDOWN
  WITH distributor_stats AS (
    SELECT
      rd.id AS distributor_id,
      rd.name AS distributor_name,
      COUNT(DISTINCT rt.pharmacy_id)::INTEGER AS pharmacies_count,
      COUNT(rt.id)::INTEGER AS total_returns,
      COALESCE(SUM(COALESCE(rt.total_returnable_value, 0) + COALESCE(rt.total_non_returnable_value, 0)), 0) AS total_value
    FROM reverse_distributors rd
    INNER JOIN uploaded_documents ud ON ud.reverse_distributor_id = rd.id
    INNER JOIN return_transactions rt ON rt.pharmacy_id = ud.pharmacy_id
    INNER JOIN pharmacy p ON p.id = rt.pharmacy_id
    WHERE (p_buying_group_id IS NULL OR p.created_by = p_buying_group_id)
    GROUP BY rd.id, rd.name
  )
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'distributorId', ds.distributor_id,
      'distributorName', ds.distributor_name,
      'pharmaciesCount', ds.pharmacies_count,
      'totalReturns', ds.total_returns,
      'totalValue', ROUND(ds.total_value, 2)
    ) ORDER BY ds.total_value DESC
  ), '[]'::jsonb)
  INTO v_distributor_breakdown
  FROM distributor_stats ds;

  -- 8. STATE BREAKDOWN
  WITH state_stats AS (
    SELECT
      CASE 
        WHEN p.physical_address IS NULL THEN 'Unknown'
        WHEN p.physical_address->>'state' IS NULL THEN 'Unknown'
        WHEN TRIM(p.physical_address->>'state') = '' THEN 'Unknown'
        ELSE UPPER(TRIM(p.physical_address->>'state'))
      END AS state_code,
      COUNT(DISTINCT p.id)::INTEGER AS pharmacies_count,
      COUNT(rt.id)::INTEGER AS total_returns,
      COALESCE(SUM(COALESCE(rt.total_returnable_value, 0) + COALESCE(rt.total_non_returnable_value, 0)), 0) AS total_value
    FROM pharmacy p
    INNER JOIN return_transactions rt ON rt.pharmacy_id = p.id
    WHERE (p_buying_group_id IS NULL OR p.created_by = p_buying_group_id)
    GROUP BY CASE 
      WHEN p.physical_address IS NULL THEN 'Unknown'
      WHEN p.physical_address->>'state' IS NULL THEN 'Unknown'
      WHEN TRIM(p.physical_address->>'state') = '' THEN 'Unknown'
      ELSE UPPER(TRIM(p.physical_address->>'state'))
    END
  )
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'state', ss.state_code,
      'pharmaciesCount', ss.pharmacies_count,
      'totalReturns', ss.total_returns,
      'totalValue', ROUND(ss.total_value, 2)
    ) ORDER BY ss.total_value DESC
  ), '[]'::jsonb)
  INTO v_state_breakdown
  FROM state_stats ss;

  -- BUILD RESULT
  v_result := jsonb_build_object(
    'keyMetrics', jsonb_build_object(
      'totalReturnsValue', jsonb_build_object(
        'value', ROUND(v_total_returns_value, 2),
        'change', v_returns_value_change,
        'changeLabel', 'vs last month'
      ),
      'totalReturns', jsonb_build_object(
        'value', v_total_returns,
        'change', v_total_returns_change,
        'changeLabel', 'vs last month'
      ),
      'avgReturnValue', jsonb_build_object(
        'value', v_avg_return_value,
        'change', v_avg_value_change,
        'changeLabel', 'vs last month'
      ),
      'activePharmacies', jsonb_build_object(
        'value', v_active_pharmacies,
        'change', v_pharmacies_change,
        'changeLabel', 'vs last month'
      )
    ),
    'charts', jsonb_build_object(
      'returnsValueTrend', v_returns_value_trend,
      'topProducts', v_top_products
    ),
    'distributorBreakdown', v_distributor_breakdown,
    'stateBreakdown', v_state_breakdown,
    'scope', jsonb_build_object(
      'buyingGroupId', p_buying_group_id,
      'isGlobal', p_buying_group_id IS NULL
    ),
    'generatedAt', NOW()
  );

  RETURN v_result;
END;
$function$;
