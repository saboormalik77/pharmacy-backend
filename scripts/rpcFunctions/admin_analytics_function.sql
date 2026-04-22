-- ============================================================
-- Admin Analytics RPC Function
-- Returns all analytics data for the admin dashboard in a single call
-- ============================================================
-- IMPORTANT: Each record in return_reports stores ONE ITEM directly in the data field
-- Structure: data = { ndcCode, itemName, creditAmount, quantity, ... }
-- NOT: data = { items: [...] }
-- ============================================================
-- DATE FIELD USAGE:
-- All month-based calculations use return_reports.created_at to determine
-- which month each record belongs to (when the return report item was created)
-- ============================================================
-- MULTI-TENANT (BUYING GROUP) SCOPING:
-- p_buying_group_id NULL  → MainAdmin: shows global (all tenants) analytics
-- p_buying_group_id set   → Buying-group admin: restricted to pharmacies
--                           where pharmacy.created_by = p_buying_group_id
-- Tenant filter propagates through:
--   * return_reports via pharmacy_id -> pharmacy.created_by
--   * uploaded_documents via pharmacy_id -> pharmacy.created_by
--   * reverse_distributors: only those referenced by this tenant's uploads
--   * pharmacy direct count (created_by)
--   * state_breakdown via pharmacy.created_by
-- ============================================================
-- Data includes:
-- 1. Key Metrics (with % change vs last month)
-- 2. Returns Value Trend (past 12 months)
-- 3. Top 5 Products by Returns Value
-- 4. Distributor Breakdown (returns by distributor)
-- 5. State Breakdown (returns by pharmacy state)
-- ============================================================

DROP FUNCTION IF EXISTS get_admin_analytics();
DROP FUNCTION IF EXISTS get_admin_analytics(UUID);

