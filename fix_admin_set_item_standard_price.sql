-- ============================================================
-- ONE-TIME FIX: admin_set_item_standard_price RPC + trigger flag
-- ============================================================
-- Why: The verification workflow needs to write standard_price onto a return
-- transaction item that belongs to a "received" (locked) return — the
-- back-propagation step after an admin saves a missing price into the
-- NDC Pricing Book. The row-level trigger
-- `prevent_locked_return_item_updates` blocks any change to standard_price
-- on a locked return.
--
-- Supabase doesn't allow setting `session_replication_role` (even from
-- SECURITY DEFINER), so we add a tiny, opt-in escape hatch:
--   * The trigger respects a custom session GUC `app.allow_admin_price_update`
--     and lets the row through when it is set to 'true'.
--   * The new SECURITY DEFINER RPC `admin_set_item_standard_price` is the
--     ONLY caller that ever sets that GUC. It sets it locally (cleared at
--     the end of the transaction), updates the row, recomputes the derived
--     values + parent totals, and restores the GUC.
--
-- All other code paths still go through the original locked guard — only
-- this single, narrowly-scoped, audited function can write standard_price.
--
-- HOW TO APPLY (one time):
-- 1) Open https://supabase.com/dashboard/project/zggtgjbokgfsbenazzpx/sql/new
-- 2) Paste this whole file.
-- 3) Click "Run".
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 1) Update the lock trigger to respect the opt-in GUC.
--    Everything else is identical to the existing trigger body.
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION prevent_locked_return_item_updates()
RETURNS trigger LANGUAGE plpgsql AS $$
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
$$;

-- Trigger definition is unchanged; just make sure it points at the updated function.
DROP TRIGGER IF EXISTS prevent_locked_return_item_updates_trigger ON return_transaction_items;
CREATE TRIGGER prevent_locked_return_item_updates_trigger
  BEFORE INSERT OR UPDATE OR DELETE ON return_transaction_items
  FOR EACH ROW EXECUTE FUNCTION prevent_locked_return_item_updates();

-- ────────────────────────────────────────────────────────────
-- 2) The audited admin RPC — the only caller allowed to set the flag.
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION admin_set_item_standard_price(
  p_item_id UUID,
  p_price   NUMERIC
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_item                  return_transaction_items;
  v_qty                   INTEGER;
  v_is_partial            BOOLEAN;
  v_partial_percentage    NUMERIC;
  v_est_value             NUMERIC;
  v_est_store_price       NUMERIC;
  v_est_store_value       NUMERIC;
  v_returnable_total      NUMERIC;
  v_non_returnable_total  NUMERIC;
BEGIN
  IF p_price IS NULL OR p_price < 0 THEN
    RETURN jsonb_build_object(
      'error', true, 'code', 400,
      'message', 'standardPrice must be a non-negative number'
    );
  END IF;

  SELECT * INTO v_item
    FROM return_transaction_items
   WHERE id = p_item_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', true, 'code', 404, 'message', 'Item not found');
  END IF;

  v_qty                := COALESCE(v_item.quantity, 1);
  v_is_partial         := COALESCE(v_item.is_partial, FALSE);
  v_partial_percentage := v_item.partial_percentage;

  IF v_is_partial AND v_partial_percentage IS NOT NULL THEN
    v_est_value := p_price * v_qty * (v_partial_percentage / 100);
  ELSE
    v_est_value := p_price * v_qty;
  END IF;

  v_est_value       := ROUND(v_est_value, 2);
  v_est_store_price := ROUND(p_price * 0.70, 2);
  v_est_store_value := ROUND(v_est_value * 0.70, 2);

  -- Opt into the trigger escape hatch for this transaction only.
  PERFORM set_config('app.allow_admin_price_update', 'true', true);

  UPDATE return_transaction_items
     SET standard_price        = p_price,
         estimated_value       = v_est_value,
         estimated_store_price = v_est_store_price,
         estimated_store_value = v_est_store_value,
         updated_at            = NOW()
   WHERE id = p_item_id
   RETURNING * INTO v_item;

  -- Re-aggregate parent transaction totals.
  SELECT COALESCE(SUM(estimated_value), 0)
    INTO v_returnable_total
    FROM return_transaction_items
   WHERE transaction_id = v_item.transaction_id
     AND return_status  = 'returnable';

  SELECT COALESCE(SUM(estimated_value), 0)
    INTO v_non_returnable_total
    FROM return_transaction_items
   WHERE transaction_id = v_item.transaction_id
     AND return_status  = 'non_returnable';

  UPDATE return_transactions
     SET total_returnable_value     = v_returnable_total,
         total_non_returnable_value = v_non_returnable_total,
         updated_at                 = NOW()
   WHERE id = v_item.transaction_id;

  -- Clear the flag for any subsequent statements in the caller's transaction.
  PERFORM set_config('app.allow_admin_price_update', 'false', true);

  RETURN jsonb_build_object('error', false, 'data', _rti_to_json(v_item));
END;
$$;

GRANT EXECUTE ON FUNCTION admin_set_item_standard_price(UUID, NUMERIC)
  TO authenticated, anon, service_role;

COMMENT ON FUNCTION admin_set_item_standard_price(UUID, NUMERIC) IS
  'Admin-only: set standard_price on a return-transaction item, recompute '
  'estimated_value / estimated_store_price / estimated_store_value, and '
  'refresh parent return totals. Bypasses the locked-return guard via the '
  'app.allow_admin_price_update GUC for this single, narrowly scoped '
  'operation only. Used by the verification flow after a missing NDC '
  'price is added to the NDC Pricing Book.';
