-- Function : prevent_locked_legacy_return_item_updates
-- Arguments: none
-- Type     : FUNCTION
-- =============================================================

DROP FUNCTION IF EXISTS public.prevent_locked_legacy_return_item_updates() CASCADE;

CREATE OR REPLACE FUNCTION public.prevent_locked_legacy_return_item_updates()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
  v_return_status TEXT;
BEGIN
  -- Get the return status
  SELECT status INTO v_return_status 
  FROM returns 
  WHERE id = COALESCE(NEW.return_id, OLD.return_id);
  
  -- Block modifications on locked returns
  IF is_legacy_return_locked(v_return_status) THEN
    RAISE EXCEPTION 'Cannot modify items on return with status "%". Return is locked after shipment.', v_return_status;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$function$;
