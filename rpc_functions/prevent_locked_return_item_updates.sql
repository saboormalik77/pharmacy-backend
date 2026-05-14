-- Function : prevent_locked_return_item_updates
-- Arguments: none
-- Type     : FUNCTION
-- =============================================================

DROP FUNCTION IF EXISTS public.prevent_locked_return_item_updates() CASCADE;

CREATE OR REPLACE FUNCTION public.prevent_locked_return_item_updates()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
  v_return_status TEXT;
BEGIN
  -- Opt-in escape hatch (set only by admin_set_item_standard_price).
  -- Falls through to the normal lock guard otherwise.
  IF current_setting('app.allow_admin_price_update', true) = 'true' THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  SELECT status INTO v_return_status
  FROM return_transactions
  WHERE id = COALESCE(NEW.transaction_id, OLD.transaction_id);

  IF NOT is_return_transaction_locked(v_return_status) THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  IF TG_OP = 'INSERT' THEN
    RAISE EXCEPTION 'Cannot add items to a "%" return. Return is locked.', v_return_status;
  END IF;

  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'Cannot delete items on a "%" return. Return is locked.', v_return_status;
  END IF;

  -- UPDATE: block only core immutable product data fields.
  IF OLD.ndc                   IS DISTINCT FROM NEW.ndc
  OR OLD.ndc_10                IS DISTINCT FROM NEW.ndc_10
  OR OLD.proprietary_name      IS DISTINCT FROM NEW.proprietary_name
  OR OLD.generic_name          IS DISTINCT FROM NEW.generic_name
  OR OLD.manufacturer          IS DISTINCT FROM NEW.manufacturer
  OR OLD.package_description   IS DISTINCT FROM NEW.package_description
  OR OLD.dosage_form           IS DISTINCT FROM NEW.dosage_form
  OR OLD.strength              IS DISTINCT FROM NEW.strength
  OR OLD.route                 IS DISTINCT FROM NEW.route
  OR OLD.lot_number            IS DISTINCT FROM NEW.lot_number
  OR OLD.serial_number         IS DISTINCT FROM NEW.serial_number
  OR OLD.expiration_date       IS DISTINCT FROM NEW.expiration_date
  OR OLD.standard_price        IS DISTINCT FROM NEW.standard_price
  OR OLD.quantity              IS DISTINCT FROM NEW.quantity
  OR OLD.full_package_size     IS DISTINCT FROM NEW.full_package_size
  OR OLD.is_partial            IS DISTINCT FROM NEW.is_partial
  OR OLD.partial_percentage    IS DISTINCT FROM NEW.partial_percentage
  OR OLD.estimated_value       IS DISTINCT FROM NEW.estimated_value
  OR OLD.dea_schedule          IS DISTINCT FROM NEW.dea_schedule
  OR OLD.dea_form_222_required IS DISTINCT FROM NEW.dea_form_222_required
  OR OLD.product_type          IS DISTINCT FROM NEW.product_type THEN
    RAISE EXCEPTION
      'Cannot modify core item data on a "%" return. '
      'Only classification and warehouse verification fields can be updated.',
      v_return_status;
  END IF;

  RETURN NEW;
END;
$function$;