CREATE OR REPLACE FUNCTION get_admin_analytics(
  p_buying_group_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result JSONB;
  
  -- Key Metrics - All time totals
  v_total_returns_value NUMERIC;
  v_total_returns INTEGER;
  v_avg_return_value NUMERIC;
  v_active_pharmacies INTEGER;  -- All pharmacies in scope
  
  -- Key Metrics - Current month
  v_current_month_value NUMERIC;
  v_current_month_returns INTEGER;
  v_current_month_pharmacies INTEGER;
  
  -- Key Metrics - Last Month (for % change calculation)
  v_last_month_returns_value NUMERIC;
  v_last_month_returns INTEGER;
  v_last_month_pharmacies INTEGER;
  
  -- Percentage Changes
  v_returns_value_change NUMERIC;
  v_total_returns_change NUMERIC;
  v_avg_value_change NUMERIC;
  v_pharmacies_change NUMERIC;
  
  -- Charts
  v_returns_value_trend JSONB;
  v_top_products JSONB;
  v_distributor_breakdown JSONB;
  v_state_breakdown JSONB;
  
  -- Date boundaries
  v_current_month_start DATE;
  v_last_month_start DATE;
  v_last_month_end DATE;
  v_twelve_months_ago DATE;
BEGIN
  -- Calculate date boundaries
  v_current_month_start := DATE_TRUNC('month', CURRENT_DATE)::DATE;
  v_last_month_start := (DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '1 month')::DATE;
  v_last_month_end := (DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '1 day')::DATE;
  v_twelve_months_ago := (DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '11 months')::DATE;

  -- ============================================================
  -- 1. KEY METRICS - ALL TIME TOTALS (scoped to buying group)
  -- Each record in return_reports is ONE item, data field contains item directly
  -- ============================================================
  
  -- Total Returns Value (sum of creditAmount from each record's data)
  SELECT COALESCE(SUM(
    COALESCE((rr.data->>'creditAmount')::NUMERIC, 0)
  ), 0)
  INTO v_total_returns_value
  FROM return_reports rr
  INNER JOIN pharmacy p ON p.id = rr.pharmacy_id
  WHERE (p_buying_group_id IS NULL OR p.created_by = p_buying_group_id);

  -- Total Returns Count (each record = 1 item)
  SELECT COUNT(*)::INTEGER
  INTO v_total_returns
  FROM return_reports rr
  INNER JOIN pharmacy p ON p.id = rr.pharmacy_id
  WHERE (p_buying_group_id IS NULL OR p.created_by = p_buying_group_id);

  -- Average Return Value
  v_avg_return_value := CASE WHEN v_total_returns > 0 THEN ROUND(v_total_returns_value / v_total_returns, 2) ELSE 0 END;

  -- Active Pharmacies (all pharmacies in scope)
  SELECT COUNT(*)::INTEGER
  INTO v_active_pharmacies
  FROM pharmacy p
  WHERE (p_buying_group_id IS NULL OR p.created_by = p_buying_group_id);

  -- ============================================================
  -- 2. CURRENT MONTH METRICS
  -- ============================================================
  
  -- Current month returns value
  SELECT COALESCE(SUM(
    COALESCE((rr.data->>'creditAmount')::NUMERIC, 0)
  ), 0)
  INTO v_current_month_value
  FROM return_reports rr
  INNER JOIN pharmacy p ON p.id = rr.pharmacy_id
  WHERE rr.created_at >= v_current_month_start
    AND (p_buying_group_id IS NULL OR p.created_by = p_buying_group_id);

  -- Current month returns count
  SELECT COUNT(*)::INTEGER
  INTO v_current_month_returns
  FROM return_reports rr
  INNER JOIN pharmacy p ON p.id = rr.pharmacy_id
  WHERE rr.created_at >= v_current_month_start
    AND (p_buying_group_id IS NULL OR p.created_by = p_buying_group_id);

  -- Current month pharmacies (pharmacies created in current month)
  SELECT COUNT(*)::INTEGER
  INTO v_current_month_pharmacies
  FROM pharmacy p
  WHERE p.created_at >= v_current_month_start
    AND (p_buying_group_id IS NULL OR p.created_by = p_buying_group_id);

  -- ============================================================
  -- 3. LAST MONTH METRICS (for % change calculation)
  -- ============================================================
  
  -- Last month returns value
  SELECT COALESCE(SUM(
    COALESCE((rr.data->>'creditAmount')::NUMERIC, 0)
  ), 0)
  INTO v_last_month_returns_value
  FROM return_reports rr
  INNER JOIN pharmacy p ON p.id = rr.pharmacy_id
  WHERE rr.created_at >= v_last_month_start 
    AND rr.created_at < v_current_month_start
    AND (p_buying_group_id IS NULL OR p.created_by = p_buying_group_id);

  -- Last month returns count
  SELECT COUNT(*)::INTEGER
  INTO v_last_month_returns
  FROM return_reports rr
  INNER JOIN pharmacy p ON p.id = rr.pharmacy_id
  WHERE rr.created_at >= v_last_month_start 
    AND rr.created_at < v_current_month_start
    AND (p_buying_group_id IS NULL OR p.created_by = p_buying_group_id);

  -- Last month pharmacies (pharmacies created in last month)
  SELECT COUNT(*)::INTEGER
  INTO v_last_month_pharmacies
  FROM pharmacy p
  WHERE p.created_at >= v_last_month_start 
    AND p.created_at < v_current_month_start
    AND (p_buying_group_id IS NULL OR p.created_by = p_buying_group_id);

  -- ============================================================
  -- 4. CALCULATE PERCENTAGE CHANGES (current month vs last month)
  -- ============================================================
  
  v_returns_value_change := CASE 
    WHEN v_last_month_returns_value > 0 
    THEN ROUND(((v_current_month_value - v_last_month_returns_value) / v_last_month_returns_value) * 100, 1)
    ELSE 0
  END;

  v_total_returns_change := CASE 
    WHEN v_last_month_returns > 0 
    THEN ROUND(((v_current_month_returns - v_last_month_returns)::NUMERIC / v_last_month_returns) * 100, 1)
    ELSE 0
  END;

  v_avg_value_change := CASE 
    WHEN v_last_month_returns > 0 AND v_last_month_returns_value > 0
    THEN ROUND((((v_current_month_value / NULLIF(v_current_month_returns, 0)) - (v_last_month_returns_value / v_last_month_returns)) / (v_last_month_returns_value / v_last_month_returns)) * 100, 1)
    ELSE 0
  END;

  v_pharmacies_change := CASE 
    WHEN v_last_month_pharmacies > 0 
    THEN ROUND(((v_current_month_pharmacies - v_last_month_pharmacies)::NUMERIC / v_last_month_pharmacies) * 100, 1)
    ELSE 0
  END;

  -- ============================================================
  -- 5. RETURNS VALUE TREND (Past 12 months, scoped to buying group)
  -- Uses report_date from uploaded_documents table (fallback to rr.created_at)
  -- ============================================================
  
  WITH months AS (
    SELECT generate_series(
      v_twelve_months_ago,
      DATE_TRUNC('month', CURRENT_DATE)::DATE,
      '1 month'::interval
    )::DATE AS month_start
  ),
  monthly_data AS (
    SELECT 
      DATE_TRUNC('month', COALESCE(ud.report_date, rr.created_at::DATE))::DATE AS month_start,
      COALESCE(SUM(COALESCE((rr.data->>'creditAmount')::NUMERIC, 0)), 0) AS total_value,
      COUNT(*)::INTEGER AS items_count
    FROM return_reports rr
    INNER JOIN uploaded_documents ud ON ud.id = rr.document_id
    INNER JOIN pharmacy p ON p.id = rr.pharmacy_id
    WHERE COALESCE(ud.report_date, rr.created_at::DATE) >= v_twelve_months_ago
      AND (p_buying_group_id IS NULL OR p.created_by = p_buying_group_id)
    GROUP BY DATE_TRUNC('month', COALESCE(ud.report_date, rr.created_at::DATE))::DATE
  )
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'month', TO_CHAR(m.month_start, 'Mon YYYY'),
      'monthKey', TO_CHAR(m.month_start, 'YYYY-MM'),
      'totalValue', ROUND(COALESCE(md.total_value, 0), 2),
      'itemsCount', COALESCE(md.items_count, 0)
    ) ORDER BY m.month_start
  ), '[]'::jsonb)
  INTO v_returns_value_trend
  FROM months m
  LEFT JOIN monthly_data md ON m.month_start = md.month_start;

  -- ============================================================
  -- 6. TOP 5 PRODUCTS BY RETURNS VALUE (scoped to buying group)
  -- ============================================================
  
  WITH product_returns AS (
    SELECT 
      COALESCE(rr.data->>'itemName', rr.data->>'productDescription', 'Unknown Product') AS product_name,
      SUM(COALESCE((rr.data->>'creditAmount')::NUMERIC, 0)) AS total_value,
      SUM(COALESCE((rr.data->>'quantity')::INTEGER, 1)) AS total_quantity,
      COUNT(*) AS return_count
    FROM return_reports rr
    INNER JOIN pharmacy p ON p.id = rr.pharmacy_id
    WHERE ((rr.data->>'itemName' IS NOT NULL AND rr.data->>'itemName' != '')
        OR (rr.data->>'productDescription' IS NOT NULL AND rr.data->>'productDescription' != ''))
      AND (p_buying_group_id IS NULL OR p.created_by = p_buying_group_id)
    GROUP BY COALESCE(rr.data->>'itemName', rr.data->>'productDescription', 'Unknown Product')
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

  -- ============================================================
  -- 7. DISTRIBUTOR BREAKDOWN (scoped to buying group)
  -- Only distributors referenced by this tenant's uploaded_documents
  -- ============================================================
  
  WITH distributor_stats AS (
    SELECT 
      rd.id AS distributor_id,
      rd.name AS distributor_name,
      COUNT(DISTINCT rr.pharmacy_id)::INTEGER AS pharmacies_count,
      COUNT(rr.id)::INTEGER AS total_returns,
      COALESCE(SUM(COALESCE((rr.data->>'creditAmount')::NUMERIC, 0)), 0) AS total_value
    FROM reverse_distributors rd
    INNER JOIN uploaded_documents ud ON ud.reverse_distributor_id = rd.id
    INNER JOIN return_reports rr ON rr.document_id = ud.id
    INNER JOIN pharmacy p ON p.id = rr.pharmacy_id
    WHERE rd.is_active = true
      AND (p_buying_group_id IS NULL OR p.created_by = p_buying_group_id)
    GROUP BY rd.id, rd.name
    HAVING COUNT(rr.id) > 0
    ORDER BY total_value DESC
  )
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'distributorId', ds.distributor_id,
      'distributorName', ds.distributor_name,
      'pharmaciesCount', ds.pharmacies_count,
      'totalReturns', ds.total_returns,
      'avgReturnValue', CASE WHEN ds.total_returns > 0 THEN ROUND(ds.total_value / ds.total_returns, 2) ELSE 0 END,
      'totalValue', ROUND(ds.total_value, 2)
    ) ORDER BY ds.total_value DESC
  ), '[]'::jsonb)
  INTO v_distributor_breakdown
  FROM distributor_stats ds;

  -- ============================================================
  -- 8. STATE BREAKDOWN (scoped to buying group)
  -- Groups pharmacies by state from physical_address JSONB field
  -- ============================================================
  
  WITH state_stats AS (
    SELECT 
      CASE 
        WHEN p.physical_address IS NULL THEN 'Unknown'
        WHEN p.physical_address->>'state' IS NULL THEN 'Unknown'
        WHEN TRIM(p.physical_address->>'state') = '' THEN 'Unknown'
        ELSE TRIM(p.physical_address->>'state')
      END AS state,
      COUNT(DISTINCT p.id)::INTEGER AS pharmacies_count,
      COUNT(rr.id)::INTEGER AS total_returns,
      COALESCE(SUM(COALESCE((rr.data->>'creditAmount')::NUMERIC, 0)), 0) AS total_value
    FROM pharmacy p
    LEFT JOIN return_reports rr ON rr.pharmacy_id = p.id
    WHERE (p_buying_group_id IS NULL OR p.created_by = p_buying_group_id)
    GROUP BY 
      CASE 
        WHEN p.physical_address IS NULL THEN 'Unknown'
        WHEN p.physical_address->>'state' IS NULL THEN 'Unknown'
        WHEN TRIM(p.physical_address->>'state') = '' THEN 'Unknown'
        ELSE TRIM(p.physical_address->>'state')
      END
    ORDER BY total_value DESC, pharmacies_count DESC
  )
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'state', ss.state,
      'pharmacies', ss.pharmacies_count,
      'totalReturns', ss.total_returns,
      'avgReturnValue', CASE WHEN ss.total_returns > 0 THEN ROUND(ss.total_value / ss.total_returns, 2) ELSE 0 END,
      'totalValue', ROUND(ss.total_value, 2)
    ) ORDER BY ss.total_value DESC
  ), '[]'::jsonb)
  INTO v_state_breakdown
  FROM state_stats ss;

  -- ============================================================
  -- BUILD FINAL RESULT
  -- ============================================================
  
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
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_admin_analytics(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_admin_analytics(UUID) TO service_role;

COMMENT ON FUNCTION get_admin_analytics(UUID) IS
  'Get all analytics data for admin dashboard: key metrics, trends, top products, distributor and state breakdowns. '
  'p_buying_group_id NULL => global (MainAdmin); non-null => scoped to pharmacies where pharmacy.created_by matches.';

-- ============================================================
-- Example Usage:
-- ============================================================
-- Global (MainAdmin):
-- SELECT get_admin_analytics();
-- SELECT get_admin_analytics(NULL);
--
-- Scoped to a buying group:
-- SELECT get_admin_analytics('29f984d2-c0ac-4bed-9358-e3a41e4634a6'::UUID);
