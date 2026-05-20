-- Function : list_shipped_shipment_groups
-- Arguments: p_page integer, p_limit integer, p_destination text
-- Type     : FUNCTION
-- =============================================================

DROP FUNCTION IF EXISTS public.list_shipped_shipment_groups(p_page integer, p_limit integer, p_destination text) CASCADE;

CREATE OR REPLACE FUNCTION public.list_shipped_shipment_groups(p_page integer DEFAULT 1, p_limit integer DEFAULT 20, p_destination text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
AS $function$
DECLARE
  v_offset INTEGER;
  v_total  INTEGER;
  v_rows   jsonb;
  v_dest   TEXT := NULLIF(TRIM(COALESCE(p_destination, '')), '');
  v_lim    INTEGER := GREATEST(COALESCE(NULLIF(p_limit, 0), 20), 1);
BEGIN
  v_offset := (GREATEST(COALESCE(p_page, 1), 1) - 1) * v_lim;

  SELECT COUNT(*) INTO v_total
  FROM shipment_groups sg
  WHERE (
      sg.shipped_at IS NOT NULL
      OR (NULLIF(TRIM(COALESCE(sg.outbound_tracking, '')), '') IS NOT NULL)
    )
    AND (v_dest IS NULL OR LOWER(TRIM(COALESCE(sg.destination, ''))) = LOWER(v_dest));

  SELECT COALESCE(jsonb_agg(row_json ORDER BY shipped_sort DESC NULLS LAST), '[]'::jsonb)
  INTO v_rows
  FROM (
    SELECT
      jsonb_build_object(
        'group', _shipment_group_to_json(sg),
        'memos', (
          SELECT COALESCE(jsonb_agg(_debit_memo_to_json(d) ORDER BY d.created_at), '[]'::jsonb)
          FROM debit_memos d WHERE d.shipment_group_id = sg.id
        )
      ) AS row_json,
      COALESCE(sg.shipped_at, sg.updated_at) AS shipped_sort
    FROM shipment_groups sg
    WHERE (
        sg.shipped_at IS NOT NULL
        OR (NULLIF(TRIM(COALESCE(sg.outbound_tracking, '')), '') IS NOT NULL)
      )
      AND (v_dest IS NULL OR LOWER(TRIM(COALESCE(sg.destination, ''))) = LOWER(v_dest))
    ORDER BY COALESCE(sg.shipped_at, sg.updated_at) DESC
    LIMIT v_lim OFFSET v_offset
  ) sub;

  RETURN jsonb_build_object(
    'error', false,
    'data', v_rows,
    'pagination', jsonb_build_object(
      'page', GREATEST(COALESCE(p_page, 1), 1),
      'limit', v_lim,
      'total', v_total,
      'totalPages', CEIL(v_total::float / v_lim)::integer
    )
  );
END;
$function$;
