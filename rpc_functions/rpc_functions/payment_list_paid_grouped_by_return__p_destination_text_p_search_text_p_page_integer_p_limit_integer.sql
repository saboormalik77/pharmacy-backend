-- Function : payment_list_paid_grouped_by_return
-- Arguments: p_destination text, p_search text, p_page integer, p_limit integer
-- Type     : FUNCTION
-- =============================================================

DROP FUNCTION IF EXISTS public.payment_list_paid_grouped_by_return(p_destination text, p_search text, p_page integer, p_limit integer) CASCADE;

CREATE OR REPLACE FUNCTION public.payment_list_paid_grouped_by_return(p_destination text DEFAULT NULL::text, p_search text DEFAULT NULL::text, p_page integer DEFAULT 1, p_limit integer DEFAULT 10)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
AS $function$
DECLARE
  v_offset   INTEGER;
  v_total    INTEGER;
  v_results  jsonb;
BEGIN
  v_offset := (GREATEST(p_page, 1) - 1) * p_limit;

  -- Count distinct returns that have paid memos
  SELECT COUNT(DISTINCT rt.id) INTO v_total
    FROM return_transactions rt
    JOIN debit_memo_items dmi ON dmi.transaction_item_id IN (
      SELECT rti.id FROM return_transaction_items rti WHERE rti.transaction_id = rt.id
    )
    JOIN debit_memos dm ON dm.id = dmi.debit_memo_id
   WHERE dm.payment_status IN ('paid', 'partial')
     AND (p_destination IS NULL OR dm.destination = p_destination)
     AND (
       p_search IS NULL
       OR dm.memo_number  ILIKE '%' || p_search || '%'
       OR dm.labeler_name ILIKE '%' || p_search || '%'
       OR rt.license_plate ILIKE '%' || p_search || '%'
       OR EXISTS (
         SELECT 1 FROM pharmacy p
          WHERE p.id = rt.pharmacy_id
            AND p.pharmacy_name ILIKE '%' || p_search || '%'
       )
     );

  -- Build the grouped result
  SELECT COALESCE(jsonb_agg(return_group ORDER BY return_created DESC), '[]'::jsonb)
    INTO v_results
    FROM (
      SELECT 
        jsonb_build_object(
          'returnId',       rt.id,
          'licensePlate',   rt.license_plate,
          'pharmacyId',     rt.pharmacy_id,
          'pharmacyName',   COALESCE((SELECT pharmacy_name FROM pharmacy WHERE id = rt.pharmacy_id), ''),
          'status',         rt.status,
          'returnCreatedAt', rt.created_at,
          'totalMemos',     COUNT(DISTINCT dm.id),
          'totalItems',     SUM(dm.total_items),
          'totalAskValue',  SUM(dm.amount_requested),
          'totalReceived',  SUM(dm.amount_received),
          'memos',          COALESCE(
            jsonb_agg(
              DISTINCT jsonb_build_object(
                'id',                dm.id,
                'batchId',           dm.batch_id,
                'pharmacyId',        dm.pharmacy_id,
                'pharmacyName',      COALESCE((SELECT pharmacy_name FROM pharmacy WHERE id = dm.pharmacy_id), ''),
                'memoNumber',        dm.memo_number,
                'destination',       dm.destination,
                'labelerId',         dm.labeler_id,
                'labelerName',       dm.labeler_name,
                'totalItems',        dm.total_items,
                'totalAskValue',     dm.total_ask_value,
                'totalReceivedValue', dm.total_received_value,
                'amountRequested',   dm.amount_requested,
                'amountReceived',    dm.amount_received,
                'paymentStatus',     dm.payment_status,
                'paymentReceivedAt', dm.payment_received_at,
                'paymentReference',  dm.payment_reference,
                'paymentNotes',      dm.payment_notes,
                'creditMemoUrl',     dm.credit_memo_url,
                'createdAt',         dm.created_at,
                'updatedAt',         dm.updated_at
              )
            ),
            '[]'::jsonb
          )
        ) AS return_group,
        rt.created_at AS return_created
      FROM return_transactions rt
      JOIN debit_memo_items dmi ON dmi.transaction_item_id IN (
        SELECT rti.id FROM return_transaction_items rti WHERE rti.transaction_id = rt.id
      )
      JOIN debit_memos dm ON dm.id = dmi.debit_memo_id
     WHERE dm.payment_status IN ('paid', 'partial')
       AND (p_destination IS NULL OR dm.destination = p_destination)
       AND (
         p_search IS NULL
         OR dm.memo_number  ILIKE '%' || p_search || '%'
         OR dm.labeler_name ILIKE '%' || p_search || '%'
         OR rt.license_plate ILIKE '%' || p_search || '%'
         OR EXISTS (
           SELECT 1 FROM pharmacy p
            WHERE p.id = rt.pharmacy_id
              AND p.pharmacy_name ILIKE '%' || p_search || '%'
         )
       )
     GROUP BY rt.id, rt.license_plate, rt.pharmacy_id, rt.status, rt.created_at
     ORDER BY rt.created_at DESC
     LIMIT p_limit OFFSET v_offset
    ) sub;

  RETURN jsonb_build_object(
    'error',      false,
    'data',       v_results,
    'pagination', jsonb_build_object(
      'page',       p_page,
      'limit',      p_limit,
      'total',      v_total,
      'totalPages', CEIL(v_total::numeric / GREATEST(p_limit, 1))
    )
  );
END;
$function$;
