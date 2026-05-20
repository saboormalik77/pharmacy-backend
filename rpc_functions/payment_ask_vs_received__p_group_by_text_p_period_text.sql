-- Function : payment_ask_vs_received
-- Arguments: p_group_by text, p_period text
-- Type     : FUNCTION
-- =============================================================

DROP FUNCTION IF EXISTS public.payment_ask_vs_received(p_group_by text, p_period text) CASCADE;

CREATE OR REPLACE FUNCTION public.payment_ask_vs_received(p_group_by text DEFAULT 'manufacturer'::text, p_period text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
AS $function$
DECLARE
  v_rows jsonb;
  v_totals jsonb;
BEGIN
  IF p_group_by = 'manufacturer' THEN
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
    ) sub;
  ELSE
    -- Group by month
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
    ) sub;
  END IF;

  -- Overall totals
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
    'totals', v_totals
  );
END;
$function$;
