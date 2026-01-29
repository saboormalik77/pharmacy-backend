-- =====================================================
-- RPC Functions for Admin Payments Page
-- Fetches payment data from uploaded_documents table
-- =====================================================

-- =====================================================
-- Function 1: Get payments list with pagination, search, date filter AND stats
-- Stats are included in the response (merged from stats function)
-- =====================================================
DROP FUNCTION IF EXISTS get_admin_payments_list(text, uuid, integer, integer);
DROP FUNCTION IF EXISTS get_admin_payments_list(text, uuid, integer, integer, date, date);

CREATE OR REPLACE FUNCTION get_admin_payments_list(
  p_search text DEFAULT NULL,
  p_pharmacy_id uuid DEFAULT NULL,
  p_page integer DEFAULT 1,
  p_limit integer DEFAULT 10,
  p_start_date date DEFAULT NULL,
  p_end_date date DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_offset integer;
  v_total_count integer;
  v_total_pages integer;
  v_payments jsonb;
  v_result jsonb;
  -- Stats variables (global, not affected by search/filter)
  v_stats_total_payments integer;
  v_stats_total_amount numeric;
BEGIN
  -- Calculate offset
  v_offset := (p_page - 1) * p_limit;

  -- Get GLOBAL stats (not affected by search/filter)
  SELECT 
    COUNT(*),
    COALESCE(SUM(ud.total_credit_amount), 0)
  INTO v_stats_total_payments, v_stats_total_amount
  FROM uploaded_documents ud
  WHERE ud.total_credit_amount IS NOT NULL
    AND ud.total_credit_amount > 0;

  -- Get total count with filters (for pagination)
  SELECT COUNT(*)
  INTO v_total_count
  FROM uploaded_documents ud
  LEFT JOIN pharmacy p ON p.id = ud.pharmacy_id
  LEFT JOIN reverse_distributors rd ON rd.id = ud.reverse_distributor_id
  WHERE ud.total_credit_amount IS NOT NULL
    AND ud.total_credit_amount > 0
    AND (
      p_search IS NULL 
      OR p_search = ''
      OR p.pharmacy_name ILIKE p_search || '%'
      OR p.name ILIKE p_search || '%'
      OR ud.id::text ILIKE p_search || '%'
      OR rd.name ILIKE p_search || '%'
    )
    AND (p_pharmacy_id IS NULL OR ud.pharmacy_id = p_pharmacy_id)
    AND (p_start_date IS NULL OR COALESCE(ud.report_date, ud.uploaded_at::date) >= p_start_date)
    AND (p_end_date IS NULL OR COALESCE(ud.report_date, ud.uploaded_at::date) <= p_end_date);

  -- Calculate total pages
  v_total_pages := CEIL(v_total_count::numeric / p_limit);

  -- Get payments with joins
  -- IMPORTANT: Use subquery to properly ORDER before LIMIT/OFFSET for correct pagination
  -- When date filters are provided, sort by date (report_date or uploaded_at) DESC
  -- Otherwise, sort by uploaded_at DESC (newest first)
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'id', sub.id,
      'paymentId', 'PAY-' || SUBSTRING(sub.id::text FROM 1 FOR 8),
      'pharmacyId', sub.pharmacy_id,
      'pharmacyName', sub.pharmacy_name,
      'pharmacyEmail', sub.pharmacy_email,
      'amount', sub.total_credit_amount,
      'date', sub.effective_date,
      'uploadedAt', sub.uploaded_at,
      'reportDate', sub.report_date,
      'method', sub.method,
      'source', sub.source,
      'transactionId', 'TXN-' || SUBSTRING(sub.id::text FROM 1 FOR 12),
      'distributorId', sub.reverse_distributor_id,
      'distributorName', sub.distributor_name,
      'distributorCode', sub.distributor_code,
      'fileName', sub.file_name,
      'fileType', sub.file_type,
      'fileUrl', sub.file_url,
      'extractedItems', sub.extracted_items,
      'processedAt', sub.processed_at
    )
  ), '[]'::jsonb)
  INTO v_payments
  FROM (
    -- Subquery to properly order and paginate results
    SELECT 
      ud.id,
      ud.pharmacy_id,
      COALESCE(p.pharmacy_name, p.name, 'Unknown Pharmacy') AS pharmacy_name,
      p.email AS pharmacy_email,
      ud.total_credit_amount,
      COALESCE(ud.report_date, ud.uploaded_at::date) AS effective_date,
      ud.uploaded_at,
      ud.report_date,
      CASE ud.source
        WHEN 'manual_upload' THEN 'Manual Upload'
        WHEN 'email_forward' THEN 'Email Forward'
        WHEN 'portal_fetch' THEN 'Portal Fetch'
        WHEN 'api' THEN 'API'
        ELSE ud.source
      END AS method,
      ud.source,
      ud.reverse_distributor_id,
      COALESCE(rd.name, 'Unknown Distributor') AS distributor_name,
      rd.code AS distributor_code,
      ud.file_name,
      ud.file_type,
      ud.file_url,
      ud.extracted_items,
      ud.processed_at
  FROM uploaded_documents ud
  LEFT JOIN pharmacy p ON p.id = ud.pharmacy_id
  LEFT JOIN reverse_distributors rd ON rd.id = ud.reverse_distributor_id
  WHERE ud.total_credit_amount IS NOT NULL
    AND ud.total_credit_amount > 0
    AND (
      p_search IS NULL 
      OR p_search = ''
      OR p.pharmacy_name ILIKE p_search || '%'
      OR p.name ILIKE p_search || '%'
      OR ud.id::text ILIKE p_search || '%'
      OR rd.name ILIKE p_search || '%'
    )
    AND (p_pharmacy_id IS NULL OR ud.pharmacy_id = p_pharmacy_id)
    AND (p_start_date IS NULL OR COALESCE(ud.report_date, ud.uploaded_at::date) >= p_start_date)
    AND (p_end_date IS NULL OR COALESCE(ud.report_date, ud.uploaded_at::date) <= p_end_date)
    -- Sort by date when date filters are provided, otherwise by uploaded_at
    ORDER BY 
      CASE 
        WHEN p_start_date IS NOT NULL OR p_end_date IS NOT NULL 
        THEN COALESCE(ud.report_date, ud.uploaded_at::date)
        ELSE ud.uploaded_at::date
      END DESC,
      ud.uploaded_at DESC  -- Secondary sort for same dates
  LIMIT p_limit
    OFFSET v_offset
  ) sub;

  -- Build result with stats included
  v_result := jsonb_build_object(
    'success', true,
    'data', jsonb_build_object(
      'payments', v_payments,
      'pagination', jsonb_build_object(
        'page', p_page,
        'limit', p_limit,
        'totalCount', v_total_count,
        'totalPages', v_total_pages,
        'hasNextPage', p_page < v_total_pages,
        'hasPreviousPage', p_page > 1
      ),
      'stats', jsonb_build_object(
        'totalPayments', v_stats_total_payments,
        'totalAmount', ROUND(v_stats_total_amount, 2)
      )
    )
  );

  RETURN v_result;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_admin_payments_list(text, uuid, integer, integer, date, date) TO authenticated;
