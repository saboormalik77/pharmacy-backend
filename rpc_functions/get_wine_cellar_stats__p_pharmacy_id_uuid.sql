-- Function : get_wine_cellar_stats
-- Arguments: p_pharmacy_id uuid
-- Type     : FUNCTION
-- =============================================================

DROP FUNCTION IF EXISTS public.get_wine_cellar_stats(p_pharmacy_id uuid) CASCADE;

CREATE OR REPLACE FUNCTION public.get_wine_cellar_stats(p_pharmacy_id uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
AS $function$
DECLARE
  v_total       INT;
  v_shelved     INT;
  v_ready       INT;
  v_returned    INT;
  v_destroyed   INT;
  v_total_value DECIMAL(12,2);
BEGIN
  SELECT
    COUNT(*),
    COUNT(*) FILTER (WHERE status = 'shelved'),
    COUNT(*) FILTER (WHERE status = 'ready_to_return'),
    COUNT(*) FILTER (WHERE status = 'returned'),
    COUNT(*) FILTER (WHERE status = 'destroyed'),
    COALESCE(SUM(estimated_value) FILTER (WHERE status IN ('shelved', 'ready_to_return')), 0)
  INTO v_total, v_shelved, v_ready, v_returned, v_destroyed, v_total_value
  FROM wine_cellar
  WHERE (p_pharmacy_id IS NULL OR pharmacy_id = p_pharmacy_id);

  RETURN jsonb_build_object(
    'error', false,
    'data', jsonb_build_object(
      'totalItems',    v_total,
      'shelved',       v_shelved,
      'readyToReturn', v_ready,
      'returned',      v_returned,
      'destroyed',     v_destroyed,
      'totalValue',    v_total_value
    )
  );
END;
$function$;
