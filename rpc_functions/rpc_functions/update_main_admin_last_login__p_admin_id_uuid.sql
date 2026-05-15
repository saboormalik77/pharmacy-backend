-- Function : update_main_admin_last_login
-- Arguments: p_admin_id uuid
-- Type     : FUNCTION
-- =============================================================

DROP FUNCTION IF EXISTS public.update_main_admin_last_login(p_admin_id uuid) CASCADE;

CREATE OR REPLACE FUNCTION public.update_main_admin_last_login(p_admin_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  UPDATE main_admin SET last_login_at = NOW() WHERE id = p_admin_id;
END;
$function$;
