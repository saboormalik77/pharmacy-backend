-- Function : ra_generate_request_email
-- Arguments: p_debit_memo_id uuid, p_email_override text
-- Type     : FUNCTION
-- =============================================================

DROP FUNCTION IF EXISTS public.ra_generate_request_email(p_debit_memo_id uuid, p_email_override text) CASCADE;

CREATE OR REPLACE FUNCTION public.ra_generate_request_email(p_debit_memo_id uuid, p_email_override text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
AS $function$
DECLARE
  v_memo       debit_memos;
  v_pharm_name TEXT;
  v_pharm_addr TEXT;
  v_dest_email TEXT;
  v_dest_name  TEXT;
  v_items      jsonb;
  v_subject    TEXT;
  v_body       TEXT;
BEGIN
  SELECT * INTO v_memo FROM debit_memos WHERE id = p_debit_memo_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', true, 'code', 404, 'message', 'Debit memo not found');
  END IF;

  -- Pharmacy info
  SELECT pharmacy_name,
    CONCAT_WS(', ',
      NULLIF(TRIM(physical_address->>'street'), ''),
      NULLIF(TRIM(physical_address->>'city'), ''),
      NULLIF(TRIM(physical_address->>'state'), ''),
      NULLIF(TRIM(physical_address->>'zip'), '')
    )
  INTO v_pharm_name, v_pharm_addr
  FROM pharmacy WHERE id = v_memo.pharmacy_id;

  -- Destination email: override > reverse_distributors lookup by destination
  IF p_email_override IS NOT NULL AND p_email_override <> '' THEN
    v_dest_email := p_email_override;
    v_dest_name  := COALESCE(v_memo.labeler_name, '');
  ELSE
    SELECT rd.contact_email, rd.name
      INTO v_dest_email, v_dest_name
      FROM reverse_distributors rd
      WHERE LOWER(rd.name) = LOWER(v_memo.destination)
        AND rd.is_active = true
      LIMIT 1;
  END IF;

  -- Line items (ONLY returnable items - exclude non-returnable)
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'ndc', di.ndc,
    'productName', di.product_name,
    'quantity', di.quantity,
    'askPrice', di.ask_price,
    'lotNumber', di.lot_number,
    'expirationDate', di.expiration_date
  ) ORDER BY di.product_name), '[]'::jsonb)
  INTO v_items
  FROM debit_memo_items di 
  WHERE di.debit_memo_id = p_debit_memo_id
    AND COALESCE(di.is_non_returnable, FALSE) = FALSE;  -- Only returnable items

  v_subject := 'Return Authorization Request — ' || v_memo.memo_number;

  v_body := 'Dear ' || COALESCE(v_dest_name, 'Returns Department') || ','
    || E'\n\n' || 'We are requesting Return Authorization for the following items:'
    || E'\n\n' || 'Debit Memo: ' || v_memo.memo_number
    || E'\n' || 'Pharmacy: ' || COALESCE(v_pharm_name, '')
    || E'\n' || 'Address: ' || COALESCE(v_pharm_addr, '')
    || E'\n' || 'Items: ' || v_memo.total_items
    || E'\n' || 'Total Ask Value: $' || TRIM(TO_CHAR(v_memo.total_ask_value, '999,999,990.00'))
    || E'\n\n' || 'Please respond with the Return Authorization number at your earliest convenience.'
    || E'\n\n' || 'Thank you,'
    || E'\n' || 'PharmaCollect Returns Department';

  RETURN jsonb_build_object(
    'error', false,
    'data', jsonb_build_object(
      'to',           v_dest_email,
      'toName',       v_dest_name,
      'subject',      v_subject,
      'body',         v_body,
      'memoNumber',   v_memo.memo_number,
      'pharmacyName', COALESCE(v_pharm_name, ''),
      'destination',  v_memo.destination,
      'labelerName',  v_memo.labeler_name,
      'totalItems',   v_memo.total_items,
      'totalAskValue',v_memo.total_ask_value,
      'items',        v_items
    )
  );
END;
$function$;
