-- Function : resolve_domain_to_buying_group
-- Arguments: p_hostname text, p_role_hint text
-- Type     : FUNCTION
-- =============================================================

DROP FUNCTION IF EXISTS public.resolve_domain_to_buying_group(p_hostname text, p_role_hint text) CASCADE;

CREATE OR REPLACE FUNCTION public.resolve_domain_to_buying_group(p_hostname text, p_role_hint text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_result JSONB;
  v_hostname TEXT;
  v_role TEXT;
BEGIN
  v_hostname := LOWER(TRIM(p_hostname));
  v_role := LOWER(TRIM(p_role_hint));

  IF v_hostname IS NULL OR v_hostname = '' THEN
    RETURN jsonb_build_object('error', true, 'message', 'Hostname is required');
  END IF;

  SELECT jsonb_build_object(
    'buying_group_id', bgd.buying_group_id,
    'domain', bgd.domain,
    'portal_type',
      CASE
        WHEN v_role = 'admin' THEN 'admin'
        WHEN v_role = 'pharmacy' THEN 'pharmacy'
        WHEN v_hostname = bgd.admin_hostname THEN 'admin'
        WHEN v_hostname = bgd.pharmacy_hostname THEN 'pharmacy'
        ELSE 'unknown'
      END,
    'is_active', bgd.is_active,
    'buying_group_name', a.name
  )
  INTO v_result
  FROM buying_group_domains bgd
  JOIN admin a ON a.id = bgd.buying_group_id
  WHERE bgd.is_active = true
    AND a.is_active = true
    AND (
      -- When role hint is provided, only match the corresponding column
      (v_role = 'admin' AND bgd.admin_hostname = v_hostname)
      OR (v_role = 'pharmacy' AND bgd.pharmacy_hostname = v_hostname)
      -- When no role hint, match any column
      OR (v_role IS NULL AND (
        bgd.admin_hostname = v_hostname
        OR bgd.pharmacy_hostname = v_hostname
        OR bgd.domain = v_hostname
      ))
    )
  LIMIT 1;

  IF v_result IS NULL THEN
    RETURN jsonb_build_object('error', true, 'message', 'Domain not recognized');
  END IF;

  RETURN jsonb_build_object('error', false, 'data', v_result);
END;
$function$;
