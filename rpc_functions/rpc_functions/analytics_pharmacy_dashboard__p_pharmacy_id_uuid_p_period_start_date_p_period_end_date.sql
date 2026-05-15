-- Function : analytics_pharmacy_dashboard
-- Arguments: p_pharmacy_id uuid, p_period_start date, p_period_end date
-- Type     : FUNCTION
-- =============================================================

DROP FUNCTION IF EXISTS public.analytics_pharmacy_dashboard(p_pharmacy_id uuid, p_period_start date, p_period_end date) CASCADE;

CREATE OR REPLACE FUNCTION public.analytics_pharmacy_dashboard(p_pharmacy_id uuid, p_period_start date DEFAULT NULL::date, p_period_end date DEFAULT NULL::date)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
AS $function$
DECLARE
  v_start   DATE;
  v_end     DATE;
  v_overview jsonb;
  v_returns_trend jsonb;
  v_credits_summary jsonb;
  v_top_products jsonb;
  v_recent_returns jsonb;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pharmacy WHERE id = p_pharmacy_id) THEN
    RETURN jsonb_build_object('error', true, 'code', 404, 'message', 'Pharmacy not found');
  END IF;

  v_start := COALESCE(p_period_start, CURRENT_DATE - INTERVAL '12 months');
  v_end   := COALESCE(p_period_end,   CURRENT_DATE);

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
$function$;
