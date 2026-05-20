-- Function : check_and_surface_ready_items
-- Arguments: none
-- Type     : FUNCTION
-- =============================================================

DROP FUNCTION IF EXISTS public.check_and_surface_ready_items() CASCADE;

CREATE OR REPLACE FUNCTION public.check_and_surface_ready_items()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_surfaced_count INT;
  v_surfaced_items jsonb;
BEGIN
  -- Update status for items whose date has come
  WITH surfaced AS (
    UPDATE wine_cellar
       SET status = 'ready_to_return'
     WHERE status = 'shelved'
       AND expected_returnable_date IS NOT NULL
       AND expected_returnable_date <= CURRENT_DATE
    RETURNING *
  )
  SELECT COUNT(*), COALESCE(jsonb_agg(_wc_to_json(s)), '[]'::jsonb)
    INTO v_surfaced_count, v_surfaced_items
    FROM surfaced s;

  RETURN jsonb_build_object(
    'error', false,
    'data', jsonb_build_object(
      'surfacedCount', v_surfaced_count,
      'items',         v_surfaced_items
    )
  );
END;
$function$;
