-- ============================================================
-- Migration: Add p_buying_group_id filter to all analytics RPCs
-- When p_buying_group_id IS NULL  → show all data (MainAdmin view)
-- When set                        → filter to pharmacies created by that buying group
-- Also fixes get_admin_analytics topProducts OR-precedence bug
-- ============================================================

-- Drop old function signatures (without p_buying_group_id) to avoid overload ambiguity
DROP FUNCTION IF EXISTS analytics_returns_summary(DATE, DATE, UUID, TEXT);
DROP FUNCTION IF EXISTS analytics_ask_vs_received(TEXT, UUID, TEXT, INTEGER, INTEGER);
DROP FUNCTION IF EXISTS analytics_aging_inventory(UUID, TEXT, INTEGER, INTEGER);
DROP FUNCTION IF EXISTS analytics_outstanding_ra(TEXT, TEXT, INTEGER, INTEGER);
DROP FUNCTION IF EXISTS analytics_unpaid_memos(TEXT, TEXT, TEXT, INTEGER, INTEGER);
DROP FUNCTION IF EXISTS analytics_price_audit(TEXT, TEXT, TEXT, INTEGER, INTEGER);
DROP FUNCTION IF EXISTS analytics_pharmacy_performance(TEXT, TEXT, TEXT, INTEGER, INTEGER);
DROP FUNCTION IF EXISTS analytics_gpo_summary(TEXT, INTEGER, INTEGER);
DROP FUNCTION IF EXISTS payment_ask_vs_received(TEXT, TEXT, INTEGER, INTEGER);
DROP FUNCTION IF EXISTS payment_manufacturer_summary(TEXT, INTEGER, INTEGER);


-- ────────────────────────────────────────────────────────────
-- 1. analytics_returns_summary
-- ────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION analytics_returns_summary(
  p_period_start  DATE DEFAULT NULL,
  p_period_end    DATE DEFAULT NULL,
  p_pharmacy_id   UUID DEFAULT NULL,
  p_group_by      TEXT DEFAULT 'month',
  p_buying_group_id UUID DEFAULT NULL
)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER AS $$
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
  JOIN pharmacy ph ON ph.id = rt.pharmacy_id
  WHERE rt.created_at::date BETWEEN v_start AND v_end
    AND (p_pharmacy_id IS NULL OR rt.pharmacy_id = p_pharmacy_id)
    AND (p_buying_group_id IS NULL OR ph.created_by = p_buying_group_id);

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
    JOIN pharmacy ph ON ph.id = rt.pharmacy_id
    WHERE rt.created_at::date BETWEEN v_start AND v_end
      AND (p_pharmacy_id IS NULL OR rt.pharmacy_id = p_pharmacy_id)
      AND (p_buying_group_id IS NULL OR ph.created_by = p_buying_group_id)
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
      JOIN pharmacy ph ON ph.id = rt.pharmacy_id
      WHERE rt.created_at::date BETWEEN v_start AND v_end
        AND (p_pharmacy_id IS NULL OR rt.pharmacy_id = p_pharmacy_id)
        AND (p_buying_group_id IS NULL OR ph.created_by = p_buying_group_id)
      GROUP BY DATE_TRUNC('week', rt.created_at)
    ) trend_data;
  ELSIF p_group_by = 'status' THEN
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
      JOIN pharmacy ph ON ph.id = rt.pharmacy_id
      WHERE rt.created_at::date BETWEEN v_start AND v_end
        AND (p_pharmacy_id IS NULL OR rt.pharmacy_id = p_pharmacy_id)
        AND (p_buying_group_id IS NULL OR ph.created_by = p_buying_group_id)
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
      JOIN pharmacy ph ON ph.id = rt.pharmacy_id
      WHERE rt.created_at::date BETWEEN v_start AND v_end
        AND (p_pharmacy_id IS NULL OR rt.pharmacy_id = p_pharmacy_id)
        AND (p_buying_group_id IS NULL OR ph.created_by = p_buying_group_id)
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
$$;


-- ────────────────────────────────────────────────────────────
-- 2. analytics_ask_vs_received
-- ────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION analytics_ask_vs_received(
  p_group_by   TEXT DEFAULT 'manufacturer',
  p_batch_id   UUID DEFAULT NULL,
  p_period     TEXT DEFAULT NULL,
  p_page       INTEGER DEFAULT 1,
  p_limit      INTEGER DEFAULT 50,
  p_buying_group_id UUID DEFAULT NULL
)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER AS $$
DECLARE
  v_offset  INTEGER;
  v_total   INTEGER;
  v_rows    jsonb;
  v_totals  jsonb;
  v_batch_filter DATE;
