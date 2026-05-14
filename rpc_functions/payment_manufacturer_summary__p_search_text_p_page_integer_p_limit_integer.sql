-- Function : payment_manufacturer_summary
-- Arguments: p_search text, p_page integer, p_limit integer
-- Type     : FUNCTION
-- =============================================================

DROP FUNCTION IF EXISTS public.payment_manufacturer_summary(p_search text, p_page integer, p_limit integer) CASCADE;

CREATE OR REPLACE FUNCTION public.payment_manufacturer_summary(p_search text DEFAULT NULL::text, p_page integer DEFAULT 1, p_limit integer DEFAULT 20)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
AS $function$
DECLARE
  v_offset INTEGER;
  v_total  INTEGER;
  v_rows   jsonb;
BEGIN
  v_offset := (GREATEST(p_page, 1) - 1) * p_limit;

  SELECT COUNT(DISTINCT labeler_id) INTO v_total
  FROM debit_memos d
  WHERE (p_search IS NULL OR (
    LOWER(COALESCE(d.labeler_name, '')) LIKE '%' || LOWER(p_search) || '%'
    OR d.labeler_id LIKE '%' || p_search || '%'
  ));

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
    WHERE (p_search IS NULL OR (
      LOWER(COALESCE(d.labeler_name, '')) LIKE '%' || LOWER(p_search) || '%'
      OR d.labeler_id LIKE '%' || p_search || '%'
    ))
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
$function$;
