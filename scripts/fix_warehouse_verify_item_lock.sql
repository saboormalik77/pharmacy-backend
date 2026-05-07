-- FIX: warehouse_verify_item blocked by strict locking trigger
--
-- Root Cause:
--   The `prevent_locked_return_item_updates` trigger (from fcr_29) raises an
--   exception for ALL updates on return_transaction_items when the parent
--   return has a locked status (finalized, received, verified, etc.).
--
--   warehouse_verify_item needs to update the `verified`, `actual_quantity`,
--   and `condition_notes` columns — which are warehouse-only fields that must
--   be editable even on locked returns.
--
-- Fix:
--   Replace the strict trigger with a granular version that:
--   - BLOCKS changes to core product data (ndc, lot, price, qty, etc.)
--   - ALLOWS classification fields (return_status, destination, memo, etc.)
--   - ALLOWS warehouse verification fields (verified, actual_quantity, condition_notes)
--   - BLOCKS INSERT and DELETE on locked returns
--
-- Run this ONCE in Supabase SQL Editor.
-- ============================================================

CREATE OR REPLACE FUNCTION prevent_locked_return_item_updates()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  v_return_status TEXT;
BEGIN
  SELECT status INTO v_return_status
  FROM return_transactions
  WHERE id = COALESCE(NEW.transaction_id, OLD.transaction_id);

  -- Not locked — allow everything
  IF NOT is_return_transaction_locked(v_return_status) THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  -- Always block INSERT on locked returns
  IF TG_OP = 'INSERT' THEN
    RAISE EXCEPTION 'Cannot add items to a "%" return. Return is locked.', v_return_status;
  END IF;

  -- Always block DELETE on locked returns
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'Cannot delete items on a "%" return. Return is locked.', v_return_status;
  END IF;

  -- UPDATE on locked returns:
  -- Block changes to core immutable product data fields only.
  -- Allow: classification fields, warehouse verification fields, and wine_cellar_id.
  IF OLD.ndc                 IS DISTINCT FROM NEW.ndc
  OR OLD.ndc_10              IS DISTINCT FROM NEW.ndc_10
  OR OLD.proprietary_name    IS DISTINCT FROM NEW.proprietary_name
  OR OLD.generic_name        IS DISTINCT FROM NEW.generic_name
  OR OLD.manufacturer        IS DISTINCT FROM NEW.manufacturer
  OR OLD.package_description IS DISTINCT FROM NEW.package_description
  OR OLD.dosage_form         IS DISTINCT FROM NEW.dosage_form
  OR OLD.strength            IS DISTINCT FROM NEW.strength
  OR OLD.route               IS DISTINCT FROM NEW.route
  OR OLD.lot_number          IS DISTINCT FROM NEW.lot_number
  OR OLD.serial_number       IS DISTINCT FROM NEW.serial_number
  OR OLD.expiration_date     IS DISTINCT FROM NEW.expiration_date
  OR OLD.standard_price      IS DISTINCT FROM NEW.standard_price
  OR OLD.quantity            IS DISTINCT FROM NEW.quantity
  OR OLD.full_package_size   IS DISTINCT FROM NEW.full_package_size
  OR OLD.is_partial          IS DISTINCT FROM NEW.is_partial
  OR OLD.partial_percentage  IS DISTINCT FROM NEW.partial_percentage
  OR OLD.estimated_value     IS DISTINCT FROM NEW.estimated_value
  OR OLD.dea_schedule        IS DISTINCT FROM NEW.dea_schedule
  OR OLD.dea_form_222_required IS DISTINCT FROM NEW.dea_form_222_required
  OR OLD.product_type        IS DISTINCT FROM NEW.product_type THEN
    RAISE EXCEPTION
      'Cannot modify core item data on a "%" return. '
      'Only classification fields (destination, return_status, memo) '
      'and warehouse verification fields (verified, actual_quantity, condition_notes) '
      'can be updated.',
      v_return_status;
  END IF;

  -- All other field changes (classification + warehouse verification) are allowed
  RETURN NEW;
END;
$$;

-- Re-apply the trigger (covers INSERT, UPDATE, DELETE)
DROP TRIGGER IF EXISTS prevent_locked_return_item_updates_trigger ON return_transaction_items;
CREATE TRIGGER prevent_locked_return_item_updates_trigger
  BEFORE INSERT OR UPDATE OR DELETE ON return_transaction_items
  FOR EACH ROW EXECUTE FUNCTION prevent_locked_return_item_updates();
