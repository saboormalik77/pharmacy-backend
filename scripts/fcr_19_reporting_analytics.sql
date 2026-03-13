-- ============================================================
-- FCR Module 14 — Reporting & Analytics
-- Run this in Supabase SQL Editor
--
-- Contents:
--   1.  ndc_price_history table
--   2.  RPC: analytics_returns_summary (returns by period, status)
--   3.  RPC: analytics_ask_vs_received (ask vs received by manufacturer/NDC)
--   4.  RPC: analytics_aging_inventory (wine cellar aging report)
--   5.  RPC: analytics_outstanding_ra (RA aging report)
--   6.  RPC: analytics_unpaid_memos (unpaid debit memo aging)
--   7.  RPC: analytics_price_audit (NDC price source audit trail)
--   8.  RPC: analytics_pharmacy_performance (per-pharmacy performance)
--   9.  RPC: analytics_gpo_summary (per-GPO summary)
--  10.  RPC: analytics_pharmacy_dashboard (pharmacy-facing own analytics)
-- ============================================================


-- ────────────────────────────────────────────────────────────
-- 1. ndc_price_history table  (Task 14.2)
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS ndc_price_history (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ndc         VARCHAR(13) NOT NULL,
  old_price   DECIMAL(12,2),
  new_price   DECIMAL(12,2) NOT NULL,
  price_source TEXT,
  changed_by  UUID,
  changed_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_nph_ndc        ON ndc_price_history(ndc);
CREATE INDEX IF NOT EXISTS idx_nph_changed_at ON ndc_price_history(changed_at DESC);
CREATE INDEX IF NOT EXISTS idx_nph_source     ON ndc_price_history(price_source);

-- RLS
ALTER TABLE ndc_price_history ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all access via service role" ON ndc_price_history;
CREATE POLICY "Allow all access via service role" ON ndc_price_history
  FOR ALL USING (true) WITH CHECK (true);


-- ────────────────────────────────────────────────────────────
-- 2. RPC: analytics_returns_summary
--    Returns overview: count, value, breakdown by period & status.
--    Filters: p_period_start, p_period_end, p_pharmacy_id, p_group_by
-- ────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION analytics_returns_summary(
  p_period_start  DATE DEFAULT NULL,
  p_period_end    DATE DEFAULT NULL,
  p_pharmacy_id   UUID DEFAULT NULL,
  p_group_by      TEXT DEFAULT 'month'  -- 'month' | 'week' | 'status' | 'service_type'
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
$$;


-- ────────────────────────────────────────────────────────────
-- 3. RPC: analytics_ask_vs_received
--    Ask vs Received comparison by manufacturer or by NDC.
--    Filters: p_group_by ('manufacturer'|'ndc'|'destination'),
--             p_batch_id, p_period
-- ────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION analytics_ask_vs_received(
  p_group_by   TEXT DEFAULT 'manufacturer',  -- 'manufacturer' | 'ndc' | 'destination'
  p_batch_id   UUID DEFAULT NULL,
  p_period     TEXT DEFAULT NULL,  -- YYYY-MM filter
  p_page       INTEGER DEFAULT 1,
  p_limit      INTEGER DEFAULT 50
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

  -- Overall totals (unfiltered by pagination)
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
  LEFT JOIN return_batches rb ON rb.id = dm.batch_id
  WHERE (p_batch_id IS NULL OR dm.batch_id = p_batch_id)
    AND (p_period IS NULL OR TO_CHAR(rb.batch_month, 'YYYY-MM') = p_period);

  IF p_group_by = 'ndc' THEN
    -- Group by NDC
    SELECT COUNT(DISTINCT dmi.ndc) INTO v_total
    FROM debit_memo_items dmi
    JOIN debit_memos dm ON dm.id = dmi.debit_memo_id
    LEFT JOIN return_batches rb ON rb.id = dm.batch_id
    WHERE (p_batch_id IS NULL OR dm.batch_id = p_batch_id)
      AND (p_period IS NULL OR TO_CHAR(rb.batch_month, 'YYYY-MM') = p_period)
      AND dmi.ndc IS NOT NULL;

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
      LEFT JOIN return_batches rb ON rb.id = dm.batch_id
      WHERE (p_batch_id IS NULL OR dm.batch_id = p_batch_id)
        AND (p_period IS NULL OR TO_CHAR(rb.batch_month, 'YYYY-MM') = p_period)
        AND dmi.ndc IS NOT NULL
      GROUP BY dmi.ndc
      ORDER BY total_ask DESC
      LIMIT p_limit OFFSET v_offset
    ) sub;

  ELSIF p_group_by = 'destination' THEN
    -- Group by destination
    SELECT COUNT(DISTINCT dm.destination) INTO v_total
    FROM debit_memos dm
    LEFT JOIN return_batches rb ON rb.id = dm.batch_id
    WHERE (p_batch_id IS NULL OR dm.batch_id = p_batch_id)
      AND (p_period IS NULL OR TO_CHAR(rb.batch_month, 'YYYY-MM') = p_period);

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
      LEFT JOIN return_batches rb ON rb.id = dm.batch_id
      WHERE (p_batch_id IS NULL OR dm.batch_id = p_batch_id)
        AND (p_period IS NULL OR TO_CHAR(rb.batch_month, 'YYYY-MM') = p_period)
      GROUP BY dm.destination
      ORDER BY total_ask DESC
      LIMIT p_limit OFFSET v_offset
    ) sub;

  ELSE
    -- Default: group by manufacturer
    SELECT COUNT(DISTINCT dm.labeler_name) INTO v_total
    FROM debit_memos dm
    LEFT JOIN return_batches rb ON rb.id = dm.batch_id
    WHERE (p_batch_id IS NULL OR dm.batch_id = p_batch_id)
      AND (p_period IS NULL OR TO_CHAR(rb.batch_month, 'YYYY-MM') = p_period);

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
      LEFT JOIN return_batches rb ON rb.id = dm.batch_id
      WHERE (p_batch_id IS NULL OR dm.batch_id = p_batch_id)
        AND (p_period IS NULL OR TO_CHAR(rb.batch_month, 'YYYY-MM') = p_period)
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
-- 4. RPC: analytics_aging_inventory
--    Wine cellar items aging report.
-- ────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION analytics_aging_inventory(
  p_pharmacy_id  UUID DEFAULT NULL,
  p_status       TEXT DEFAULT NULL,   -- 'shelved','ready_to_return', etc.
  p_page         INTEGER DEFAULT 1,
  p_limit        INTEGER DEFAULT 20
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
  WHERE (p_pharmacy_id IS NULL OR wc.pharmacy_id = p_pharmacy_id)
    AND (p_status IS NULL OR wc.status = p_status);

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
  WHERE wc.status = 'shelved'
    AND (p_pharmacy_id IS NULL OR wc.pharmacy_id = p_pharmacy_id);

  -- Count for pagination
  SELECT COUNT(*) INTO v_total
  FROM wine_cellar wc
  WHERE (p_pharmacy_id IS NULL OR wc.pharmacy_id = p_pharmacy_id)
    AND (p_status IS NULL OR wc.status = p_status);

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
-- 5. RPC: analytics_outstanding_ra
--    RA aging report — debit memos waiting for RA responses.
-- ────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION analytics_outstanding_ra(
  p_destination TEXT DEFAULT NULL,
  p_search      TEXT DEFAULT NULL,
  p_page        INTEGER DEFAULT 1,
  p_limit       INTEGER DEFAULT 20
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
  WHERE dm.ra_requested_at IS NOT NULL
    AND dm.ra_received_at IS NULL
    AND (p_destination IS NULL OR dm.destination = p_destination)
    AND (p_search IS NULL OR (
      LOWER(COALESCE(dm.labeler_name, '')) LIKE '%' || LOWER(p_search) || '%'
      OR LOWER(dm.memo_number) LIKE '%' || LOWER(p_search) || '%'
    ));

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
  WHERE dm.ra_requested_at IS NOT NULL
    AND dm.ra_received_at IS NULL
    AND (p_destination IS NULL OR dm.destination = p_destination)
    AND (p_search IS NULL OR (
      LOWER(COALESCE(dm.labeler_name, '')) LIKE '%' || LOWER(p_search) || '%'
      OR LOWER(dm.memo_number) LIKE '%' || LOWER(p_search) || '%'
    ));

  -- Count
  SELECT COUNT(*) INTO v_total
  FROM debit_memos dm
  WHERE dm.ra_requested_at IS NOT NULL
    AND dm.ra_received_at IS NULL
    AND (p_destination IS NULL OR dm.destination = p_destination)
    AND (p_search IS NULL OR (
      LOWER(COALESCE(dm.labeler_name, '')) LIKE '%' || LOWER(p_search) || '%'
      OR LOWER(dm.memo_number) LIKE '%' || LOWER(p_search) || '%'
    ));

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
    LEFT JOIN pharmacy ph ON ph.id = dm.pharmacy_id
    LEFT JOIN return_batches rb ON rb.id = dm.batch_id
    WHERE dm.ra_requested_at IS NOT NULL
      AND dm.ra_received_at IS NULL
      AND (p_destination IS NULL OR dm.destination = p_destination)
      AND (p_search IS NULL OR (
        LOWER(COALESCE(dm.labeler_name, '')) LIKE '%' || LOWER(p_search) || '%'
        OR LOWER(dm.memo_number) LIKE '%' || LOWER(p_search) || '%'
      ))
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
-- 6. RPC: analytics_unpaid_memos
--    Unpaid debit memo aging report.
-- ────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION analytics_unpaid_memos(
  p_manufacturer TEXT DEFAULT NULL,
  p_destination  TEXT DEFAULT NULL,
  p_search       TEXT DEFAULT NULL,
  p_page         INTEGER DEFAULT 1,
  p_limit        INTEGER DEFAULT 20
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
  WHERE dm.payment_status IN ('pending', 'partial')
    AND (p_manufacturer IS NULL OR LOWER(COALESCE(dm.labeler_name, '')) LIKE '%' || LOWER(p_manufacturer) || '%')
    AND (p_destination IS NULL OR dm.destination = p_destination)
    AND (p_search IS NULL OR (
      LOWER(COALESCE(dm.labeler_name, '')) LIKE '%' || LOWER(p_search) || '%'
      OR LOWER(dm.memo_number) LIKE '%' || LOWER(p_search) || '%'
    ));

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
  WHERE dm.payment_status IN ('pending', 'partial')
    AND (p_manufacturer IS NULL OR LOWER(COALESCE(dm.labeler_name, '')) LIKE '%' || LOWER(p_manufacturer) || '%')
    AND (p_destination IS NULL OR dm.destination = p_destination)
    AND (p_search IS NULL OR (
      LOWER(COALESCE(dm.labeler_name, '')) LIKE '%' || LOWER(p_search) || '%'
      OR LOWER(dm.memo_number) LIKE '%' || LOWER(p_search) || '%'
    ));

  -- Count
  SELECT COUNT(*) INTO v_total
  FROM debit_memos dm
  WHERE dm.payment_status IN ('pending', 'partial')
    AND (p_manufacturer IS NULL OR LOWER(COALESCE(dm.labeler_name, '')) LIKE '%' || LOWER(p_manufacturer) || '%')
    AND (p_destination IS NULL OR dm.destination = p_destination)
    AND (p_search IS NULL OR (
      LOWER(COALESCE(dm.labeler_name, '')) LIKE '%' || LOWER(p_search) || '%'
      OR LOWER(dm.memo_number) LIKE '%' || LOWER(p_search) || '%'
    ));

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
    LEFT JOIN pharmacy ph ON ph.id = dm.pharmacy_id
    LEFT JOIN return_batches rb ON rb.id = dm.batch_id
    WHERE dm.payment_status IN ('pending', 'partial')
      AND (p_manufacturer IS NULL OR LOWER(COALESCE(dm.labeler_name, '')) LIKE '%' || LOWER(p_manufacturer) || '%')
      AND (p_destination IS NULL OR dm.destination = p_destination)
      AND (p_search IS NULL OR (
        LOWER(COALESCE(dm.labeler_name, '')) LIKE '%' || LOWER(p_search) || '%'
        OR LOWER(dm.memo_number) LIKE '%' || LOWER(p_search) || '%'
      ))
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
-- 7. RPC: analytics_price_audit
--    NDC price source audit trail from ndc_price_history.
-- ────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION analytics_price_audit(
  p_ndc     TEXT DEFAULT NULL,
  p_source  TEXT DEFAULT NULL,
  p_search  TEXT DEFAULT NULL,
  p_page    INTEGER DEFAULT 1,
  p_limit   INTEGER DEFAULT 50
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
-- 8. RPC: analytics_pharmacy_performance
--    Per-pharmacy performance report.
-- ────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION analytics_pharmacy_performance(
  p_search TEXT DEFAULT NULL,
  p_sort_by TEXT DEFAULT 'totalValue',  -- 'totalValue','returns','payout','avgValue'
  p_sort_dir TEXT DEFAULT 'desc',
  p_page   INTEGER DEFAULT 1,
  p_limit  INTEGER DEFAULT 20
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
      SELECT SUM(pp.pharmacy_payout) FROM pharmacy_payments pp WHERE pp.status = 'paid'
    ), 0)
  )
  INTO v_overall
  FROM return_transactions rt;

  -- Count pharmacies with returns
  SELECT COUNT(DISTINCT sub.pharmacy_id) INTO v_total
  FROM (
    SELECT rt.pharmacy_id
    FROM return_transactions rt
    JOIN pharmacy ph ON ph.id = rt.pharmacy_id
    WHERE p_search IS NULL OR (
      LOWER(ph.pharmacy_name) LIKE '%' || LOWER(p_search) || '%'
      OR ph.store_number = p_search
    )
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
      WHERE p_search IS NULL OR (
        LOWER(ph.pharmacy_name) LIKE '%' || LOWER(p_search) || '%'
        OR ph.store_number = p_search
      )
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
-- 9. RPC: analytics_gpo_summary
--    Performance report grouped by GPO affiliation.
-- ────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION analytics_gpo_summary(
  p_search TEXT DEFAULT NULL,
  p_page   INTEGER DEFAULT 1,
  p_limit  INTEGER DEFAULT 20
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
    ));

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
      ), 0),
      'totalGpoShare',      COALESCE((
        SELECT SUM(pp.gpo_share) FROM pharmacy_payments pp
        JOIN pharmacy p2 ON p2.id = pp.pharmacy_id
        WHERE COALESCE(p2.gpo_affiliation, 'No GPO') = COALESCE(ph.gpo_affiliation, 'No GPO')
      ), 0)
    ) AS row_data,
    COALESCE(SUM(rt.total_returnable_value), 0) AS total_value
    FROM return_transactions rt
    JOIN pharmacy ph ON ph.id = rt.pharmacy_id
    WHERE p_search IS NULL OR (
      LOWER(COALESCE(ph.gpo_affiliation, '')) LIKE '%' || LOWER(p_search) || '%'
    )
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
-- 10. RPC: analytics_pharmacy_dashboard
--     Pharmacy-facing: own analytics for their returns,
--     credits, estimated vs actual values.
-- ────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION analytics_pharmacy_dashboard(
  p_pharmacy_id   UUID,
  p_period_start  DATE DEFAULT NULL,
  p_period_end    DATE DEFAULT NULL
)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER AS $$
DECLARE
  v_start   DATE;
  v_end     DATE;
  v_overview jsonb;
  v_returns_trend jsonb;
  v_credits_summary jsonb;
  v_top_products jsonb;
  v_recent_returns jsonb;
