-- Function : pharmacy_payment_list
-- Arguments: p_status text, p_pharmacy text, p_batch_id uuid, p_search text, p_page integer, p_limit integer
-- Type     : FUNCTION
-- =============================================================

DROP FUNCTION IF EXISTS public.pharmacy_payment_list(p_status text, p_pharmacy text, p_batch_id uuid, p_search text, p_page integer, p_limit integer) CASCADE;

CREATE OR REPLACE FUNCTION public.pharmacy_payment_list(p_status text DEFAULT NULL::text, p_pharmacy text DEFAULT NULL::text, p_batch_id uuid DEFAULT NULL::uuid, p_search text DEFAULT NULL::text, p_page integer DEFAULT 1, p_limit integer DEFAULT 20)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
AS $function$
DECLARE
  v_offset INTEGER;
  v_total  INTEGER;
  v_rows   jsonb;
  v_totals jsonb;
BEGIN
  v_offset := (GREATEST(p_page, 1) - 1) * p_limit;

  -- Count
  SELECT COUNT(*)
    INTO v_total
  FROM pharmacy_payments pp
  JOIN pharmacy ph ON ph.id = pp.pharmacy_id
  WHERE (p_status IS NULL OR pp.status = p_status)
    AND (p_batch_id IS NULL OR pp.batch_id = p_batch_id)
    AND (p_pharmacy IS NULL OR (
      LOWER(ph.pharmacy_name) LIKE '%' || LOWER(p_pharmacy) || '%'
      OR ph.store_number = p_pharmacy
    ))
    AND (p_search IS NULL OR (
      LOWER(ph.pharmacy_name) LIKE '%' || LOWER(p_search) || '%'
      OR LOWER(COALESCE(pp.payment_reference, '')) LIKE '%' || LOWER(p_search) || '%'
      OR LOWER(COALESCE(pp.gpo_name, '')) LIKE '%' || LOWER(p_search) || '%'
      OR ph.store_number = p_search
    ));

  -- Aggregate totals
  SELECT jsonb_build_object(
    'totalPayments',        COUNT(*),
    'totalCreditReceived',  COALESCE(SUM(pp.total_credit_received), 0),
    'totalCompanyFee',      COALESCE(SUM(pp.company_fee), 0),
    'totalGpoShare',        COALESCE(SUM(pp.gpo_share), 0),
    'totalPharmacyPayout',  COALESCE(SUM(pp.pharmacy_payout), 0),
    'paidCount',            COUNT(*) FILTER (WHERE pp.status = 'paid'),
    'pendingCount',         COUNT(*) FILTER (WHERE pp.status = 'pending'),
    'processingCount',      COUNT(*) FILTER (WHERE pp.status = 'processing')
  )
  INTO v_totals
  FROM pharmacy_payments pp
  JOIN pharmacy ph ON ph.id = pp.pharmacy_id
  WHERE (p_status IS NULL OR pp.status = p_status)
    AND (p_batch_id IS NULL OR pp.batch_id = p_batch_id)
    AND (p_pharmacy IS NULL OR (
      LOWER(ph.pharmacy_name) LIKE '%' || LOWER(p_pharmacy) || '%'
      OR ph.store_number = p_pharmacy
    ))
    AND (p_search IS NULL OR (
      LOWER(ph.pharmacy_name) LIKE '%' || LOWER(p_search) || '%'
      OR LOWER(COALESCE(pp.payment_reference, '')) LIKE '%' || LOWER(p_search) || '%'
      OR LOWER(COALESCE(pp.gpo_name, '')) LIKE '%' || LOWER(p_search) || '%'
      OR ph.store_number = p_search
    ));

  -- Data rows
  SELECT COALESCE(jsonb_agg(
    _pharmacy_payment_to_json(pp)
    ORDER BY pp.created_at DESC
  ), '[]'::jsonb)
  INTO v_rows
  FROM (
    SELECT pp.*
    FROM pharmacy_payments pp
    JOIN pharmacy ph ON ph.id = pp.pharmacy_id
    WHERE (p_status IS NULL OR pp.status = p_status)
      AND (p_batch_id IS NULL OR pp.batch_id = p_batch_id)
      AND (p_pharmacy IS NULL OR (
        LOWER(ph.pharmacy_name) LIKE '%' || LOWER(p_pharmacy) || '%'
        OR ph.store_number = p_pharmacy
      ))
      AND (p_search IS NULL OR (
        LOWER(ph.pharmacy_name) LIKE '%' || LOWER(p_search) || '%'
        OR LOWER(COALESCE(pp.payment_reference, '')) LIKE '%' || LOWER(p_search) || '%'
        OR LOWER(COALESCE(pp.gpo_name, '')) LIKE '%' || LOWER(p_search) || '%'
        OR ph.store_number = p_search
      ))
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
    'summary', v_totals
  );
END;
$function$;
