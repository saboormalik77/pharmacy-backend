-- Function : get_buying_group_domains
-- Arguments: p_buying_group_id uuid
-- Type     : FUNCTION
-- =============================================================

DROP FUNCTION IF EXISTS public.get_buying_group_domains(p_buying_group_id uuid) CASCADE;

CREATE OR REPLACE FUNCTION public.get_buying_group_domains(p_buying_group_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  RETURN COALESCE(
    (SELECT jsonb_agg(jsonb_build_object(
      'id', bgd.id,
      'domain', bgd.domain,
      'adminHostname', bgd.admin_hostname,
      'pharmacyHostname', bgd.pharmacy_hostname,
      'isActive', bgd.is_active,
      'createdAt', bgd.created_at,
      'updatedAt', bgd.updated_at
    ) ORDER BY bgd.created_at DESC)
    FROM buying_group_domains bgd
    WHERE bgd.buying_group_id = p_buying_group_id),
    '[]'::jsonb
  );
END;
$function$;
