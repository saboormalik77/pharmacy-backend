-- Function : list_return_transactions
-- Arguments: p_pharmacy_id uuid, p_processor_id uuid, p_status text, p_date_from text, p_date_to text, p_search text, p_page integer, p_limit integer
-- Type     : FUNCTION
-- =============================================================

DROP FUNCTION IF EXISTS public.list_return_transactions(p_pharmacy_id uuid, p_processor_id uuid, p_status text, p_date_from text, p_date_to text, p_search text, p_page integer, p_limit integer) CASCADE;

CREATE OR REPLACE FUNCTION public.list_return_transactions(p_pharmacy_id uuid DEFAULT NULL::uuid, p_processor_id uuid DEFAULT NULL::uuid, p_status text DEFAULT NULL::text, p_date_from text DEFAULT NULL::text, p_date_to text DEFAULT NULL::text, p_search text DEFAULT NULL::text, p_page integer DEFAULT 1, p_limit integer DEFAULT 20)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
AS $function$
DECLARE
  v_offset   INT;
  v_total    INT;
  v_rows     jsonb;
BEGIN
  v_offset := (GREATEST(p_page, 1) - 1) * LEAST(p_limit, 100);

  -- Count
  SELECT COUNT(*) INTO v_total
    FROM return_transactions rt
   WHERE (p_pharmacy_id  IS NULL OR rt.pharmacy_id  = p_pharmacy_id)
     AND (p_processor_id IS NULL OR rt.processor_id = p_processor_id)
     AND (p_status       IS NULL OR rt.status       = p_status)
     AND (p_date_from    IS NULL OR rt.created_at  >= p_date_from::timestamptz)
     AND (p_date_to      IS NULL OR rt.created_at  <= p_date_to::timestamptz)
     AND (p_search       IS NULL OR rt.license_plate ILIKE '%' || p_search || '%');

  -- Data
  SELECT COALESCE(jsonb_agg(row_json ORDER BY created_at DESC), '[]'::jsonb)
    INTO v_rows
    FROM (
      SELECT _rt_to_json(rt) AS row_json, rt.created_at
        FROM return_transactions rt
       WHERE (p_pharmacy_id  IS NULL OR rt.pharmacy_id  = p_pharmacy_id)
         AND (p_processor_id IS NULL OR rt.processor_id = p_processor_id)
         AND (p_status       IS NULL OR rt.status       = p_status)
         AND (p_date_from    IS NULL OR rt.created_at  >= p_date_from::timestamptz)
         AND (p_date_to      IS NULL OR rt.created_at  <= p_date_to::timestamptz)
         AND (p_search       IS NULL OR rt.license_plate ILIKE '%' || p_search || '%')
       ORDER BY rt.created_at DESC
       LIMIT LEAST(p_limit, 100) OFFSET v_offset
    ) sub;

  RETURN jsonb_build_object(
    'transactions', v_rows,
    'pagination', jsonb_build_object(
      'page',       GREATEST(p_page, 1),
      'limit',      LEAST(p_limit, 100),
      'total',      v_total,
      'totalPages', CEIL(v_total::numeric / LEAST(p_limit, 100))
    )
  );
END;
$function$;