BEGIN
  v_offset := (GREATEST(p_page, 1) - 1) * p_limit;

  -- Overall totals
  SELECT jsonb_build_object(
    'totalMemos',       COUNT(*),
    'totalAskValue',    COALESCE(SUM(dm.amount_requested), 0),
    'totalReceived',    COALESCE(SUM(dm.amount_received), 0),
    'totalDifference',  COALESCE(SUM(dm.amount_requested), 0) - COALESCE(SUM(dm.amount_received), 0),
    'overallPayPercent', CASE WHEN SUM(dm.amount_requested) > 0
                           THEN ROUND((SUM(dm.amount_received) / SUM(dm.amount_requested)) * 100, 1)
                           ELSE 0 END
  )
  INTO v_totals
  FROM debit_memos dm
  JOIN pharmacy ph ON ph.id = dm.pharmacy_id
  LEFT JOIN return_batches rb ON rb.id = dm.batch_id
  WHERE (p_batch_id IS NULL OR dm.batch_id = p_batch_id)
    AND (p_period IS NULL OR TO_CHAR(rb.batch_month, 'YYYY-MM') = p_period)
    AND (p_buying_group_id IS NULL OR ph.created_by = p_buying_group_id);

  IF p_group_by = 'ndc' THEN
    -- Group by NDC
    SELECT COUNT(DISTINCT dmi.ndc) INTO v_total
    FROM debit_memo_items dmi
    JOIN debit_memos dm ON dm.id = dmi.debit_memo_id
    JOIN pharmacy ph ON ph.id = dm.pharmacy_id
    LEFT JOIN return_batches rb ON rb.id = dm.batch_id
    WHERE (p_batch_id IS NULL OR dm.batch_id = p_batch_id)
      AND (p_period IS NULL OR TO_CHAR(rb.batch_month, 'YYYY-MM') = p_period)
      AND dmi.ndc IS NOT NULL
      AND (p_buying_group_id IS NULL OR ph.created_by = p_buying_group_id);

    SELECT COALESCE(jsonb_agg(row_data ORDER BY total_ask DESC), '[]'::jsonb)
    INTO v_rows
    FROM (
      SELECT jsonb_build_object(
        'ndc',          dmi.ndc,
        'productName',  MAX(dmi.product_name),
        'totalQty',     SUM(dmi.quantity),
        'totalAsk',     COALESCE(SUM(dmi.ask_price * dmi.quantity), 0),
        'totalReceived',COALESCE(SUM(dmi.received_price * dmi.quantity), 0),
        'difference',   COALESCE(SUM(dmi.ask_price * dmi.quantity), 0) - COALESCE(SUM(dmi.received_price * dmi.quantity), 0),
        'payPercent',   CASE WHEN SUM(dmi.ask_price * dmi.quantity) > 0
                          THEN ROUND((SUM(dmi.received_price * dmi.quantity) / SUM(dmi.ask_price * dmi.quantity)) * 100, 1)
                          ELSE 0 END
      ) AS row_data,
      COALESCE(SUM(dmi.ask_price * dmi.quantity), 0) AS total_ask
      FROM debit_memo_items dmi
      JOIN debit_memos dm ON dm.id = dmi.debit_memo_id
      JOIN pharmacy ph ON ph.id = dm.pharmacy_id
      LEFT JOIN return_batches rb ON rb.id = dm.batch_id
      WHERE (p_batch_id IS NULL OR dm.batch_id = p_batch_id)
        AND (p_period IS NULL OR TO_CHAR(rb.batch_month, 'YYYY-MM') = p_period)
        AND dmi.ndc IS NOT NULL
        AND (p_buying_group_id IS NULL OR ph.created_by = p_buying_group_id)
      GROUP BY dmi.ndc
      ORDER BY total_ask DESC
      LIMIT p_limit OFFSET v_offset
    ) sub;

  ELSIF p_group_by = 'destination' THEN
    -- Group by destination
    SELECT COUNT(DISTINCT dm.destination) INTO v_total
    FROM debit_memos dm
    JOIN pharmacy ph ON ph.id = dm.pharmacy_id
    LEFT JOIN return_batches rb ON rb.id = dm.batch_id
    WHERE (p_batch_id IS NULL OR dm.batch_id = p_batch_id)
      AND (p_period IS NULL OR TO_CHAR(rb.batch_month, 'YYYY-MM') = p_period)
      AND (p_buying_group_id IS NULL OR ph.created_by = p_buying_group_id);

    SELECT COALESCE(jsonb_agg(row_data ORDER BY total_ask DESC), '[]'::jsonb)
    INTO v_rows
    FROM (
      SELECT jsonb_build_object(
        'destination',  COALESCE(dm.destination, 'Unknown'),
        'memoCount',    COUNT(*),
        'totalItems',   SUM(dm.total_items),
        'totalAsk',     COALESCE(SUM(dm.amount_requested), 0),
        'totalReceived',COALESCE(SUM(dm.amount_received), 0),
        'difference',   COALESCE(SUM(dm.amount_requested), 0) - COALESCE(SUM(dm.amount_received), 0),
        'payPercent',   CASE WHEN SUM(dm.amount_requested) > 0
                          THEN ROUND((SUM(dm.amount_received) / SUM(dm.amount_requested)) * 100, 1)
                          ELSE 0 END
      ) AS row_data,
      COALESCE(SUM(dm.amount_requested), 0) AS total_ask
      FROM debit_memos dm
      JOIN pharmacy ph ON ph.id = dm.pharmacy_id
      LEFT JOIN return_batches rb ON rb.id = dm.batch_id
      WHERE (p_batch_id IS NULL OR dm.batch_id = p_batch_id)
        AND (p_period IS NULL OR TO_CHAR(rb.batch_month, 'YYYY-MM') = p_period)
        AND (p_buying_group_id IS NULL OR ph.created_by = p_buying_group_id)
      GROUP BY dm.destination
      ORDER BY total_ask DESC
      LIMIT p_limit OFFSET v_offset
    ) sub;

  ELSE
    -- Default: group by manufacturer
    SELECT COUNT(DISTINCT dm.labeler_name) INTO v_total
    FROM debit_memos dm
    JOIN pharmacy ph ON ph.id = dm.pharmacy_id
    LEFT JOIN return_batches rb ON rb.id = dm.batch_id
    WHERE (p_batch_id IS NULL OR dm.batch_id = p_batch_id)
      AND (p_period IS NULL OR TO_CHAR(rb.batch_month, 'YYYY-MM') = p_period)
      AND (p_buying_group_id IS NULL OR ph.created_by = p_buying_group_id);

    SELECT COALESCE(jsonb_agg(row_data ORDER BY total_ask DESC), '[]'::jsonb)
    INTO v_rows
    FROM (
      SELECT jsonb_build_object(
        'labelerId',    dm.labeler_id,
        'labelerName',  COALESCE(dm.labeler_name, 'Unknown'),
        'memoCount',    COUNT(*),
        'totalItems',   SUM(dm.total_items),
        'totalAsk',     COALESCE(SUM(dm.amount_requested), 0),
        'totalReceived',COALESCE(SUM(dm.amount_received), 0),
        'difference',   COALESCE(SUM(dm.amount_requested), 0) - COALESCE(SUM(dm.amount_received), 0),
        'payPercent',   CASE WHEN SUM(dm.amount_requested) > 0
                          THEN ROUND((SUM(dm.amount_received) / SUM(dm.amount_requested)) * 100, 1)
                          ELSE 0 END,
        'paidMemos',    COUNT(*) FILTER (WHERE dm.payment_status = 'paid'),
        'unpaidMemos',  COUNT(*) FILTER (WHERE dm.payment_status IN ('pending', 'partial'))
      ) AS row_data,
      COALESCE(SUM(dm.amount_requested), 0) AS total_ask
      FROM debit_memos dm
      JOIN pharmacy ph ON ph.id = dm.pharmacy_id
      LEFT JOIN return_batches rb ON rb.id = dm.batch_id
      WHERE (p_batch_id IS NULL OR dm.batch_id = p_batch_id)
        AND (p_period IS NULL OR TO_CHAR(rb.batch_month, 'YYYY-MM') = p_period)
        AND (p_buying_group_id IS NULL OR ph.created_by = p_buying_group_id)
      GROUP BY dm.labeler_id, dm.labeler_name
      ORDER BY total_ask DESC
      LIMIT p_limit OFFSET v_offset
    ) sub;
  END IF;

  RETURN jsonb_build_object(
    'error', false,
    'data', v_rows,
    'totals', v_totals,
    'pagination', jsonb_build_object(
      'page', p_page, 'limit', p_limit, 'total', v_total,
      'totalPages', CEIL(GREATEST(v_total, 1)::float / p_limit)::integer
    )
  );
END;
$$;


-- ────────────────────────────────────────────────────────────
-- 3. analytics_aging_inventory
-- ────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION analytics_aging_inventory(
  p_pharmacy_id  UUID DEFAULT NULL,
  p_status       TEXT DEFAULT NULL,
  p_page         INTEGER DEFAULT 1,
  p_limit        INTEGER DEFAULT 20,
  p_buying_group_id UUID DEFAULT NULL
)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER AS $$
DECLARE
  v_offset   INTEGER;
  v_total    INTEGER;
  v_rows     jsonb;
  v_summary  jsonb;
  v_aging    jsonb;
