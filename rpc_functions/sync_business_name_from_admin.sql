-- Function : sync_business_name_from_admin
-- Arguments: none
-- Type     : FUNCTION
-- =============================================================

DROP FUNCTION IF EXISTS public.sync_business_name_from_admin() CASCADE;

CREATE OR REPLACE FUNCTION public.sync_business_name_from_admin()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  -- When an admin with super_admin role updates their name, sync to admin_settings
  IF NEW.role = 'super_admin' AND OLD.name IS DISTINCT FROM NEW.name THEN
    UPDATE admin_settings 
    SET business_name = NEW.name, 
        updated_at = NOW() 
    WHERE buying_group_id IS NULL OR id = 1;
  END IF;
  
  RETURN NEW;
END;
$function$;
