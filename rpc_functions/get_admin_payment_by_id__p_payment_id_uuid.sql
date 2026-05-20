-- Function : get_admin_payment_by_id
-- Arguments: p_payment_id uuid
-- Type     : FUNCTION
-- =============================================================

DROP FUNCTION IF EXISTS public.get_admin_payment_by_id(p_payment_id uuid) CASCADE;

CREATE OR REPLACE FUNCTION public.get_admin_payment_by_id(p_payment_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
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
$function$;
