-- Function : ra_list_tracking_grouped_by_return
-- Arguments: p_ra_status text, p_destination text, p_date_from date, p_date_to date, p_search text, p_page integer, p_limit integer
-- Type     : FUNCTION
-- =============================================================

DROP FUNCTION IF EXISTS public.ra_list_tracking_grouped_by_return(p_ra_status text, p_destination text, p_date_from date, p_date_to date, p_search text, p_page integer, p_limit integer) CASCADE;
DROP FUNCTION IF EXISTS public.ra_list_tracking_grouped_by_return(p_ra_status text, p_destination text, p_date_from date, p_date_to date, p_search text, p_page integer, p_limit integer, uuid[]) CASCADE;

CREATE OR REPLACE FUNCTION public.ra_list_tracking_grouped_by_return(p_ra_status text DEFAULT NULL::text, p_destination text DEFAULT NULL::text, p_date_from date DEFAULT NULL::date, p_date_to date DEFAULT NULL::date, p_search text DEFAULT NULL::text, p_page integer DEFAULT 1, p_limit integer DEFAULT 10, p_pharmacy_ids uuid[] DEFAULT NULL::uuid[])
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
AS $function$
DECLARE
  v_offset   INTEGER;
  v_total    INTEGER;
  v_results  jsonb;
  v_summary  jsonb;
BEGIN
  v_offset := (GREATEST(p_page, 1) - 1) * p_limit;

  -- Count distinct returns that have matching debit memos
  SELECT COUNT(DISTINCT rt.id) INTO v_total
    FROM return_transactions rt
    JOIN debit_memo_items dmi ON dmi.transaction_item_id IN (
      SELECT rti.id FROM return_transaction_items rti WHERE rti.transaction_id = rt.id
    )
    JOIN debit_memos dm ON dm.id = dmi.debit_memo_id
   WHERE (p_destination IS NULL OR dm.destination = p_destination)
     AND (p_ra_status IS NULL OR dm.ra_status = p_ra_status)
     AND (p_date_from IS NULL OR dm.created_at >= p_date_from)
     AND (p_date_to IS NULL OR dm.created_at <= p_date_to + INTERVAL '1 day')
     AND (
       p_search IS NULL
       OR dm.memo_number  ILIKE '%' || p_search || '%'
       OR dm.labeler_name ILIKE '%' || p_search || '%'
       OR dm.ra_number    ILIKE '%' || p_search || '%'
       OR rt.license_plate ILIKE '%' || p_search || '%'
       OR (p_pharmacy_ids IS NOT NULL AND rt.pharmacy_id = ANY(p_pharmacy_ids))
     );

  -- Build summary (across all matching memos, not just current page)
  SELECT jsonb_build_object(
    'pending',   COUNT(*) FILTER (WHERE dm.ra_status = 'pending'),
    'requested', COUNT(*) FILTER (WHERE dm.ra_status = 'requested'),
    'received',  COUNT(*) FILTER (WHERE dm.ra_status = 'received'),
    'shipped',   COUNT(*) FILTER (WHERE dm.ra_status = 'shipped'),
    'overdue',   COUNT(*) FILTER (WHERE dm.ra_status = 'overdue'
                   OR (dm.ra_status = 'requested' AND dm.tickler_date < CURRENT_DATE))
  ) INTO v_summary
    FROM return_transactions rt
    JOIN debit_memo_items dmi ON dmi.transaction_item_id IN (
      SELECT rti.id FROM return_transaction_items rti WHERE rti.transaction_id = rt.id
    )
    JOIN debit_memos dm ON dm.id = dmi.debit_memo_id
   WHERE (p_destination IS NULL OR dm.destination = p_destination)
     AND (p_date_from IS NULL OR dm.created_at >= p_date_from)
     AND (p_date_to IS NULL OR dm.created_at <= p_date_to + INTERVAL '1 day')
     AND (
       p_search IS NULL
       OR dm.memo_number  ILIKE '%' || p_search || '%'
       OR dm.labeler_name ILIKE '%' || p_search || '%'
       OR dm.ra_number    ILIKE '%' || p_search || '%'
       OR rt.license_plate ILIKE '%' || p_search || '%'
       OR (p_pharmacy_ids IS NOT NULL AND rt.pharmacy_id = ANY(p_pharmacy_ids))
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
          'pharmacyName',   '',
          'status',         rt.status,
          'returnCreatedAt', rt.created_at,
          'totalMemos',     COUNT(DISTINCT dm.id),
          'totalItems',     SUM(dm.total_items),
          'totalAskValue',  SUM(dm.total_ask_value),
          'memos',          COALESCE(
            jsonb_agg(
              DISTINCT jsonb_build_object(
                'id',                dm.id,
                'batchId',           dm.batch_id,
                'pharmacyId',        dm.pharmacy_id,
                'pharmacyName',      '',
                'memoNumber',        dm.memo_number,
                'destination',       dm.destination,
                'labelerId',         dm.labeler_id,
                'labelerName',       dm.labeler_name,
                'totalItems',        dm.total_items,
                'totalAskValue',     dm.total_ask_value,
                'totalReceivedValue', dm.total_received_value,
                'raNumber',          dm.ra_number,
                'raRequestedAt',     dm.ra_requested_at,
                'raReceivedAt',      dm.ra_received_at,
                'raStatus',          dm.ra_status,
                'ticklerDate',       dm.tickler_date,
                'baggieManifest',    dm.baggie_manifest,
                'outboundTracking',  dm.outbound_tracking,
                'shippedAt',         dm.shipped_at,
                'paymentStatus',     dm.payment_status,
                'amountRequested',   dm.amount_requested,
                'amountReceived',    dm.amount_received,
                'paymentReceivedAt', dm.payment_received_at,
                'paymentReference',  dm.payment_reference,
                'paymentNotes',      dm.payment_notes,
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
     WHERE (p_destination IS NULL OR dm.destination = p_destination)
       AND (p_ra_status IS NULL OR dm.ra_status = p_ra_status)
       AND (p_date_from IS NULL OR dm.created_at >= p_date_from)
       AND (p_date_to IS NULL OR dm.created_at <= p_date_to + INTERVAL '1 day')
       AND (
         p_search IS NULL
         OR dm.memo_number  ILIKE '%' || p_search || '%'
         OR dm.labeler_name ILIKE '%' || p_search || '%'
         OR dm.ra_number    ILIKE '%' || p_search || '%'
         OR rt.license_plate ILIKE '%' || p_search || '%'
         OR (p_pharmacy_ids IS NOT NULL AND rt.pharmacy_id = ANY(p_pharmacy_ids))
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
    ),
    'summary',    v_summary
  );
END;
$function$;
