-- Function : prevent_locked_legacy_return_updates
-- Arguments: none
-- Type     : FUNCTION
-- =============================================================

DROP FUNCTION IF EXISTS public.prevent_locked_legacy_return_updates() CASCADE;

CREATE OR REPLACE FUNCTION public.prevent_locked_legacy_return_updates()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  -- Allow status transitions (handled by specific logic)
  IF TG_OP = 'UPDATE' AND OLD.status != NEW.status THEN
    RETURN NEW;
  END IF;
  
  -- Block other updates on locked returns
  IF TG_OP = 'UPDATE' AND is_legacy_return_locked(OLD.status) THEN
    RAISE EXCEPTION 'Cannot modify return with status "%". Return is locked after shipment.', OLD.status;
  END IF;
  
  RETURN NEW;
END;
$function$;