BEGIN
  v_offset := (GREATEST(p_page, 1) - 1) * p_limit;

  -- Summary stats
  SELECT jsonb_build_object(
    'totalItems',      COUNT(*),
    'totalValue',      COALESCE(SUM(wc.estimated_value), 0),
    'shelvedCount',    COUNT(*) FILTER (WHERE wc.status = 'shelved'),
    'readyCount',      COUNT(*) FILTER (WHERE wc.status = 'ready_to_return'),
    'returnedCount',   COUNT(*) FILTER (WHERE wc.status = 'returned'),
    'destroyedCount',  COUNT(*) FILTER (WHERE wc.status = 'destroyed'),
    'avgDaysShelved',  ROUND(COALESCE(AVG(
      CASE WHEN wc.status = 'shelved'
        THEN EXTRACT(DAY FROM (NOW() - wc.date_shelved))
        ELSE NULL END
    ), 0), 0)
  )
  INTO v_summary
  FROM wine_cellar wc
  JOIN pharmacy ph ON ph.id = wc.pharmacy_id
  WHERE (p_pharmacy_id IS NULL OR wc.pharmacy_id = p_pharmacy_id)
    AND (p_status IS NULL OR wc.status = p_status)
    AND (p_buying_group_id IS NULL OR ph.created_by = p_buying_group_id);

  -- Aging buckets (for shelved items only)
  SELECT jsonb_build_object(
    'under30Days',  jsonb_build_object(
      'count', COUNT(*) FILTER (WHERE EXTRACT(DAY FROM (NOW() - wc.date_shelved)) < 30),
      'value', COALESCE(SUM(wc.estimated_value) FILTER (WHERE EXTRACT(DAY FROM (NOW() - wc.date_shelved)) < 30), 0)
    ),
    'days30to90',   jsonb_build_object(
      'count', COUNT(*) FILTER (WHERE EXTRACT(DAY FROM (NOW() - wc.date_shelved)) BETWEEN 30 AND 90),
      'value', COALESCE(SUM(wc.estimated_value) FILTER (WHERE EXTRACT(DAY FROM (NOW() - wc.date_shelved)) BETWEEN 30 AND 90), 0)
    ),
    'days91to180',  jsonb_build_object(
      'count', COUNT(*) FILTER (WHERE EXTRACT(DAY FROM (NOW() - wc.date_shelved)) BETWEEN 91 AND 180),
      'value', COALESCE(SUM(wc.estimated_value) FILTER (WHERE EXTRACT(DAY FROM (NOW() - wc.date_shelved)) BETWEEN 91 AND 180), 0)
    ),
    'over180Days',  jsonb_build_object(
      'count', COUNT(*) FILTER (WHERE EXTRACT(DAY FROM (NOW() - wc.date_shelved)) > 180),
      'value', COALESCE(SUM(wc.estimated_value) FILTER (WHERE EXTRACT(DAY FROM (NOW() - wc.date_shelved)) > 180), 0)
    )
  )
  INTO v_aging
  FROM wine_cellar wc
  JOIN pharmacy ph ON ph.id = wc.pharmacy_id
  WHERE wc.status = 'shelved'
    AND (p_pharmacy_id IS NULL OR wc.pharmacy_id = p_pharmacy_id)
    AND (p_buying_group_id IS NULL OR ph.created_by = p_buying_group_id);

  -- Count for pagination
  SELECT COUNT(*) INTO v_total
  FROM wine_cellar wc
  JOIN pharmacy ph ON ph.id = wc.pharmacy_id
  WHERE (p_pharmacy_id IS NULL OR wc.pharmacy_id = p_pharmacy_id)
    AND (p_status IS NULL OR wc.status = p_status)
    AND (p_buying_group_id IS NULL OR ph.created_by = p_buying_group_id);

  -- Data rows
  SELECT COALESCE(jsonb_agg(row_data ORDER BY days_shelved DESC), '[]'::jsonb)
  INTO v_rows
  FROM (
    SELECT jsonb_build_object(
      'id',                    wc.id,
      'pharmacyId',            wc.pharmacy_id,
      'pharmacyName',          COALESCE(ph.pharmacy_name, ''),
      'ndc',                   wc.ndc,
      'productName',           wc.product_name,
      'manufacturer',          wc.manufacturer,
      'lotNumber',             wc.lot_number,
      'expirationDate',        wc.expiration_date,
      'quantity',              wc.quantity,
      'estimatedValue',        wc.estimated_value,
      'dateShelved',           wc.date_shelved,
      'expectedReturnableDate',wc.expected_returnable_date,
      'status',                wc.status,
      'daysShelved',           EXTRACT(DAY FROM (NOW() - wc.date_shelved))::integer,
      'physicalLocation',      wc.physical_location,
      'baggieBarcode',         wc.baggie_barcode
    ) AS row_data,
    EXTRACT(DAY FROM (NOW() - wc.date_shelved))::integer AS days_shelved
    FROM wine_cellar wc
    LEFT JOIN pharmacy ph ON ph.id = wc.pharmacy_id
    WHERE (p_pharmacy_id IS NULL OR wc.pharmacy_id = p_pharmacy_id)
      AND (p_status IS NULL OR wc.status = p_status)
      AND (p_buying_group_id IS NULL OR ph.created_by = p_buying_group_id)
    ORDER BY wc.date_shelved ASC
    LIMIT p_limit OFFSET v_offset
  ) sub;

  RETURN jsonb_build_object(
    'error', false,
    'data', v_rows,
    'summary', v_summary,
    'agingBuckets', v_aging,
    'pagination', jsonb_build_object(
      'page', p_page, 'limit', p_limit, 'total', v_total,
      'totalPages', CEIL(GREATEST(v_total, 1)::float / p_limit)::integer
    )
  );
END;
$$;


-- ────────────────────────────────────────────────────────────
-- 4. analytics_outstanding_ra
-- ────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION analytics_outstanding_ra(
  p_destination TEXT DEFAULT NULL,
  p_search      TEXT DEFAULT NULL,
  p_page        INTEGER DEFAULT 1,
  p_limit       INTEGER DEFAULT 20,
  p_buying_group_id UUID DEFAULT NULL
)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER AS $$
DECLARE
  v_offset   INTEGER;
  v_total    INTEGER;
  v_rows     jsonb;
  v_summary  jsonb;
  v_aging    jsonb;
