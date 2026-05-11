-- ============================================================
-- Fix admin dashboard returns value calculation
-- Problem: Returns value shows 0 even though return count is correct
-- Solution: Sum return_transactions.total_returnable_value + total_non_returnable_value
--          (these aggregate fields are kept up-to-date by item triggers)
-- Note: total_returns COUNT remains unchanged (still from uploaded_documents)
-- ============================================================

CREATE OR REPLACE FUNCTION get_admin_dashboard_stats(
    p_pharmacy_id       UUID    DEFAULT NULL,
    p_period_type       TEXT    DEFAULT 'monthly',
    p_periods           INTEGER DEFAULT 12,
    p_buying_group_id   UUID    DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_result                        JSONB;
    v_total_pharmacies              INTEGER;
    v_pharmacies_this_month         INTEGER;
    v_pharmacies_last_month         INTEGER;
    v_pharmacies_change             NUMERIC;
    v_active_distributors           INTEGER;
    v_distributors_this_month       INTEGER;
    v_distributors_last_month       INTEGER;
    v_distributors_change           NUMERIC;
    v_returns_value                 NUMERIC;
    v_returns_value_this_month      NUMERIC;
    v_returns_value_last_month      NUMERIC;
    v_returns_change                NUMERIC;
    v_total_returns                 INTEGER;
    v_returns_this_month            INTEGER;
    v_returns_last_month            INTEGER;
    v_total_returns_change          NUMERIC;
    v_pharmacies_list               JSONB;
    v_returns_trend                 JSONB;
    v_start_date                    TIMESTAMP WITH TIME ZONE;
    v_end_date                      TIMESTAMP WITH TIME ZONE;
    v_current_month_start           TIMESTAMP WITH TIME ZONE;
    v_next_month_start              TIMESTAMP WITH TIME ZONE;
    v_last_month_start              TIMESTAMP WITH TIME ZONE;
BEGIN
    v_current_month_start := DATE_TRUNC('month', NOW());
    v_next_month_start    := DATE_TRUNC('month', NOW()) + INTERVAL '1 month';
    v_last_month_start    := DATE_TRUNC('month', NOW()) - INTERVAL '1 month';
    v_end_date            := NOW();

    IF p_period_type = 'yearly' THEN
        v_start_date := DATE_TRUNC('year',  NOW()) - (p_periods || ' years')::INTERVAL;
    ELSE
        v_start_date := DATE_TRUNC('month', NOW()) - (p_periods || ' months')::INTERVAL;
    END IF;

    -- ============================================================
    -- STAT 1: Total Pharmacies (scoped to buying group)
    -- ============================================================

    SELECT COUNT(*)::INTEGER
    INTO v_total_pharmacies
    FROM pharmacy
    WHERE (p_buying_group_id IS NULL OR created_by = p_buying_group_id);

    SELECT COUNT(*)::INTEGER
    INTO v_pharmacies_this_month
    FROM pharmacy
    WHERE created_at >= v_current_month_start
      AND created_at <  v_next_month_start
      AND (p_buying_group_id IS NULL OR created_by = p_buying_group_id);

    SELECT COUNT(*)::INTEGER
    INTO v_pharmacies_last_month
    FROM pharmacy
    WHERE created_at >= v_last_month_start
      AND created_at <  v_current_month_start
      AND (p_buying_group_id IS NULL OR created_by = p_buying_group_id);

    IF v_pharmacies_last_month > 0 THEN
        v_pharmacies_change := ROUND(((v_pharmacies_this_month - v_pharmacies_last_month)::NUMERIC / v_pharmacies_last_month * 100)::NUMERIC, 1);
    ELSE
        v_pharmacies_change := CASE WHEN v_pharmacies_this_month > 0 THEN 100.0 ELSE 0.0 END;
    END IF;

    -- ============================================================
    -- STAT 2: Active Distributors used by this buying group's pharmacies
    -- ============================================================

    IF p_buying_group_id IS NULL THEN
        SELECT COUNT(*)::INTEGER
        INTO v_active_distributors
        FROM reverse_distributors
        WHERE is_active = true;

        SELECT COUNT(*)::INTEGER
        INTO v_distributors_this_month
        FROM reverse_distributors
        WHERE is_active = true
          AND created_at >= v_current_month_start
          AND created_at <  v_next_month_start;

        SELECT COUNT(*)::INTEGER
        INTO v_distributors_last_month
        FROM reverse_distributors
        WHERE is_active = true
          AND created_at >= v_last_month_start
          AND created_at <  v_current_month_start;
    ELSE
        SELECT COUNT(DISTINCT ud.reverse_distributor_id)::INTEGER
        INTO v_active_distributors
        FROM uploaded_documents ud
        JOIN pharmacy p ON p.id = ud.pharmacy_id
        JOIN reverse_distributors rd ON rd.id = ud.reverse_distributor_id
        WHERE rd.is_active = true
          AND p.created_by = p_buying_group_id;

        SELECT COUNT(DISTINCT ud.reverse_distributor_id)::INTEGER
        INTO v_distributors_this_month
        FROM uploaded_documents ud
        JOIN pharmacy p ON p.id = ud.pharmacy_id
        JOIN reverse_distributors rd ON rd.id = ud.reverse_distributor_id
        WHERE rd.is_active = true
          AND p.created_by = p_buying_group_id
          AND ud.uploaded_at >= v_current_month_start
          AND ud.uploaded_at <  v_next_month_start;

        SELECT COUNT(DISTINCT ud.reverse_distributor_id)::INTEGER
        INTO v_distributors_last_month
        FROM uploaded_documents ud
        JOIN pharmacy p ON p.id = ud.pharmacy_id
        JOIN reverse_distributors rd ON rd.id = ud.reverse_distributor_id
        WHERE rd.is_active = true
          AND p.created_by = p_buying_group_id
          AND ud.uploaded_at >= v_last_month_start
          AND ud.uploaded_at <  v_current_month_start;
    END IF;

    IF v_distributors_last_month > 0 THEN
        v_distributors_change := ROUND(((v_distributors_this_month - v_distributors_last_month)::NUMERIC / v_distributors_last_month * 100)::NUMERIC, 1);
    ELSE
        v_distributors_change := CASE WHEN v_distributors_this_month > 0 THEN 100.0 ELSE 0.0 END;
    END IF;

    -- ============================================================
    -- STAT 3: Returns Value (FIXED - sums return_transactions aggregates)
    -- Sums total_returnable_value + total_non_returnable_value from return_transactions
    -- These columns are auto-maintained by RPC functions when items are added/updated
    -- ============================================================

    SELECT COALESCE(SUM(COALESCE(rt.total_returnable_value, 0) + COALESCE(rt.total_non_returnable_value, 0)), 0)::NUMERIC
    INTO v_returns_value
    FROM return_transactions rt
    JOIN pharmacy p ON p.id = rt.pharmacy_id
    WHERE (p_buying_group_id IS NULL OR p.created_by = p_buying_group_id);

    SELECT COALESCE(SUM(COALESCE(rt.total_returnable_value, 0) + COALESCE(rt.total_non_returnable_value, 0)), 0)::NUMERIC
    INTO v_returns_value_this_month
    FROM return_transactions rt
    JOIN pharmacy p ON p.id = rt.pharmacy_id
    WHERE rt.created_at >= v_current_month_start
      AND rt.created_at <  v_next_month_start
      AND (p_buying_group_id IS NULL OR p.created_by = p_buying_group_id);

    SELECT COALESCE(SUM(COALESCE(rt.total_returnable_value, 0) + COALESCE(rt.total_non_returnable_value, 0)), 0)::NUMERIC
    INTO v_returns_value_last_month
    FROM return_transactions rt
    JOIN pharmacy p ON p.id = rt.pharmacy_id
    WHERE rt.created_at >= v_last_month_start
      AND rt.created_at <  v_current_month_start
      AND (p_buying_group_id IS NULL OR p.created_by = p_buying_group_id);

    IF v_returns_value_last_month > 0 THEN
        v_returns_change := ROUND(((v_returns_value_this_month - v_returns_value_last_month)::NUMERIC / v_returns_value_last_month * 100)::NUMERIC, 1);
    ELSE
        v_returns_change := CASE WHEN v_returns_value_this_month > 0 THEN 100.0 ELSE 0.0 END;
    END IF;

    -- ============================================================
    -- STAT 4: Total Returns (FIXED - count return_transactions to match value calculation)
    -- ============================================================

    SELECT COUNT(*)::INTEGER
    INTO v_total_returns
    FROM return_transactions rt
    JOIN pharmacy p ON p.id = rt.pharmacy_id
    WHERE (p_buying_group_id IS NULL OR p.created_by = p_buying_group_id);

    SELECT COUNT(*)::INTEGER
    INTO v_returns_this_month
    FROM return_transactions rt
    JOIN pharmacy p ON p.id = rt.pharmacy_id
    WHERE rt.created_at >= v_current_month_start
      AND rt.created_at <  v_next_month_start
      AND (p_buying_group_id IS NULL OR p.created_by = p_buying_group_id);

    SELECT COUNT(*)::INTEGER
    INTO v_returns_last_month
    FROM return_transactions rt
    JOIN pharmacy p ON p.id = rt.pharmacy_id
    WHERE rt.created_at >= v_last_month_start
      AND rt.created_at <  v_current_month_start
      AND (p_buying_group_id IS NULL OR p.created_by = p_buying_group_id);

    IF v_returns_last_month > 0 THEN
        v_total_returns_change := ROUND(((v_returns_this_month - v_returns_last_month)::NUMERIC / v_returns_last_month * 100)::NUMERIC, 1);
    ELSE
        v_total_returns_change := CASE WHEN v_returns_this_month > 0 THEN 100.0 ELSE 0.0 END;
    END IF;

    -- ============================================================
    -- STAT 5: Pharmacies List (scoped to buying group)
    -- ============================================================

    SELECT COALESCE(jsonb_agg(
        jsonb_build_object('id', ph.id, 'name', ph.pharmacy_name)
        ORDER BY ph.pharmacy_name
    ), '[]'::JSONB)
    INTO v_pharmacies_list
    FROM pharmacy ph
    WHERE (p_buying_group_id IS NULL OR ph.created_by = p_buying_group_id);

    -- ============================================================
    -- STAT 6: Returns Value Trend (FIXED - uses return_transactions aggregates)
    -- ============================================================

    IF p_period_type = 'yearly' THEN
        WITH years AS (
            SELECT generate_series(
                EXTRACT(YEAR FROM v_start_date)::INTEGER,
                EXTRACT(YEAR FROM v_end_date)::INTEGER
            ) AS year
        ),
        earnings AS (
            SELECT
                EXTRACT(YEAR FROM rt.created_at)::INTEGER AS year,
                ROUND(SUM(COALESCE(rt.total_returnable_value, 0) + COALESCE(rt.total_non_returnable_value, 0))::NUMERIC, 2) AS value,
                COUNT(*)::INTEGER AS documents_count
            FROM return_transactions rt
            JOIN pharmacy p ON p.id = rt.pharmacy_id
            WHERE rt.created_at >= v_start_date
              AND rt.created_at <= v_end_date
              AND (p_pharmacy_id     IS NULL OR rt.pharmacy_id  = p_pharmacy_id)
              AND (p_buying_group_id IS NULL OR p.created_by    = p_buying_group_id)
            GROUP BY EXTRACT(YEAR FROM rt.created_at)
        )
        SELECT COALESCE(jsonb_agg(
            jsonb_build_object(
                'period',         y.year::TEXT,
                'label',          y.year::TEXT,
                'value',          COALESCE(e.value, 0),
                'documentsCount', COALESCE(e.documents_count, 0)
            ) ORDER BY y.year
        ), '[]'::JSONB)
        INTO v_returns_trend
        FROM years y
        LEFT JOIN earnings e ON y.year = e.year;
    ELSE
        WITH months AS (
            SELECT
                TO_CHAR(d::DATE, 'YYYY-MM')       AS period,
                TRIM(TO_CHAR(d::DATE, 'Mon'))      AS label,
                d::DATE                            AS month_date
            FROM generate_series(
                DATE_TRUNC('month', v_start_date),
                DATE_TRUNC('month', v_end_date),
                '1 month'::INTERVAL
            ) d
        ),
        earnings AS (
            SELECT
                TO_CHAR(rt.created_at, 'YYYY-MM') AS period,
                ROUND(SUM(COALESCE(rt.total_returnable_value, 0) + COALESCE(rt.total_non_returnable_value, 0))::NUMERIC, 2) AS value,
                COUNT(*)::INTEGER AS documents_count
            FROM return_transactions rt
            JOIN pharmacy p ON p.id = rt.pharmacy_id
            WHERE rt.created_at >= v_start_date
              AND rt.created_at <= v_end_date
              AND (p_pharmacy_id     IS NULL OR rt.pharmacy_id  = p_pharmacy_id)
              AND (p_buying_group_id IS NULL OR p.created_by    = p_buying_group_id)
            GROUP BY TO_CHAR(rt.created_at, 'YYYY-MM')
        )
        SELECT COALESCE(jsonb_agg(
            jsonb_build_object(
                'period',         m.period,
                'label',          m.label,
                'value',          COALESCE(e.value, 0),
                'documentsCount', COALESCE(e.documents_count, 0)
            ) ORDER BY m.period
        ), '[]'::JSONB)
        INTO v_returns_trend
        FROM months m
        LEFT JOIN earnings e ON m.period = e.period;
    END IF;

    -- ============================================================
    -- Build final result
    -- ============================================================

    v_result := jsonb_build_object(
        'stats', jsonb_build_object(
            'totalPharmacies', jsonb_build_object(
                'value',       v_total_pharmacies,
                'change',      v_pharmacies_change,
                'changeLabel', 'vs last month'
            ),
            'activeDistributors', jsonb_build_object(
                'value',       v_active_distributors,
                'change',      v_distributors_change,
                'changeLabel', 'vs last month'
            ),
            'returnsValue', jsonb_build_object(
                'value',       ROUND(v_returns_value, 2),
                'change',      v_returns_change,
                'changeLabel', 'vs last month'
            ),
            'totalReturns', jsonb_build_object(
                'value',       v_total_returns,
                'change',      v_total_returns_change,
                'changeLabel', 'vs last month'
            )
        ),
        'pharmacies',       v_pharmacies_list,
        'returnsValueTrend', v_returns_trend,
        'period', jsonb_build_object(
            'type',       p_period_type,
            'periods',    p_periods,
            'startDate',  v_start_date::TEXT,
            'endDate',    v_end_date::TEXT,
            'pharmacyId', p_pharmacy_id
        ),
        'generatedAt', NOW()
    );

    RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION get_admin_dashboard_stats(UUID, TEXT, INTEGER, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_admin_dashboard_stats(UUID, TEXT, INTEGER, UUID) TO service_role;
