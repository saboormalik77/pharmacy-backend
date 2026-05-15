-- Function : pharmacy_payment_my_payments
-- Arguments: p_pharmacy_id uuid, p_status text, p_page integer, p_limit integer
-- Type     : FUNCTION
-- =============================================================

DROP FUNCTION IF EXISTS public.pharmacy_payment_my_payments(p_pharmacy_id uuid, p_status text, p_page integer, p_limit integer) CASCADE;

CREATE OR REPLACE FUNCTION public.pharmacy_payment_my_payments(p_pharmacy_id uuid, p_status text DEFAULT NULL::text, p_page integer DEFAULT 1, p_limit integer DEFAULT 20)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
AS $function$
DECLARE
  v_offset   INTEGER;
  v_total    INTEGER;
  v_rows     jsonb;
  v_summary  jsonb;
BEGIN
  -- Validate pharmacy exists
  IF NOT EXISTS (SELECT 1 FROM pharmacy WHERE id = p_pharmacy_id) THEN
    RETURN jsonb_build_object('error', true, 'code', 404, 'message', 'Pharmacy not found');
  END IF;

  v_offset := (GREATEST(p_page, 1) - 1) * p_limit;

  -- Count
  SELECT COUNT(*)
    INTO v_total
  FROM pharmacy_payments pp
  WHERE pp.pharmacy_id = p_pharmacy_id
    AND (p_status IS NULL OR pp.status = p_status);

  -- Summary totals for this pharmacy
  SELECT jsonb_build_object(
    'totalCredits',        COALESCE(SUM(pp.total_credit_received), 0),
    'totalFees',           COALESCE(SUM(pp.company_fee + pp.gpo_share), 0),
    'totalPayout',         COALESCE(SUM(pp.pharmacy_payout), 0),
    'paidPayouts',         COALESCE(SUM(pp.pharmacy_payout) FILTER (WHERE pp.status = 'paid'), 0),
    'pendingPayouts',      COALESCE(SUM(pp.pharmacy_payout) FILTER (WHERE pp.status IN ('pending', 'processing')), 0),
    'totalPayments',       COUNT(*),
    'paidCount',           COUNT(*) FILTER (WHERE pp.status = 'paid'),
    'pendingCount',        COUNT(*) FILTER (WHERE pp.status IN ('pending', 'processing'))
  )
  INTO v_summary
  FROM pharmacy_payments pp
  WHERE pp.pharmacy_id = p_pharmacy_id;

  -- Data
  SELECT COALESCE(jsonb_agg(
    _pharmacy_payment_to_json(pp)
    ORDER BY pp.created_at DESC
  ), '[]'::jsonb)
  INTO v_rows
  FROM (
    SELECT pp.*
    FROM pharmacy_payments pp
    WHERE pp.pharmacy_id = p_pharmacy_id
      AND (p_status IS NULL OR pp.status = p_status)
    ORDER BY pp.created_at DESC
    LIMIT p_limit OFFSET v_offset
  ) pp;

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