BEGIN
  v_offset := (GREATEST(p_page, 1) - 1) * p_limit;

  -- Summary
  SELECT jsonb_build_object(
    'totalOutstanding',   COUNT(*),
    'totalAskValue',      COALESCE(SUM(dm.amount_requested), 0),
    'avgDaysWaiting',     ROUND(COALESCE(AVG(
      EXTRACT(DAY FROM (NOW() - dm.ra_requested_at))
    ), 0), 0),
    'oldestRequest',      MIN(dm.ra_requested_at)
  )
  INTO v_summary
  FROM debit_memos dm
  JOIN pharmacy ph ON ph.id = dm.pharmacy_id
  WHERE dm.ra_requested_at IS NOT NULL
    AND dm.ra_received_at IS NULL
    AND (p_destination IS NULL OR dm.destination = p_destination)
    AND (p_search IS NULL OR (
      LOWER(COALESCE(dm.labeler_name, '')) LIKE '%' || LOWER(p_search) || '%'
      OR LOWER(dm.memo_number) LIKE '%' || LOWER(p_search) || '%'
    ))
    AND (p_buying_group_id IS NULL OR ph.created_by = p_buying_group_id);

  -- Aging buckets
  SELECT jsonb_build_object(
    'under30Days', jsonb_build_object(
      'count', COUNT(*) FILTER (WHERE EXTRACT(DAY FROM (NOW() - dm.ra_requested_at)) < 30),
      'value', COALESCE(SUM(dm.amount_requested) FILTER (WHERE EXTRACT(DAY FROM (NOW() - dm.ra_requested_at)) < 30), 0)
    ),
    'days30to60', jsonb_build_object(
      'count', COUNT(*) FILTER (WHERE EXTRACT(DAY FROM (NOW() - dm.ra_requested_at)) BETWEEN 30 AND 60),
      'value', COALESCE(SUM(dm.amount_requested) FILTER (WHERE EXTRACT(DAY FROM (NOW() - dm.ra_requested_at)) BETWEEN 30 AND 60), 0)
    ),
    'days61to120', jsonb_build_object(
      'count', COUNT(*) FILTER (WHERE EXTRACT(DAY FROM (NOW() - dm.ra_requested_at)) BETWEEN 61 AND 120),
      'value', COALESCE(SUM(dm.amount_requested) FILTER (WHERE EXTRACT(DAY FROM (NOW() - dm.ra_requested_at)) BETWEEN 61 AND 120), 0)
    ),
    'over120Days', jsonb_build_object(
      'count', COUNT(*) FILTER (WHERE EXTRACT(DAY FROM (NOW() - dm.ra_requested_at)) > 120),
      'value', COALESCE(SUM(dm.amount_requested) FILTER (WHERE EXTRACT(DAY FROM (NOW() - dm.ra_requested_at)) > 120), 0)
    )
  )
  INTO v_aging
  FROM debit_memos dm
  JOIN pharmacy ph ON ph.id = dm.pharmacy_id
  WHERE dm.ra_requested_at IS NOT NULL
    AND dm.ra_received_at IS NULL
    AND (p_destination IS NULL OR dm.destination = p_destination)
    AND (p_search IS NULL OR (
      LOWER(COALESCE(dm.labeler_name, '')) LIKE '%' || LOWER(p_search) || '%'
      OR LOWER(dm.memo_number) LIKE '%' || LOWER(p_search) || '%'
    ))
    AND (p_buying_group_id IS NULL OR ph.created_by = p_buying_group_id);

  -- Count
  SELECT COUNT(*) INTO v_total
  FROM debit_memos dm
  JOIN pharmacy ph ON ph.id = dm.pharmacy_id
  WHERE dm.ra_requested_at IS NOT NULL
    AND dm.ra_received_at IS NULL
    AND (p_destination IS NULL OR dm.destination = p_destination)
    AND (p_search IS NULL OR (
      LOWER(COALESCE(dm.labeler_name, '')) LIKE '%' || LOWER(p_search) || '%'
      OR LOWER(dm.memo_number) LIKE '%' || LOWER(p_search) || '%'
    ))
    AND (p_buying_group_id IS NULL OR ph.created_by = p_buying_group_id);

  -- Data rows
  SELECT COALESCE(jsonb_agg(row_data ORDER BY days_waiting DESC), '[]'::jsonb)
  INTO v_rows
  FROM (
    SELECT jsonb_build_object(
      'id',              dm.id,
      'memoNumber',      dm.memo_number,
      'labelerName',     dm.labeler_name,
      'labelerId',       dm.labeler_id,
      'destination',     dm.destination,
      'pharmacyName',    COALESCE(ph.pharmacy_name, ''),
      'totalItems',      dm.total_items,
      'amountRequested', dm.amount_requested,
      'raRequestedAt',   dm.ra_requested_at,
      'ticklerDate',     dm.tickler_date,
      'daysWaiting',     EXTRACT(DAY FROM (NOW() - dm.ra_requested_at))::integer,
      'batchName',       rb.batch_name
    ) AS row_data,
    EXTRACT(DAY FROM (NOW() - dm.ra_requested_at))::integer AS days_waiting
    FROM debit_memos dm
    JOIN pharmacy ph ON ph.id = dm.pharmacy_id
    LEFT JOIN return_batches rb ON rb.id = dm.batch_id
    WHERE dm.ra_requested_at IS NOT NULL
      AND dm.ra_received_at IS NULL
      AND (p_destination IS NULL OR dm.destination = p_destination)
      AND (p_search IS NULL OR (
        LOWER(COALESCE(dm.labeler_name, '')) LIKE '%' || LOWER(p_search) || '%'
        OR LOWER(dm.memo_number) LIKE '%' || LOWER(p_search) || '%'
      ))
      AND (p_buying_group_id IS NULL OR ph.created_by = p_buying_group_id)
    ORDER BY dm.ra_requested_at ASC
    LIMIT p_limit OFFSET v_offset
  ) sub;

  RETURN jsonb_build_object(
    'error', false,
    'data', v_rows,
    'summary', v_summary,
    'agingBuckets', v_aging,
    'pagination', jsonb_build_object(
      'page', p_page, 'limit', p_limit, 'total', v_total,
      'totalPages', CEIL(GREATEST(v_total, 1)::float / p_limit)::integer
    )
  );
END;
$$;


-- ────────────────────────────────────────────────────────────
-- 5. analytics_unpaid_memos
-- ────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION analytics_unpaid_memos(
  p_manufacturer TEXT DEFAULT NULL,
  p_destination  TEXT DEFAULT NULL,
  p_search       TEXT DEFAULT NULL,
  p_page         INTEGER DEFAULT 1,
  p_limit        INTEGER DEFAULT 20,
  p_buying_group_id UUID DEFAULT NULL
)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER AS $$
DECLARE
  v_offset  INTEGER;
  v_total   INTEGER;
  v_rows    jsonb;
  v_summary jsonb;
  v_aging   jsonb;