GRANT EXECUTE ON FUNCTION get_admin_payments_list(text, uuid, integer, integer, date, date) TO service_role;

COMMENT ON FUNCTION get_admin_payments_list IS 'Get paginated list of payments with date filtering and stats included';


-- =====================================================
-- Function 2: Get single payment details by ID
-- =====================================================
DROP FUNCTION IF EXISTS get_admin_payment_by_id(uuid);

CREATE OR REPLACE FUNCTION get_admin_payment_by_id(
  p_payment_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_payment jsonb;
  v_result jsonb;
BEGIN
  -- Validate input
  IF p_payment_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Payment ID is required'
    );
  END IF;

  -- Get payment details
  SELECT jsonb_build_object(
    'id', ud.id,
    'paymentId', 'PAY-' || SUBSTRING(ud.id::text FROM 1 FOR 8),
    'pharmacyId', ud.pharmacy_id,
    'pharmacyName', COALESCE(p.pharmacy_name, p.name, 'Unknown Pharmacy'),
    'pharmacyEmail', p.email,
    'pharmacyPhone', p.phone,
    'pharmacyNpi', p.npi_number,
    'pharmacyDea', p.dea_number,
    'amount', ud.total_credit_amount,
    'date', COALESCE(ud.report_date, ud.uploaded_at::date),
    'uploadedAt', ud.uploaded_at,
    'reportDate', ud.report_date,
    'processedAt', ud.processed_at,
    'method', CASE ud.source
      WHEN 'manual_upload' THEN 'Manual Upload'
      WHEN 'email_forward' THEN 'Email Forward'
      WHEN 'portal_fetch' THEN 'Portal Fetch'
      WHEN 'api' THEN 'API'
      ELSE ud.source
    END,
    'source', ud.source,
    'transactionId', 'TXN-' || SUBSTRING(ud.id::text FROM 1 FOR 12),
    'distributorId', ud.reverse_distributor_id,
    'distributorName', COALESCE(rd.name, 'Unknown Distributor'),
    'distributorCode', rd.code,
    'distributorEmail', rd.contact_email,
    'distributorPhone', rd.contact_phone,
    'distributorAddress', rd.address,
    'fileName', ud.file_name,
    'fileSize', ud.file_size,
    'fileType', ud.file_type,
    'fileUrl', ud.file_url,
    'extractedItems', ud.extracted_items,
    'processingProgress', ud.processing_progress
  )
  INTO v_payment
  FROM uploaded_documents ud
  LEFT JOIN pharmacy p ON p.id = ud.pharmacy_id
  LEFT JOIN reverse_distributors rd ON rd.id = ud.reverse_distributor_id
  WHERE ud.id = p_payment_id;

  -- Check if payment exists
  IF v_payment IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Payment not found'
    );
  END IF;

  -- Build result
  v_result := jsonb_build_object(
    'success', true,
    'data', v_payment
  );

  RETURN v_result;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_admin_payment_by_id(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION get_admin_payment_by_id(uuid) TO service_role;

COMMENT ON FUNCTION get_admin_payment_by_id IS 'Get single payment details by document ID';
