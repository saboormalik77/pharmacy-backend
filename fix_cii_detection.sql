-- ============================================================
-- Fix CII Items Detection for Manifest
-- ============================================================
-- This script ensures that dea_form_222_required is properly set
-- for Schedule II items, so that manifest PDFs correctly show
-- "CII Items: Yes" when Schedule II items are present.
-- ============================================================

-- Skip updating existing locked items and instead fix the manifest detection logic
-- The get_manifest_data function will be updated to detect CII items based on dea_schedule
-- in addition to the dea_form_222_required flag

-- For future items only, update unlocked items
UPDATE return_transaction_items 
SET dea_form_222_required = true 
WHERE dea_form_222_required IS NOT TRUE
  AND transaction_id IN (
    SELECT id FROM return_transactions 
    WHERE status IN ('in_progress', 'paused', 'completed')  -- Only non-verified returns
  )
  AND (
    dea_schedule = 'CII' OR          -- Primary format from dropdown: "CII"
    dea_schedule ILIKE '%CII%' OR    -- Legacy: "CII", "C-II", etc.
    dea_schedule ILIKE '%C-II%' OR 
    dea_schedule ILIKE '%C2%' OR 
    dea_schedule = 'II' OR 
    dea_schedule = '2' OR
    dea_schedule ILIKE 'Schedule II%'
  );

-- Create a function to automatically set dea_form_222_required when dea_schedule indicates Schedule II
CREATE OR REPLACE FUNCTION auto_set_dea_form_222_required()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if dea_schedule indicates Schedule II controlled substance
  -- (Only CII/Schedule II requires DEA Form 222)
  IF NEW.dea_schedule IS NOT NULL AND (
    NEW.dea_schedule = 'CII' OR      -- From dropdown: "CII" 
    NEW.dea_schedule ILIKE '%CII%' OR -- Legacy: "CII", "C-II", etc.
    NEW.dea_schedule ILIKE '%C-II%' OR 
    NEW.dea_schedule ILIKE '%C2%' OR 
    NEW.dea_schedule = 'II' OR 
    NEW.dea_schedule = '2' OR
    NEW.dea_schedule ILIKE 'Schedule II%'
  ) THEN
    NEW.dea_form_222_required := true;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically set dea_form_222_required on INSERT and UPDATE
DROP TRIGGER IF EXISTS trigger_auto_set_dea_form_222_required ON return_transaction_items;
CREATE TRIGGER trigger_auto_set_dea_form_222_required
  BEFORE INSERT OR UPDATE OF dea_schedule ON return_transaction_items
  FOR EACH ROW
  EXECUTE FUNCTION auto_set_dea_form_222_required();

-- Grant permissions
GRANT EXECUTE ON FUNCTION auto_set_dea_form_222_required() TO authenticated, anon, service_role;

-- Add comment
COMMENT ON FUNCTION auto_set_dea_form_222_required() IS 
  'Automatically sets dea_form_222_required=true when dea_schedule indicates Schedule II controlled substance';

-- ============================================================
-- Fix get_manifest_data to detect CII items based on dea_schedule
-- ============================================================
-- This ensures hasCiiItems works even if dea_form_222_required wasn't set on existing data

CREATE OR REPLACE FUNCTION get_manifest_data(p_transaction_id UUID)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER AS $$
DECLARE
  v_txn              return_transactions;
  v_pharmacy         RECORD;
  v_processor_name   TEXT;
  v_returnable_items jsonb;
  v_non_returnable   jsonb;
  v_item_count       INTEGER;
  v_returnable_count INTEGER;
  v_non_ret_count    INTEGER;
  v_returnable_value DECIMAL(12,2);
  v_non_ret_value    DECIMAL(12,2);
  v_has_cii          BOOLEAN;