BEGIN
  v_offset := (GREATEST(p_page, 1) - 1) * p_limit;

  -- Summary
  SELECT jsonb_build_object(
    'totalUnpaidMemos',     COUNT(*),
    'totalAmountRequested', COALESCE(SUM(dm.amount_requested), 0),
    'totalAmountReceived',  COALESCE(SUM(dm.amount_received), 0),
    'totalOutstanding',     COALESCE(SUM(dm.amount_requested - dm.amount_received), 0),
    'avgDaysOutstanding',   ROUND(COALESCE(AVG(
      EXTRACT(DAY FROM (NOW() - dm.created_at))
    ), 0), 0)
  )
  INTO v_summary
  FROM debit_memos dm
  JOIN pharmacy ph ON ph.id = dm.pharmacy_id
  WHERE dm.payment_status IN ('pending', 'partial')
    AND (p_manufacturer IS NULL OR LOWER(COALESCE(dm.labeler_name, '')) LIKE '%' || LOWER(p_manufacturer) || '%')
    AND (p_destination IS NULL OR dm.destination = p_destination)
    AND (p_search IS NULL OR (
      LOWER(COALESCE(dm.labeler_name, '')) LIKE '%' || LOWER(p_search) || '%'
      OR LOWER(dm.memo_number) LIKE '%' || LOWER(p_search) || '%'
    ))
    AND (p_buying_group_id IS NULL OR ph.created_by = p_buying_group_id);

  -- Aging buckets
  SELECT jsonb_build_object(
    'under30Days', jsonb_build_object(
      'count', COUNT(*) FILTER (WHERE EXTRACT(DAY FROM (NOW() - dm.created_at)) < 30),
      'outstanding', COALESCE(SUM(dm.amount_requested - dm.amount_received) FILTER (WHERE EXTRACT(DAY FROM (NOW() - dm.created_at)) < 30), 0)
    ),
    'days30to90', jsonb_build_object(
      'count', COUNT(*) FILTER (WHERE EXTRACT(DAY FROM (NOW() - dm.created_at)) BETWEEN 30 AND 90),
      'outstanding', COALESCE(SUM(dm.amount_requested - dm.amount_received) FILTER (WHERE EXTRACT(DAY FROM (NOW() - dm.created_at)) BETWEEN 30 AND 90), 0)
    ),
    'days91to180', jsonb_build_object(
      'count', COUNT(*) FILTER (WHERE EXTRACT(DAY FROM (NOW() - dm.created_at)) BETWEEN 91 AND 180),
      'outstanding', COALESCE(SUM(dm.amount_requested - dm.amount_received) FILTER (WHERE EXTRACT(DAY FROM (NOW() - dm.created_at)) BETWEEN 91 AND 180), 0)
    ),
    'days181to365', jsonb_build_object(
      'count', COUNT(*) FILTER (WHERE EXTRACT(DAY FROM (NOW() - dm.created_at)) BETWEEN 181 AND 365),
      'outstanding', COALESCE(SUM(dm.amount_requested - dm.amount_received) FILTER (WHERE EXTRACT(DAY FROM (NOW() - dm.created_at)) BETWEEN 181 AND 365), 0)
    ),
    'over365Days', jsonb_build_object(
      'count', COUNT(*) FILTER (WHERE EXTRACT(DAY FROM (NOW() - dm.created_at)) > 365),
      'outstanding', COALESCE(SUM(dm.amount_requested - dm.amount_received) FILTER (WHERE EXTRACT(DAY FROM (NOW() - dm.created_at)) > 365), 0)
    )
  )
  INTO v_aging
  FROM debit_memos dm
  JOIN pharmacy ph ON ph.id = dm.pharmacy_id
  WHERE dm.payment_status IN ('pending', 'partial')
    AND (p_manufacturer IS NULL OR LOWER(COALESCE(dm.labeler_name, '')) LIKE '%' || LOWER(p_manufacturer) || '%')
    AND (p_destination IS NULL OR dm.destination = p_destination)
    AND (p_search IS NULL OR (
      LOWER(COALESCE(dm.labeler_name, '')) LIKE '%' || LOWER(p_search) || '%'
      OR LOWER(dm.memo_number) LIKE '%' || LOWER(p_search) || '%'
    ))
    AND (p_buying_group_id IS NULL OR ph.created_by = p_buying_group_id);

  -- Count
  SELECT COUNT(*) INTO v_total
  FROM debit_memos dm
  JOIN pharmacy ph ON ph.id = dm.pharmacy_id
  WHERE dm.payment_status IN ('pending', 'partial')
    AND (p_manufacturer IS NULL OR LOWER(COALESCE(dm.labeler_name, '')) LIKE '%' || LOWER(p_manufacturer) || '%')
    AND (p_destination IS NULL OR dm.destination = p_destination)
    AND (p_search IS NULL OR (
      LOWER(COALESCE(dm.labeler_name, '')) LIKE '%' || LOWER(p_search) || '%'
      OR LOWER(dm.memo_number) LIKE '%' || LOWER(p_search) || '%'
    ))
    AND (p_buying_group_id IS NULL OR ph.created_by = p_buying_group_id);

  -- Data rows
  SELECT COALESCE(jsonb_agg(row_data ORDER BY days_outstanding DESC), '[]'::jsonb)
  INTO v_rows
  FROM (
    SELECT jsonb_build_object(
      'id',               dm.id,
      'memoNumber',       dm.memo_number,
      'labelerName',      dm.labeler_name,
      'labelerId',        dm.labeler_id,
      'destination',      dm.destination,
      'pharmacyName',     COALESCE(ph.pharmacy_name, ''),
      'totalItems',       dm.total_items,
      'amountRequested',  dm.amount_requested,
      'amountReceived',   dm.amount_received,
      'outstandingAmount',dm.amount_requested - dm.amount_received,
      'paymentStatus',    dm.payment_status,
      'daysOutstanding',  EXTRACT(DAY FROM (NOW() - dm.created_at))::integer,
      'batchName',        rb.batch_name,
      'raNumber',         dm.ra_number
    ) AS row_data,
    EXTRACT(DAY FROM (NOW() - dm.created_at))::integer AS days_outstanding
    FROM debit_memos dm
    JOIN pharmacy ph ON ph.id = dm.pharmacy_id
    LEFT JOIN return_batches rb ON rb.id = dm.batch_id
    WHERE dm.payment_status IN ('pending', 'partial')
      AND (p_manufacturer IS NULL OR LOWER(COALESCE(dm.labeler_name, '')) LIKE '%' || LOWER(p_manufacturer) || '%')
      AND (p_destination IS NULL OR dm.destination = p_destination)
      AND (p_search IS NULL OR (
        LOWER(COALESCE(dm.labeler_name, '')) LIKE '%' || LOWER(p_search) || '%'
        OR LOWER(dm.memo_number) LIKE '%' || LOWER(p_search) || '%'
      ))
      AND (p_buying_group_id IS NULL OR ph.created_by = p_buying_group_id)
    ORDER BY dm.created_at ASC
    LIMIT p_limit OFFSET v_offset
  ) sub;

  RETURN jsonb_build_object(
    'error', false,
    'data', v_rows,
    'summary', v_summary,
    'agingBuckets', v_aging,
    'pagination', jsonb_build_object(
      'page', p_page, 'limit', p_limit, 'total', v_total,
      'totalPages', CEIL(GREATEST(v_total, 1)::float / p_limit)::integer
    )
  );
END;
$$;


-- ────────────────────────────────────────────────────────────
-- 6. analytics_price_audit  (global data — param accepted but not filtered)
-- ────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION analytics_price_audit(
  p_ndc     TEXT DEFAULT NULL,
  p_source  TEXT DEFAULT NULL,
  p_search  TEXT DEFAULT NULL,
  p_page    INTEGER DEFAULT 1,
  p_limit   INTEGER DEFAULT 50,
  p_buying_group_id UUID DEFAULT NULL
)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER AS $$
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
$$;


