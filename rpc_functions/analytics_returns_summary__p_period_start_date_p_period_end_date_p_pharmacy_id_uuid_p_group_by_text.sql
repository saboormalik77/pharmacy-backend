-- Function : analytics_returns_summary
-- Arguments: p_period_start date, p_period_end date, p_pharmacy_id uuid, p_group_by text
-- Type     : FUNCTION
-- =============================================================

DROP FUNCTION IF EXISTS public.analytics_returns_summary(p_period_start date, p_period_end date, p_pharmacy_id uuid, p_group_by text) CASCADE;

CREATE OR REPLACE FUNCTION public.analytics_returns_summary(p_period_start date DEFAULT NULL::date, p_period_end date DEFAULT NULL::date, p_pharmacy_id uuid DEFAULT NULL::uuid, p_group_by text DEFAULT 'month'::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
AS $function$
DECLARE
  v_start  DATE;
  v_end    DATE;
  v_overall jsonb;
  v_by_status jsonb;
  v_trend   jsonb;
BEGIN
  v_start := COALESCE(p_period_start, CURRENT_DATE - INTERVAL '12 months');
  v_end   := COALESCE(p_period_end,   CURRENT_DATE);

  -- Overall summary
  SELECT jsonb_build_object(
    'totalReturns',           COUNT(*),
    'totalReturnableValue',   COALESCE(SUM(rt.total_returnable_value), 0),
    'totalNonReturnableValue',COALESCE(SUM(rt.total_non_returnable_value), 0),
    'totalItems',             COALESCE(SUM(rt.total_items), 0),
    'avgItemsPerReturn',      ROUND(COALESCE(AVG(rt.total_items), 0), 1),
    'avgReturnValue',         ROUND(COALESCE(AVG(rt.total_returnable_value), 0), 2),
    'uniquePharmacies',       COUNT(DISTINCT rt.pharmacy_id)
  )
  INTO v_overall
  FROM return_transactions rt
  WHERE rt.created_at::date BETWEEN v_start AND v_end
    AND (p_pharmacy_id IS NULL OR rt.pharmacy_id = p_pharmacy_id);

  -- By status
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'status',  status_data,
      'count',   count_data,
      'totalReturnableValue', total_value_data
    )
  ), '[]'::jsonb)
  INTO v_by_status
  FROM (
    SELECT
      rt.status AS status_data,
      COUNT(*) AS count_data,
      COALESCE(SUM(rt.total_returnable_value), 0) AS total_value_data
    FROM return_transactions rt
    WHERE rt.created_at::date BETWEEN v_start AND v_end
      AND (p_pharmacy_id IS NULL OR rt.pharmacy_id = p_pharmacy_id)
    GROUP BY rt.status
  ) status_summary;

  -- Trend by period
  IF p_group_by = 'week' THEN
    SELECT COALESCE(jsonb_agg(
      jsonb_build_object(
        'period',     period_data,
        'periodKey',  period_key_data,
        'returns',    returns_data,
        'totalValue', total_value_data,
        'totalItems', total_items_data
      ) ORDER BY period_key_data
    ), '[]'::jsonb)
    INTO v_trend
    FROM (
      SELECT
        TO_CHAR(DATE_TRUNC('week', rt.created_at), 'YYYY-"W"IW') AS period_data,
        TO_CHAR(DATE_TRUNC('week', rt.created_at), 'YYYY-"W"IW') AS period_key_data,
        COUNT(*) AS returns_data,
        COALESCE(SUM(rt.total_returnable_value), 0) AS total_value_data,
        COALESCE(SUM(rt.total_items), 0) AS total_items_data
      FROM return_transactions rt
      WHERE rt.created_at::date BETWEEN v_start AND v_end
        AND (p_pharmacy_id IS NULL OR rt.pharmacy_id = p_pharmacy_id)
      GROUP BY DATE_TRUNC('week', rt.created_at)
    ) trend_data;
  ELSIF p_group_by = 'status' THEN
    -- Already handled above
    v_trend := v_by_status;
  ELSIF p_group_by = 'service_type' THEN
    SELECT COALESCE(jsonb_agg(
      jsonb_build_object(
        'serviceType', service_type_data,
        'returns',     returns_data,
        'totalValue',  total_value_data,
        'totalItems',  total_items_data
      ) ORDER BY service_type_data
    ), '[]'::jsonb)
    INTO v_trend
    FROM (
      SELECT
        rt.service_type AS service_type_data,
        COUNT(*) AS returns_data,
        COALESCE(SUM(rt.total_returnable_value), 0) AS total_value_data,
        COALESCE(SUM(rt.total_items), 0) AS total_items_data
      FROM return_transactions rt
      WHERE rt.created_at::date BETWEEN v_start AND v_end
        AND (p_pharmacy_id IS NULL OR rt.pharmacy_id = p_pharmacy_id)
      GROUP BY rt.service_type
    ) trend_data;
  ELSE
    -- Default: month
    SELECT COALESCE(jsonb_agg(
      jsonb_build_object(
        'period',     period_data,
        'periodKey',  period_key_data,
        'returns',    returns_data,
        'totalValue', total_value_data,
        'totalItems', total_items_data
      ) ORDER BY period_key_data
    ), '[]'::jsonb)
    INTO v_trend
    FROM (
      SELECT
        TO_CHAR(DATE_TRUNC('month', rt.created_at), 'Mon YYYY') AS period_data,
        TO_CHAR(DATE_TRUNC('month', rt.created_at), 'YYYY-MM') AS period_key_data,
        COUNT(*) AS returns_data,
        COALESCE(SUM(rt.total_returnable_value), 0) AS total_value_data,
        COALESCE(SUM(rt.total_items), 0) AS total_items_data
      FROM return_transactions rt
      WHERE rt.created_at::date BETWEEN v_start AND v_end
        AND (p_pharmacy_id IS NULL OR rt.pharmacy_id = p_pharmacy_id)
      GROUP BY DATE_TRUNC('month', rt.created_at)
    ) trend_data;
  END IF;

  RETURN jsonb_build_object(
    'error', false,
    'data', jsonb_build_object(
      'periodStart', v_start,
      'periodEnd',   v_end,
      'groupBy',     p_group_by,
      'overall',     v_overall,
      'byStatus',    v_by_status,
      'trend',       v_trend
    )
  );
END;
$function$;