BEGIN
  -- Validate pharmacy exists
  IF NOT EXISTS (SELECT 1 FROM pharmacy WHERE id = p_pharmacy_id) THEN
    RETURN jsonb_build_object('error', true, 'code', 404, 'message', 'Pharmacy not found');
  END IF;

  v_start := COALESCE(p_period_start, CURRENT_DATE - INTERVAL '12 months');
  v_end   := COALESCE(p_period_end,   CURRENT_DATE);

  -- Overview metrics
  SELECT jsonb_build_object(
    'totalReturns',          COUNT(*),
    'totalItems',            COALESCE(SUM(rt.total_items), 0),
    'totalReturnableValue',  COALESCE(SUM(rt.total_returnable_value), 0),
    'totalNonReturnableValue', COALESCE(SUM(rt.total_non_returnable_value), 0),
    'inProgressReturns',     COUNT(*) FILTER (WHERE rt.status = 'in_progress'),
    'completedReturns',      COUNT(*) FILTER (WHERE rt.status IN ('completed','finalized','received','closed_out')),
    'avgItemsPerReturn',     ROUND(COALESCE(AVG(rt.total_items), 0), 1)
  )
  INTO v_overview
  FROM return_transactions rt
  WHERE rt.pharmacy_id = p_pharmacy_id
    AND rt.created_at::date BETWEEN v_start AND v_end;

  -- Returns trend (monthly)
  SELECT COALESCE(jsonb_agg(row_data ORDER BY period_key), '[]'::jsonb)
  INTO v_returns_trend
  FROM (
    SELECT jsonb_build_object(
      'period',     TO_CHAR(DATE_TRUNC('month', rt.created_at), 'Mon YYYY'),
      'periodKey',  TO_CHAR(DATE_TRUNC('month', rt.created_at), 'YYYY-MM'),
      'returns',    COUNT(*),
      'totalValue', COALESCE(SUM(rt.total_returnable_value), 0),
      'totalItems', COALESCE(SUM(rt.total_items), 0)
    ) AS row_data,
    TO_CHAR(DATE_TRUNC('month', rt.created_at), 'YYYY-MM') AS period_key
    FROM return_transactions rt
    WHERE rt.pharmacy_id = p_pharmacy_id
      AND rt.created_at::date BETWEEN v_start AND v_end
    GROUP BY DATE_TRUNC('month', rt.created_at)
  ) sub;

  -- Credits summary
  SELECT jsonb_build_object(
    'totalCreditsReceived',  COALESCE(SUM(pp.total_credit_received), 0),
    'totalCompanyFee',       COALESCE(SUM(pp.company_fee), 0),
    'totalGpoShare',         COALESCE(SUM(pp.gpo_share), 0),
    'totalPayout',           COALESCE(SUM(pp.pharmacy_payout), 0),
    'paidPayout',            COALESCE(SUM(pp.pharmacy_payout) FILTER (WHERE pp.status = 'paid'), 0),
    'pendingPayout',         COALESCE(SUM(pp.pharmacy_payout) FILTER (WHERE pp.status IN ('pending', 'processing')), 0),
    'totalPayments',         COUNT(*),
    'estimatedVsActual',     CASE WHEN (
      SELECT SUM(rti.estimated_value) FROM return_transaction_items rti
      JOIN return_transactions rt ON rt.id = rti.transaction_id
      WHERE rt.pharmacy_id = p_pharmacy_id
    ) > 0 THEN jsonb_build_object(
      'estimatedValue', (
        SELECT COALESCE(SUM(rti.estimated_value), 0) FROM return_transaction_items rti
        JOIN return_transactions rt ON rt.id = rti.transaction_id
        WHERE rt.pharmacy_id = p_pharmacy_id
      ),
      'actualReceived', COALESCE(SUM(pp.total_credit_received), 0),
      'recoveryPercent', ROUND(
        COALESCE(SUM(pp.total_credit_received), 0) /
        GREATEST((
          SELECT COALESCE(SUM(rti.estimated_value), 0) FROM return_transaction_items rti
          JOIN return_transactions rt ON rt.id = rti.transaction_id
          WHERE rt.pharmacy_id = p_pharmacy_id
        ), 1) * 100, 1
      )
    )
    ELSE jsonb_build_object(
      'estimatedValue', 0,
      'actualReceived', 0,
      'recoveryPercent', 0
    ) END
  )
  INTO v_credits_summary
  FROM pharmacy_payments pp
  WHERE pp.pharmacy_id = p_pharmacy_id;

  -- Top returned products (by value)
  SELECT COALESCE(jsonb_agg(row_data ORDER BY total_value DESC), '[]'::jsonb)
  INTO v_top_products
  FROM (
    SELECT jsonb_build_object(
      'ndc',            rti.ndc,
      'productName',    COALESCE(rti.proprietary_name, rti.generic_name, 'Unknown'),
      'manufacturer',   rti.manufacturer,
      'totalQuantity',  SUM(rti.quantity),
      'totalValue',     COALESCE(SUM(rti.estimated_value), 0),
      'returnCount',    COUNT(*)
    ) AS row_data,
    COALESCE(SUM(rti.estimated_value), 0) AS total_value
    FROM return_transaction_items rti
    JOIN return_transactions rt ON rt.id = rti.transaction_id
    WHERE rt.pharmacy_id = p_pharmacy_id
      AND rt.created_at::date BETWEEN v_start AND v_end
    GROUP BY rti.ndc, COALESCE(rti.proprietary_name, rti.generic_name, 'Unknown'), rti.manufacturer
    ORDER BY total_value DESC
    LIMIT 10
  ) sub;

  -- Recent returns (last 5)
  SELECT COALESCE(jsonb_agg(row_data ORDER BY created_at DESC), '[]'::jsonb)
  INTO v_recent_returns
  FROM (
    SELECT jsonb_build_object(
      'id',             rt.id,
      'licensePlate',   rt.license_plate,
      'status',         rt.status,
      'totalItems',     rt.total_items,
      'returnableValue',rt.total_returnable_value,
      'serviceType',    rt.service_type,
      'createdAt',      rt.created_at
    ) AS row_data,
    rt.created_at
    FROM return_transactions rt
    WHERE rt.pharmacy_id = p_pharmacy_id
    ORDER BY rt.created_at DESC
    LIMIT 5
  ) sub;

  RETURN jsonb_build_object(
    'error', false,
    'data', jsonb_build_object(
      'periodStart',    v_start,
      'periodEnd',      v_end,
      'overview',       v_overview,
      'returnsTrend',   v_returns_trend,
      'creditsSummary', v_credits_summary,
      'topProducts',    v_top_products,
      'recentReturns',  v_recent_returns
    )
  );
END;
$$;


-- ────────────────────────────────────────────────────────────
-- Grant permissions
-- ────────────────────────────────────────────────────────────

GRANT EXECUTE ON FUNCTION analytics_returns_summary      TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION analytics_ask_vs_received      TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION analytics_aging_inventory      TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION analytics_outstanding_ra       TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION analytics_unpaid_memos         TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION analytics_price_audit          TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION analytics_pharmacy_performance TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION analytics_gpo_summary          TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION analytics_pharmacy_dashboard   TO authenticated, service_role;