-- ────────────────────────────────────────────────────────────
-- 7. analytics_pharmacy_performance
-- ────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION analytics_pharmacy_performance(
  p_search TEXT DEFAULT NULL,
  p_sort_by TEXT DEFAULT 'totalValue',
  p_sort_dir TEXT DEFAULT 'desc',
  p_page   INTEGER DEFAULT 1,
  p_limit  INTEGER DEFAULT 20,
  p_buying_group_id UUID DEFAULT NULL
)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER AS $$
DECLARE
  v_offset  INTEGER;
  v_total   INTEGER;
  v_rows    jsonb;
  v_overall jsonb;
BEGIN
  v_offset := (GREATEST(p_page, 1) - 1) * p_limit;

  -- Overall totals
  SELECT jsonb_build_object(
    'totalPharmacies',      COUNT(DISTINCT rt.pharmacy_id),
    'totalReturns',         COUNT(*),
    'totalReturnableValue', COALESCE(SUM(rt.total_returnable_value), 0),
    'totalItems',           COALESCE(SUM(rt.total_items), 0),
    'totalPayout',          COALESCE((
      SELECT SUM(pp.pharmacy_payout)
      FROM pharmacy_payments pp
      JOIN pharmacy ph2 ON ph2.id = pp.pharmacy_id
      WHERE pp.status = 'paid'
        AND (p_buying_group_id IS NULL OR ph2.created_by = p_buying_group_id)
    ), 0)
  )
  INTO v_overall
  FROM return_transactions rt
  JOIN pharmacy ph ON ph.id = rt.pharmacy_id
  WHERE (p_buying_group_id IS NULL OR ph.created_by = p_buying_group_id);

  -- Count pharmacies with returns
  SELECT COUNT(DISTINCT sub.pharmacy_id) INTO v_total
  FROM (
    SELECT rt.pharmacy_id
    FROM return_transactions rt
    JOIN pharmacy ph ON ph.id = rt.pharmacy_id
    WHERE (p_search IS NULL OR (
      LOWER(ph.pharmacy_name) LIKE '%' || LOWER(p_search) || '%'
      OR ph.store_number = p_search
    ))
      AND (p_buying_group_id IS NULL OR ph.created_by = p_buying_group_id)
    GROUP BY rt.pharmacy_id
  ) sub;

  -- Data rows
  SELECT COALESCE(jsonb_agg(row_data), '[]'::jsonb)
  INTO v_rows
  FROM (
    SELECT jsonb_build_object(
      'pharmacyId',     agg.pharmacy_id,
      'pharmacyName',   agg.pharmacy_name,
      'storeNumber',    agg.store_number,
      'gpoAffiliation', agg.gpo_affiliation,
      'serviceType',    agg.service_type,
      'totalReturns',   agg.total_returns,
      'totalItems',     agg.total_items,
      'totalReturnableValue', agg.total_returnable_value,
      'totalNonReturnableValue', agg.total_non_returnable_value,
      'avgReturnValue', agg.avg_return_value,
      'totalPayout',    agg.total_payout,
      'pendingPayout',  agg.pending_payout,
      'lastReturnDate', agg.last_return_date,
      'firstReturnDate', agg.first_return_date
    ) AS row_data,
    agg.total_returnable_value,
    agg.total_returns,
    agg.avg_return_value
    FROM (
      SELECT
        rt.pharmacy_id,
        MAX(ph.pharmacy_name) AS pharmacy_name,
        MAX(ph.store_number) AS store_number,
        MAX(ph.gpo_affiliation) AS gpo_affiliation,
        MAX(ph.service_type) AS service_type,
        COUNT(*) AS total_returns,
        COALESCE(SUM(rt.total_items), 0) AS total_items,
        COALESCE(SUM(rt.total_returnable_value), 0) AS total_returnable_value,
        COALESCE(SUM(rt.total_non_returnable_value), 0) AS total_non_returnable_value,
        ROUND(COALESCE(AVG(rt.total_returnable_value), 0), 2) AS avg_return_value,
        COALESCE((
          SELECT SUM(pp.pharmacy_payout) FROM pharmacy_payments pp
          WHERE pp.pharmacy_id = rt.pharmacy_id AND pp.status = 'paid'
        ), 0) AS total_payout,
        COALESCE((
          SELECT SUM(pp.pharmacy_payout) FROM pharmacy_payments pp
          WHERE pp.pharmacy_id = rt.pharmacy_id AND pp.status IN ('pending', 'processing')
        ), 0) AS pending_payout,
        MAX(rt.created_at) AS last_return_date,
        MIN(rt.created_at) AS first_return_date
      FROM return_transactions rt
      JOIN pharmacy ph ON ph.id = rt.pharmacy_id
      WHERE (p_search IS NULL OR (
        LOWER(ph.pharmacy_name) LIKE '%' || LOWER(p_search) || '%'
        OR ph.store_number = p_search
      ))
        AND (p_buying_group_id IS NULL OR ph.created_by = p_buying_group_id)
      GROUP BY rt.pharmacy_id
    ) agg
    ORDER BY
      CASE WHEN p_sort_by = 'totalValue' AND p_sort_dir = 'desc' THEN agg.total_returnable_value END DESC NULLS LAST,
      CASE WHEN p_sort_by = 'totalValue' AND p_sort_dir = 'asc'  THEN agg.total_returnable_value END ASC NULLS LAST,
      CASE WHEN p_sort_by = 'returns'    AND p_sort_dir = 'desc' THEN agg.total_returns END DESC NULLS LAST,
      CASE WHEN p_sort_by = 'returns'    AND p_sort_dir = 'asc'  THEN agg.total_returns END ASC NULLS LAST,
      CASE WHEN p_sort_by = 'avgValue'   AND p_sort_dir = 'desc' THEN agg.avg_return_value END DESC NULLS LAST,
      CASE WHEN p_sort_by = 'avgValue'   AND p_sort_dir = 'asc'  THEN agg.avg_return_value END ASC NULLS LAST,
      agg.total_returnable_value DESC NULLS LAST
    LIMIT p_limit OFFSET v_offset
  ) sub;

  RETURN jsonb_build_object(
    'error', false,
    'data', v_rows,
    'overall', v_overall,
    'pagination', jsonb_build_object(
      'page', p_page, 'limit', p_limit, 'total', v_total,
      'totalPages', CEIL(GREATEST(v_total, 1)::float / p_limit)::integer
    )
  );
END;
$$;


-- ────────────────────────────────────────────────────────────
-- 8. analytics_gpo_summary
-- ────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION analytics_gpo_summary(
  p_search TEXT DEFAULT NULL,
  p_page   INTEGER DEFAULT 1,
  p_limit  INTEGER DEFAULT 20,
  p_buying_group_id UUID DEFAULT NULL
)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER AS $$
DECLARE
  v_offset INTEGER;
  v_total  INTEGER;
  v_rows   jsonb;
