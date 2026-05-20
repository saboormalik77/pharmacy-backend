-- Function : analytics_ask_vs_received
-- Arguments: p_group_by text, p_batch_id uuid, p_period text, p_page integer, p_limit integer, p_buying_group_id uuid
-- Type     : FUNCTION
-- =============================================================

DROP FUNCTION IF EXISTS public.analytics_ask_vs_received(p_group_by text, p_batch_id uuid, p_period text, p_page integer, p_limit integer, p_buying_group_id uuid) CASCADE;

CREATE OR REPLACE FUNCTION public.analytics_ask_vs_received(p_group_by text DEFAULT 'manufacturer'::text, p_batch_id uuid DEFAULT NULL::uuid, p_period text DEFAULT NULL::text, p_page integer DEFAULT 1, p_limit integer DEFAULT 50, p_buying_group_id uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
AS $function$
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
$function$;
