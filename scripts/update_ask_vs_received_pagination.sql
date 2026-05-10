-- Update payment_ask_vs_received function to support pagination
-- This adds p_page and p_limit parameters for 10x10 pagination

CREATE OR REPLACE FUNCTION payment_ask_vs_received(
  p_group_by TEXT DEFAULT 'manufacturer',
  p_period   TEXT DEFAULT NULL,
  p_page     INTEGER DEFAULT 1,
  p_limit    INTEGER DEFAULT 20
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
    -- Get total count for pagination
    SELECT COUNT(*) INTO v_total_count
    FROM (
      SELECT d.labeler_id, d.labeler_name
      FROM debit_memos d
      WHERE (p_period IS NULL OR TO_CHAR(d.created_at, 'YYYY-MM') = p_period)
      GROUP BY d.labeler_id, d.labeler_name
    ) sub;

    -- Get paginated data
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
      WHERE (p_period IS NULL OR TO_CHAR(d.created_at, 'YYYY-MM') = p_period)
      GROUP BY d.labeler_id, d.labeler_name
      ORDER BY SUM(d.amount_requested) DESC
      LIMIT p_limit OFFSET v_offset
    ) sub;
  ELSE
    -- Group by month
    -- Get total count for pagination
    SELECT COUNT(*) INTO v_total_count
    FROM (
      SELECT TO_CHAR(d.created_at, 'YYYY-MM')
      FROM debit_memos d
      GROUP BY TO_CHAR(d.created_at, 'YYYY-MM')
    ) sub;

    -- Get paginated data
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
      GROUP BY TO_CHAR(d.created_at, 'YYYY-MM')
      ORDER BY TO_CHAR(d.created_at, 'YYYY-MM') DESC
      LIMIT p_limit OFFSET v_offset
    ) sub;
  END IF;

  -- Overall totals (not paginated)
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
  WHERE (p_period IS NULL OR TO_CHAR(d.created_at, 'YYYY-MM') = p_period);

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