BEGIN
  v_offset := (GREATEST(p_page, 1) - 1) * p_limit;

  -- Count distinct GPOs
  SELECT COUNT(DISTINCT COALESCE(ph.gpo_affiliation, 'No GPO')) INTO v_total
  FROM pharmacy ph
  WHERE EXISTS (SELECT 1 FROM return_transactions rt WHERE rt.pharmacy_id = ph.id)
    AND (p_search IS NULL OR (
      LOWER(COALESCE(ph.gpo_affiliation, '')) LIKE '%' || LOWER(p_search) || '%'
    ))
    AND (p_buying_group_id IS NULL OR ph.created_by = p_buying_group_id);

  -- Data rows grouped by GPO
  SELECT COALESCE(jsonb_agg(row_data ORDER BY total_value DESC), '[]'::jsonb)
  INTO v_rows
  FROM (
    SELECT jsonb_build_object(
      'gpoName',            COALESCE(ph.gpo_affiliation, 'No GPO'),
      'pharmacyCount',      COUNT(DISTINCT rt.pharmacy_id),
      'totalReturns',       COUNT(*),
      'totalItems',         COALESCE(SUM(rt.total_items), 0),
      'totalReturnableValue', COALESCE(SUM(rt.total_returnable_value), 0),
      'avgReturnValue',     ROUND(COALESCE(AVG(rt.total_returnable_value), 0), 2),
      'totalPayout',        COALESCE((
        SELECT SUM(pp.pharmacy_payout) FROM pharmacy_payments pp
        JOIN pharmacy p2 ON p2.id = pp.pharmacy_id
        WHERE COALESCE(p2.gpo_affiliation, 'No GPO') = COALESCE(ph.gpo_affiliation, 'No GPO')
          AND pp.status = 'paid'
          AND (p_buying_group_id IS NULL OR p2.created_by = p_buying_group_id)
      ), 0),
      'totalGpoShare',      COALESCE((
        SELECT SUM(pp.gpo_share) FROM pharmacy_payments pp
        JOIN pharmacy p2 ON p2.id = pp.pharmacy_id
        WHERE COALESCE(p2.gpo_affiliation, 'No GPO') = COALESCE(ph.gpo_affiliation, 'No GPO')
          AND (p_buying_group_id IS NULL OR p2.created_by = p_buying_group_id)
      ), 0)
    ) AS row_data,
    COALESCE(SUM(rt.total_returnable_value), 0) AS total_value
    FROM return_transactions rt
    JOIN pharmacy ph ON ph.id = rt.pharmacy_id
    WHERE (p_search IS NULL OR (
      LOWER(COALESCE(ph.gpo_affiliation, '')) LIKE '%' || LOWER(p_search) || '%'
    ))
      AND (p_buying_group_id IS NULL OR ph.created_by = p_buying_group_id)
    GROUP BY COALESCE(ph.gpo_affiliation, 'No GPO')
    ORDER BY total_value DESC
    LIMIT p_limit OFFSET v_offset
  ) sub;

  RETURN jsonb_build_object(
    'error', false,
    'data', v_rows,
    'pagination', jsonb_build_object(
      'page', p_page, 'limit', p_limit, 'total', v_total,
      'totalPages', CEIL(GREATEST(v_total, 1)::float / p_limit)::integer
    )
  );
END;
$$;


