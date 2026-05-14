-- Function : list_debit_memos
-- Arguments: p_batch_id uuid, p_pharmacy_id uuid, p_destination text, p_payment_status text, p_search text, p_page integer, p_limit integer, p_pharmacy_ids uuid[]
-- Type     : FUNCTION
-- NOTE     : p_pharmacy_ids is passed by backend (pre-resolved from BG Admin) for pharmacy name search
-- =============================================================

DROP FUNCTION IF EXISTS public.list_debit_memos(uuid, uuid, text, text, text, integer, integer) CASCADE;
DROP FUNCTION IF EXISTS public.list_debit_memos(uuid, uuid, text, text, text, integer, integer, uuid[]) CASCADE;

CREATE OR REPLACE FUNCTION public.list_debit_memos(p_batch_id uuid DEFAULT NULL::uuid, p_pharmacy_id uuid DEFAULT NULL::uuid, p_destination text DEFAULT NULL::text, p_payment_status text DEFAULT NULL::text, p_search text DEFAULT NULL::text, p_page integer DEFAULT 1, p_limit integer DEFAULT 20, p_pharmacy_ids uuid[] DEFAULT NULL::uuid[])
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
AS $function$
DECLARE
  v_offset   INTEGER;
  v_total    INTEGER;
  v_results  jsonb;
  v_statuses text[];
BEGIN
  v_offset := (GREATEST(p_page, 1) - 1) * p_limit;

  IF p_payment_status IS NOT NULL THEN
    v_statuses := string_to_array(p_payment_status, ',');
  END IF;

  SELECT COUNT(*) INTO v_total
    FROM debit_memos dm
   WHERE (p_batch_id IS NULL    OR dm.batch_id    = p_batch_id)
     AND (p_pharmacy_id IS NULL OR dm.pharmacy_id = p_pharmacy_id)
     AND (p_destination IS NULL OR dm.destination = p_destination)
     AND (v_statuses IS NULL    OR dm.payment_status = ANY(v_statuses))
     AND (
       p_search IS NULL
       OR dm.memo_number  ILIKE '%' || p_search || '%'
       OR dm.labeler_name ILIKE '%' || p_search || '%'
       OR dm.ra_number    ILIKE '%' || p_search || '%'
       OR (p_pharmacy_ids IS NOT NULL AND dm.pharmacy_id = ANY(p_pharmacy_ids))
     );

  SELECT COALESCE(jsonb_agg(row_json ORDER BY created_at DESC), '[]'::jsonb)
    INTO v_results
    FROM (
      SELECT _debit_memo_to_json(dm) AS row_json, dm.created_at
        FROM debit_memos dm
       WHERE (p_batch_id IS NULL    OR dm.batch_id    = p_batch_id)
         AND (p_pharmacy_id IS NULL OR dm.pharmacy_id = p_pharmacy_id)
         AND (p_destination IS NULL OR dm.destination = p_destination)
         AND (v_statuses IS NULL    OR dm.payment_status = ANY(v_statuses))
         AND (
           p_search IS NULL
           OR dm.memo_number  ILIKE '%' || p_search || '%'
           OR dm.labeler_name ILIKE '%' || p_search || '%'
           OR dm.ra_number    ILIKE '%' || p_search || '%'
           OR (p_pharmacy_ids IS NOT NULL AND dm.pharmacy_id = ANY(p_pharmacy_ids))
         )
       ORDER BY dm.created_at DESC
       LIMIT p_limit OFFSET v_offset
    ) sub;

  RETURN jsonb_build_object(
    'error',      false,
    'data',       v_results,
    'pagination', jsonb_build_object(
      'page',       p_page,
      'limit',      p_limit,
      'total',      v_total,
      'totalPages', CEIL(v_total::numeric / p_limit)
    )
  );
END;
$function$;
