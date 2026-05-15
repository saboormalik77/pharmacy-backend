-- Function : delete_buying_group_domain
-- Arguments: p_domain_id uuid
-- Type     : FUNCTION
-- =============================================================

DROP FUNCTION IF EXISTS public.delete_buying_group_domain(p_domain_id uuid) CASCADE;

CREATE OR REPLACE FUNCTION public.delete_buying_group_domain(p_domain_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_rows INT;
BEGIN
  DELETE FROM buying_group_domains WHERE id = p_domain_id;
  GET DIAGNOSTICS v_rows = ROW_COUNT;

  IF v_rows = 0 THEN
    RETURN jsonb_build_object('error', true, 'message', 'Domain not found');
  END IF;

  RETURN jsonb_build_object('error', false, 'message', 'Domain deleted');
END;
$function$;
