-- Function : pharmacy_payment_my_payments
-- Arguments: p_pharmacy_id uuid, p_status text, p_date_range text, p_start_date date, p_end_date date, p_page integer, p_limit integer
-- Type     : FUNCTION
-- =============================================================

DROP FUNCTION IF EXISTS public.pharmacy_payment_my_payments(p_pharmacy_id uuid, p_status text, p_date_range text, p_start_date date, p_end_date date, p_page integer, p_limit integer) CASCADE;

CREATE OR REPLACE FUNCTION public.pharmacy_payment_my_payments(p_pharmacy_id uuid, p_status text DEFAULT NULL::text, p_date_range text DEFAULT NULL::text, p_start_date date DEFAULT NULL::date, p_end_date date DEFAULT NULL::date, p_page integer DEFAULT 1, p_limit integer DEFAULT 20)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
AS $function$
DECLARE
  v_offset             INTEGER;
  v_total              INTEGER;
  v_rows               jsonb;
  v_summary            jsonb;
  v_where_date         TEXT := '';
  v_date_filter_start  DATE;
  v_date_filter_end    DATE;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pharmacy WHERE id = p_pharmacy_id) THEN
    RETURN jsonb_build_object('error', true, 'code', 404, 'message', 'Pharmacy not found');
  END IF;

  v_offset := (GREATEST(p_page, 1) - 1) * p_limit;

  -- Resolve named date range
  IF p_date_range IS NOT NULL THEN
    CASE p_date_range
      WHEN 'this_month' THEN
        v_date_filter_start := date_trunc('month', CURRENT_DATE)::date;
        v_date_filter_end   := (date_trunc('month', CURRENT_DATE) + interval '1 month' - interval '1 day')::date;
      WHEN 'last_month' THEN
        v_date_filter_start := (date_trunc('month', CURRENT_DATE) - interval '1 month')::date;
        v_date_filter_end   := (date_trunc('month', CURRENT_DATE) - interval '1 day')::date;
      WHEN 'this_quarter' THEN
        v_date_filter_start := date_trunc('quarter', CURRENT_DATE)::date;
        v_date_filter_end   := (date_trunc('quarter', CURRENT_DATE) + interval '3 months' - interval '1 day')::date;
      WHEN 'last_quarter' THEN
        v_date_filter_start := (date_trunc('quarter', CURRENT_DATE) - interval '3 months')::date;
        v_date_filter_end   := (date_trunc('quarter', CURRENT_DATE) - interval '1 day')::date;
      WHEN 'this_year' THEN
        v_date_filter_start := date_trunc('year', CURRENT_DATE)::date;
        v_date_filter_end   := (date_trunc('year', CURRENT_DATE) + interval '1 year' - interval '1 day')::date;
      WHEN 'last_12_months' THEN
        v_date_filter_start := (CURRENT_DATE - interval '12 months')::date;
        v_date_filter_end   := CURRENT_DATE;
      ELSE NULL;
    END CASE;
  ELSIF p_start_date IS NOT NULL THEN
    v_date_filter_start := p_start_date;
    v_date_filter_end   := COALESCE(p_end_date, CURRENT_DATE);
  END IF;

  IF v_date_filter_start IS NOT NULL THEN
    v_where_date := format(
      ' AND pp.created_at >= %L AND pp.created_at <= %L ',
      v_date_filter_start::timestamptz,
      (v_date_filter_end + interval '1 day')::timestamptz
    );
  END IF;

  -- Count
  EXECUTE 'SELECT COUNT(*) FROM pharmacy_payments pp WHERE pp.pharmacy_id = $1 ' ||
    CASE WHEN p_status IS NOT NULL THEN 'AND pp.status = $2 ' ELSE '' END ||
    v_where_date
  INTO v_total
  USING p_pharmacy_id, p_status;

  -- Summary
  EXECUTE 'SELECT jsonb_build_object(
    ''totalCredits'',  COALESCE(SUM(pp.total_credit_received), 0),
    ''totalFees'',     COALESCE(SUM(pp.company_fee + pp.gpo_share), 0),
    ''totalPayout'',   COALESCE(SUM(pp.pharmacy_payout), 0),
    ''paidPayouts'',   COALESCE(SUM(pp.pharmacy_payout) FILTER (WHERE pp.status = ''paid''), 0),
    ''pendingPayouts'',COALESCE(SUM(pp.pharmacy_payout) FILTER (WHERE pp.status IN (''pending'', ''processing'')), 0),
    ''totalPayments'', COUNT(*),
    ''paidCount'',     COUNT(*) FILTER (WHERE pp.status = ''paid''),
    ''pendingCount'',  COUNT(*) FILTER (WHERE pp.status IN (''pending'', ''processing''))
  ) FROM pharmacy_payments pp WHERE pp.pharmacy_id = $1 ' ||
    CASE WHEN p_status IS NOT NULL THEN 'AND pp.status = $2 ' ELSE '' END ||
    v_where_date
  INTO v_summary
  USING p_pharmacy_id, p_status;

  -- Rows with manufacturer credits
  EXECUTE 'SELECT COALESCE(jsonb_agg(
    _pharmacy_payment_to_json(pp) || jsonb_build_object(''manufacturerCredits'', _get_manufacturer_credits(pp.id))
    ORDER BY pp.created_at DESC
  ), ''[]''::jsonb)
  FROM (
    SELECT pp.*
    FROM pharmacy_payments pp
    WHERE pp.pharmacy_id = $1 ' ||
      CASE WHEN p_status IS NOT NULL THEN 'AND pp.status = $2 ' ELSE '' END ||
      v_where_date || '
    ORDER BY pp.created_at DESC
    LIMIT $3 OFFSET $4
  ) pp'
  INTO v_rows
  USING p_pharmacy_id, p_status, p_limit, v_offset;

  RETURN jsonb_build_object(
    'error', false,
    'data', v_rows,
    'pagination', jsonb_build_object(
      'page', p_page, 'limit', p_limit, 'total', v_total,
      'totalPages', CEIL(v_total::float / p_limit)::integer
    ),
    'summary', v_summary
  );
END;
$function$;
