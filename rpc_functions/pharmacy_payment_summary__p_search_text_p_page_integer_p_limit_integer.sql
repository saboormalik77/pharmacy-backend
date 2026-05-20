-- Function : pharmacy_payment_summary
-- Arguments: p_search text, p_page integer, p_limit integer
-- Type     : FUNCTION
-- =============================================================

DROP FUNCTION IF EXISTS public.pharmacy_payment_summary(p_search text, p_page integer, p_limit integer) CASCADE;

CREATE OR REPLACE FUNCTION public.pharmacy_payment_summary(p_search text DEFAULT NULL::text, p_page integer DEFAULT 1, p_limit integer DEFAULT 20)
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

  -- Count distinct pharmacies
  SELECT COUNT(DISTINCT pp.pharmacy_id)
    INTO v_total
  FROM pharmacy_payments pp
  JOIN pharmacy ph ON ph.id = pp.pharmacy_id
  WHERE p_search IS NULL OR (
    LOWER(ph.pharmacy_name) LIKE '%' || LOWER(p_search) || '%'
    OR LOWER(COALESCE(ph.gpo_affiliation, '')) LIKE '%' || LOWER(p_search) || '%'
    OR ph.store_number = p_search
  );

  -- Grouped data
  SELECT COALESCE(jsonb_agg(row_data ORDER BY total_payout DESC), '[]'::jsonb)
  INTO v_rows
  FROM (
    SELECT jsonb_build_object(
      'pharmacyId',           pp.pharmacy_id,
      'pharmacyName',         MAX(ph.pharmacy_name),
      'storeNumber',          MAX(ph.store_number),
      'gpoAffiliation',      MAX(ph.gpo_affiliation),
      'totalPayments',        COUNT(*),
      'totalCreditReceived',  SUM(pp.total_credit_received),
      'totalCompanyFee',      SUM(pp.company_fee),
      'totalGpoShare',        SUM(pp.gpo_share),
      'totalPayout',          SUM(pp.pharmacy_payout),
      'paidCount',            COUNT(*) FILTER (WHERE pp.status = 'paid'),
      'pendingCount',         COUNT(*) FILTER (WHERE pp.status IN ('pending', 'processing')),
      'lastPaidAt',           MAX(pp.paid_at)
    ) AS row_data,
    SUM(pp.pharmacy_payout) AS total_payout
    FROM pharmacy_payments pp
    JOIN pharmacy ph ON ph.id = pp.pharmacy_id
    WHERE p_search IS NULL OR (
      LOWER(ph.pharmacy_name) LIKE '%' || LOWER(p_search) || '%'
      OR LOWER(COALESCE(ph.gpo_affiliation, '')) LIKE '%' || LOWER(p_search) || '%'
      OR ph.store_number = p_search
    )
    GROUP BY pp.pharmacy_id
    ORDER BY total_payout DESC
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
