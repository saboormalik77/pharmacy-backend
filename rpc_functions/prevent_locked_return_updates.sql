-- Function : prevent_locked_return_updates
-- Arguments: none
-- Type     : FUNCTION
-- =============================================================

DROP FUNCTION IF EXISTS public.prevent_locked_return_updates() CASCADE;

CREATE OR REPLACE FUNCTION public.prevent_locked_return_updates()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    RETURN NEW;
  END IF;

  IF OLD.verified_at IS DISTINCT FROM NEW.verified_at
     OR OLD.verified_by IS DISTINCT FROM NEW.verified_by
     OR OLD.pieces_received IS DISTINCT FROM NEW.pieces_received
     OR OLD.verified_integrity IS DISTINCT FROM NEW.verified_integrity
     OR OLD.received_in_warehouse_date IS DISTINCT FROM NEW.received_in_warehouse_date THEN
    RETURN NEW;
  END IF;

  IF OLD.batch_id IS DISTINCT FROM NEW.batch_id THEN
    RETURN NEW;
  END IF;

  IF is_return_transaction_locked(OLD.status) THEN
    IF OLD.fedex_tracking IS DISTINCT FROM NEW.fedex_tracking
       OR OLD.fedex_pickup_confirmation IS DISTINCT FROM NEW.fedex_pickup_confirmation
       OR OLD.service_type IS DISTINCT FROM NEW.service_type THEN
      RAISE EXCEPTION 'Cannot modify tracking/service type on a "%" return.', OLD.status;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$;
