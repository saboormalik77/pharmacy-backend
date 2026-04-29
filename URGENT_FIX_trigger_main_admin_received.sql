-- ============================================================
-- URGENT FIX: Update trigger to allow Main Admin updates on "received" returns
-- ============================================================
-- This fixes the trigger that's blocking Main Admin from updating items on received returns
-- 
-- TO APPLY THIS FIX:
-- 1. Go to https://supabase.com/dashboard/project/zggtgjbokgfsbenazzpx/sql/new
-- 2. Copy and paste this entire SQL block
-- 3. Click "Run" to execute
-- ============================================================

CREATE OR REPLACE FUNCTION prevent_locked_return_item_updates()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  v_return_status TEXT;
  v_caller_role TEXT;
BEGIN
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

  -- Get current user's role/type from JWT claims
  BEGIN
    v_caller_role := current_setting('request.jwt.claims', true)::json->>'type';
  EXCEPTION
    WHEN OTHERS THEN
      v_caller_role := 'unknown';
  END;

  -- SPECIAL CASE: Allow Main Admin to update items on "received" returns for verification workflow
  IF v_return_status = 'received' AND v_caller_role IN ('main_admin', 'admin') THEN
    -- Main Admin can update any field on received returns
    RETURN NEW;
  END IF;

  -- UPDATE: block only core immutable product data fields.
  -- Allow: classification fields, warehouse verification fields
  -- (verified, actual_quantity, condition_notes), and wine_cellar_id.
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
$$;

-- Re-create the trigger (no change needed, just ensure it's current)
DROP TRIGGER IF EXISTS prevent_locked_return_item_updates_trigger ON return_transaction_items;
CREATE TRIGGER prevent_locked_return_item_updates_trigger
  BEFORE INSERT OR UPDATE OR DELETE ON return_transaction_items
  FOR EACH ROW EXECUTE FUNCTION prevent_locked_return_item_updates();

-- Grant permissions (if needed)
-- No explicit grants needed for trigger functions

-- Add comment
COMMENT ON FUNCTION prevent_locked_return_item_updates() IS 
  'Prevents updates to locked return items, but allows Main Admin to update items on received returns for verification workflow';

-- ============================================================
-- Test the fix (Optional - for verification)
-- ============================================================
-- After applying this fix, test the original API call:
-- PATCH /api/return-transactions/158216b7-e8a3-4ec4-bf90-d72efdcd1b4d/items/b4eb0b17-c3f6-46b0-a170-a19503f39451
-- Body: {"returnStatus": "returnable"}
-- This should now work for Main Admin users
-- ============================================================