-- ────────────────────────────────────────────────────────────
-- 9. Fix get_admin_analytics topProducts OR-precedence bug
--    Wrap the OR condition in parentheses so the buying group
--    filter applies to BOTH proprietary_name and generic_name branches.
-- ────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION get_admin_analytics(
  p_buying_group_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
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
$$;


-- ────────────────────────────────────────────────────────────
-- 10. payment_ask_vs_received
-- ────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION payment_ask_vs_received(
  p_group_by        TEXT DEFAULT 'manufacturer',
  p_period          TEXT DEFAULT NULL,
  p_page            INTEGER DEFAULT 1,
  p_limit           INTEGER DEFAULT 20,
  p_buying_group_id UUID DEFAULT NULL
)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER AS $$
DECLARE
  v_rows jsonb;
  v_totals jsonb;
  v_total_count INTEGER;
  v_offset INTEGER;
BEGIN
  v_offset := (p_page - 1) * p_limit;

  IF p_group_by = 'manufacturer' THEN
    SELECT COUNT(*) INTO v_total_count
    FROM (
      SELECT d.labeler_id, d.labeler_name
      FROM debit_memos d
      JOIN pharmacy ph ON ph.id = d.pharmacy_id
      WHERE (p_period IS NULL OR TO_CHAR(d.created_at, 'YYYY-MM') = p_period)
        AND (p_buying_group_id IS NULL OR ph.created_by = p_buying_group_id)
      GROUP BY d.labeler_id, d.labeler_name
    ) sub;

    SELECT COALESCE(jsonb_agg(row_data ORDER BY (row_data->>'totalAskValue')::decimal DESC), '[]'::jsonb)
    INTO v_rows
    FROM (
      SELECT jsonb_build_object(
        'labelerId',      d.labeler_id,
        'labelerName',    COALESCE(d.labeler_name, ''),
        'memoCount',      COUNT(*),
        'totalItems',     SUM(d.total_items),
        'totalAskValue',  SUM(d.amount_requested),
        'totalReceived',  SUM(d.amount_received),
        'difference',     SUM(d.amount_requested) - SUM(d.amount_received),
        'payPercent',     CASE WHEN SUM(d.amount_requested) > 0
                            THEN ROUND(SUM(d.amount_received) / SUM(d.amount_requested) * 100, 2)
                            ELSE 0 END,
        'paidCount',      SUM(CASE WHEN d.payment_status = 'paid' THEN 1 ELSE 0 END),
        'unpaidCount',    SUM(CASE WHEN d.payment_status IN ('pending', 'partial') THEN 1 ELSE 0 END)
      ) AS row_data
      FROM debit_memos d
      JOIN pharmacy ph ON ph.id = d.pharmacy_id
      WHERE (p_period IS NULL OR TO_CHAR(d.created_at, 'YYYY-MM') = p_period)
        AND (p_buying_group_id IS NULL OR ph.created_by = p_buying_group_id)
      GROUP BY d.labeler_id, d.labeler_name
      ORDER BY SUM(d.amount_requested) DESC
      LIMIT p_limit OFFSET v_offset
    ) sub;
  ELSE
    SELECT COUNT(*) INTO v_total_count
    FROM (
      SELECT TO_CHAR(d.created_at, 'YYYY-MM')
      FROM debit_memos d
      JOIN pharmacy ph ON ph.id = d.pharmacy_id
      WHERE (p_buying_group_id IS NULL OR ph.created_by = p_buying_group_id)
      GROUP BY TO_CHAR(d.created_at, 'YYYY-MM')
    ) sub;

    SELECT COALESCE(jsonb_agg(row_data ORDER BY row_data->>'period'), '[]'::jsonb)
    INTO v_rows
    FROM (
      SELECT jsonb_build_object(
        'period',         TO_CHAR(d.created_at, 'YYYY-MM'),
        'memoCount',      COUNT(*),
        'totalAskValue',  SUM(d.amount_requested),
        'totalReceived',  SUM(d.amount_received),
        'difference',     SUM(d.amount_requested) - SUM(d.amount_received),
        'payPercent',     CASE WHEN SUM(d.amount_requested) > 0
                            THEN ROUND(SUM(d.amount_received) / SUM(d.amount_requested) * 100, 2)
                            ELSE 0 END
      ) AS row_data
      FROM debit_memos d
      JOIN pharmacy ph ON ph.id = d.pharmacy_id
      WHERE (p_buying_group_id IS NULL OR ph.created_by = p_buying_group_id)
      GROUP BY TO_CHAR(d.created_at, 'YYYY-MM')
      ORDER BY TO_CHAR(d.created_at, 'YYYY-MM') DESC
      LIMIT p_limit OFFSET v_offset
    ) sub;
  END IF;

  SELECT jsonb_build_object(
    'totalMemos',      COUNT(*),
    'totalAskValue',   COALESCE(SUM(d.amount_requested), 0),
    'totalReceived',   COALESCE(SUM(d.amount_received), 0),
    'totalDifference', COALESCE(SUM(d.amount_requested) - SUM(d.amount_received), 0),
    'overallPayPercent', CASE WHEN SUM(d.amount_requested) > 0
                           THEN ROUND(SUM(d.amount_received) / SUM(d.amount_requested) * 100, 2)
                           ELSE 0 END
  ) INTO v_totals
  FROM debit_memos d
  JOIN pharmacy ph ON ph.id = d.pharmacy_id
  WHERE (p_period IS NULL OR TO_CHAR(d.created_at, 'YYYY-MM') = p_period)
    AND (p_buying_group_id IS NULL OR ph.created_by = p_buying_group_id);

  RETURN jsonb_build_object(
    'error', false,
    'data', v_rows,
    'totals', v_totals,
    'pagination', jsonb_build_object(
      'page', p_page,
      'limit', p_limit,
      'total', v_total_count,
      'totalPages', CEIL(v_total_count::decimal / p_limit)
    )
  );
END;
$$;


-- ────────────────────────────────────────────────────────────
-- 11. payment_manufacturer_summary
-- ────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION payment_manufacturer_summary(
  p_search          TEXT DEFAULT NULL,
  p_page            INTEGER DEFAULT 1,
  p_limit           INTEGER DEFAULT 20,
  p_buying_group_id UUID DEFAULT NULL
)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER AS $$
DECLARE
  v_offset INTEGER;
  v_total  INTEGER;
  v_rows   jsonb;
BEGIN
  v_offset := (GREATEST(p_page, 1) - 1) * p_limit;

  SELECT COUNT(DISTINCT d.labeler_id) INTO v_total
  FROM debit_memos d
  JOIN pharmacy ph ON ph.id = d.pharmacy_id
  WHERE (p_search IS NULL OR (
    LOWER(COALESCE(d.labeler_name, '')) LIKE '%' || LOWER(p_search) || '%'
    OR d.labeler_id LIKE '%' || p_search || '%'
  ))
  AND (p_buying_group_id IS NULL OR ph.created_by = p_buying_group_id);

  SELECT COALESCE(jsonb_agg(row_data ORDER BY (row_data->>'outstandingAmount')::decimal DESC), '[]'::jsonb)
  INTO v_rows
  FROM (
    SELECT jsonb_build_object(
      'labelerId',         d.labeler_id,
      'labelerName',       COALESCE(MAX(d.labeler_name), ''),
      'totalMemos',        COUNT(*),
      'unpaidMemos',       SUM(CASE WHEN d.payment_status IN ('pending', 'partial') THEN 1 ELSE 0 END),
      'paidMemos',         SUM(CASE WHEN d.payment_status = 'paid' THEN 1 ELSE 0 END),
      'disputedMemos',     SUM(CASE WHEN d.payment_status = 'disputed' THEN 1 ELSE 0 END),
      'totalAskValue',     SUM(d.amount_requested),
      'totalPaidAmount',   SUM(d.amount_received),
      'outstandingAmount', SUM(d.amount_requested) - SUM(d.amount_received),
      'averagePayPercent', CASE WHEN SUM(d.amount_requested) > 0
                             THEN ROUND(SUM(d.amount_received) / SUM(d.amount_requested) * 100, 2)
                             ELSE 0 END,
      'averageDaysToPay',  COALESCE(
        ROUND(AVG(
          CASE WHEN d.payment_received_at IS NOT NULL AND d.ra_requested_at IS NOT NULL
            THEN EXTRACT(DAY FROM d.payment_received_at - d.ra_requested_at)
            ELSE NULL END
        )::numeric, 0)::integer,
        0
      ),
      'policyAvgPayPercent', (
        SELECT mp.average_pay_percent
        FROM manufacturer_policies mp
        WHERE mp.labeler_id = d.labeler_id
        LIMIT 1
      ),
      'policyAvgDaysToPay', (
        SELECT mp.average_days_to_pay
        FROM manufacturer_policies mp
        WHERE mp.labeler_id = d.labeler_id
        LIMIT 1
      )
    ) AS row_data
    FROM debit_memos d
    JOIN pharmacy ph ON ph.id = d.pharmacy_id
    WHERE (p_search IS NULL OR (
      LOWER(COALESCE(d.labeler_name, '')) LIKE '%' || LOWER(p_search) || '%'
      OR d.labeler_id LIKE '%' || p_search || '%'
    ))
    AND (p_buying_group_id IS NULL OR ph.created_by = p_buying_group_id)
    GROUP BY d.labeler_id
    ORDER BY SUM(d.amount_requested) - SUM(d.amount_received) DESC
    LIMIT p_limit OFFSET v_offset
  ) sub;

  RETURN jsonb_build_object(
    'error', false,
    'data', v_rows,
    'pagination', jsonb_build_object(
      'page', p_page, 'limit', p_limit, 'total', v_total,
      'totalPages', CEIL(v_total::float / p_limit)::integer
    )
  );
END;
$$;


-- ────────────────────────────────────────────────────────────
-- Grant permissions
-- ────────────────────────────────────────────────────────────

GRANT EXECUTE ON FUNCTION analytics_returns_summary(DATE, DATE, UUID, TEXT, UUID)            TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION analytics_ask_vs_received(TEXT, UUID, TEXT, INTEGER, INTEGER, UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION analytics_aging_inventory(UUID, TEXT, INTEGER, INTEGER, UUID)      TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION analytics_outstanding_ra(TEXT, TEXT, INTEGER, INTEGER, UUID)        TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION analytics_unpaid_memos(TEXT, TEXT, TEXT, INTEGER, INTEGER, UUID)    TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION analytics_price_audit(TEXT, TEXT, TEXT, INTEGER, INTEGER, UUID)     TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION analytics_pharmacy_performance(TEXT, TEXT, TEXT, INTEGER, INTEGER, UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION analytics_gpo_summary(TEXT, INTEGER, INTEGER, UUID)                TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION get_admin_analytics(UUID)                                          TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION payment_ask_vs_received(TEXT, TEXT, INTEGER, INTEGER, UUID)         TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION payment_manufacturer_summary(TEXT, INTEGER, INTEGER, UUID)          TO authenticated, service_role;