BEGIN
  SELECT * INTO v_txn FROM return_transactions WHERE id = p_transaction_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', true, 'code', 404,
      'message', 'Return transaction not found');
  END IF;

  -- Pharmacy info
  SELECT
    id, pharmacy_name, npi_number, dea_number, phone, email
  INTO v_pharmacy
  FROM pharmacy
  WHERE id = v_txn.pharmacy_id;

  -- Processor name
  SELECT name INTO v_processor_name
  FROM processors
  WHERE id = v_txn.processor_id;

  -- Returnable items
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'ndc',                rti.ndc,
      'ndc10',              rti.ndc_10,
      'proprietaryName',    rti.proprietary_name,
      'genericName',        rti.generic_name,
      'manufacturer',       rti.manufacturer,
      'lotNumber',          rti.lot_number,
      'serialNumber',       rti.serial_number,
      'expirationDate',     rti.expiration_date,
      'quantity',           rti.quantity,
      'standardPrice',      rti.standard_price,
      'estimatedValue',     rti.estimated_value,
      'destination',        rti.destination,
      'deaSchedule',        rti.dea_schedule,
      'isPartial',          rti.is_partial,
      'partialPercentage',  rti.partial_percentage,
      'strength',           rti.strength,
      'dosageForm',         rti.dosage_form,
      'returnStatus',       rti.return_status
    ) ORDER BY rti.proprietary_name, rti.ndc
  ), '[]'::jsonb)
  INTO v_returnable_items
  FROM return_transaction_items rti
  WHERE rti.transaction_id = p_transaction_id
    AND rti.return_status = 'returnable';

  -- Non-returnable items
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'ndc',                rti.ndc,
      'ndc10',              rti.ndc_10,
      'proprietaryName',    rti.proprietary_name,
      'genericName',        rti.generic_name,
      'manufacturer',       rti.manufacturer,
      'lotNumber',          rti.lot_number,
      'serialNumber',       rti.serial_number,
      'expirationDate',     rti.expiration_date,
      'quantity',           rti.quantity,
      'standardPrice',      rti.standard_price,
      'estimatedValue',     rti.estimated_value,
      'destination',        rti.destination,
      'deaSchedule',        rti.dea_schedule,
      'isPartial',          rti.is_partial,
      'partialPercentage',  rti.partial_percentage,
      'strength',           rti.strength,
      'dosageForm',         rti.dosage_form,
      'returnStatus',       rti.return_status,
      'nonReturnableReason', rti.non_returnable_reason
    ) ORDER BY COALESCE(rti.non_returnable_reason, ''), rti.proprietary_name, rti.ndc
  ), '[]'::jsonb)
  INTO v_non_returnable
  FROM return_transaction_items rti
  WHERE rti.transaction_id = p_transaction_id
    AND rti.return_status = 'non_returnable';

  -- Counts and values
  SELECT COUNT(*) INTO v_item_count
    FROM return_transaction_items
   WHERE transaction_id = p_transaction_id
     AND return_status IN ('returnable', 'non_returnable', 'tbd');

  SELECT COUNT(*) INTO v_returnable_count
    FROM return_transaction_items
   WHERE transaction_id = p_transaction_id
     AND return_status = 'returnable';

  SELECT COUNT(*) INTO v_non_ret_count
    FROM return_transaction_items
   WHERE transaction_id = p_transaction_id
     AND return_status = 'non_returnable';

  SELECT COALESCE(SUM(estimated_value), 0) INTO v_returnable_value
    FROM return_transaction_items
   WHERE transaction_id = p_transaction_id
     AND return_status = 'returnable';

  SELECT COALESCE(SUM(estimated_value), 0) INTO v_non_ret_value
    FROM return_transaction_items
   WHERE transaction_id = p_transaction_id
     AND return_status = 'non_returnable';

  -- Enhanced CII detection: check both dea_form_222_required flag AND dea_schedule field
  SELECT EXISTS(
    SELECT 1 FROM return_transaction_items
    WHERE transaction_id = p_transaction_id
      AND (
        dea_form_222_required = true 
        OR dea_schedule = 'CII'
        OR dea_schedule ILIKE '%CII%'
        OR dea_schedule ILIKE '%C-II%' 
        OR dea_schedule = 'II' 
        OR dea_schedule = '2'
        OR dea_schedule ILIKE 'Schedule II%'
      )
  ) INTO v_has_cii;

  RETURN jsonb_build_object(
    'error', false,
    'data', jsonb_build_object(
      'transaction', jsonb_build_object(
        'id',                      v_txn.id,
        'licensePlate',            v_txn.license_plate,
        'status',                  v_txn.status,
        'fedexTracking',           v_txn.fedex_tracking,
        'fedexPickupConfirmation', v_txn.fedex_pickup_confirmation,
        'boxCount',                v_txn.box_count,
        'serviceType',             v_txn.service_type,
        'timeIn',                  v_txn.time_in,
        'timeOut',                 v_txn.time_out,
        'finalizedAt',             v_txn.finalized_at,
        'notes',                   v_txn.notes,
        'createdAt',               v_txn.created_at
      ),
      'pharmacy', jsonb_build_object(
        'id',           v_pharmacy.id,
        'name',         v_pharmacy.pharmacy_name,
        'npiNumber',    v_pharmacy.npi_number,
        'deaNumber',    v_pharmacy.dea_number,
        'phone',        v_pharmacy.phone,
        'email',        v_pharmacy.email
      ),
      'processor', jsonb_build_object(
        'id',   v_txn.processor_id,
        'name', v_processor_name
      ),
      'summary', jsonb_build_object(
        'totalItems',              v_item_count,
        'returnableCount',         v_returnable_count,
        'nonReturnableCount',      v_non_ret_count,
        'totalReturnableValue',    v_returnable_value,
        'totalNonReturnableValue', v_non_ret_value,
        'totalValue',              v_returnable_value,
        'hasCiiItems',             v_has_cii
      ),
      'returnableItems',    v_returnable_items,
      'nonReturnableItems', v_non_returnable
    )
  );
END;
$$;

-- Test the fix by checking current data
DO $$
DECLARE
  affected_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO affected_count 
  FROM return_transaction_items 
  WHERE dea_form_222_required = true;
  
  RAISE NOTICE 'Items with dea_form_222_required=true: %', affected_count;
END $$;