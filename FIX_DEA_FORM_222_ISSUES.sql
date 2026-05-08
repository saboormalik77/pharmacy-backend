-- ============================================================
-- FIX: DEA Form 222 Issues
-- 
-- Problems:
-- 1. Missing DEA expiry date in the form
-- 2. Alignment issues
-- 3. Missing pkg size, full qty, partial qty info (like verify item screen)
-- 4. Remove price and value fields
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 1. Update get_dea_form_222_data function to include DEA expiry date and pkg/qty fields
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_dea_form_222_data(p_transaction_id uuid) 
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER
AS $$
DECLARE
  v_txn          return_transactions;
  v_pharmacy     RECORD;
  v_items        jsonb;
  v_item_count   INTEGER;
  v_total_value  DECIMAL(12,2);
BEGIN
  -- Fetch the transaction
  SELECT * INTO v_txn FROM return_transactions WHERE id = p_transaction_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', true, 'code', 404,
      'message', 'Return transaction not found');
  END IF;

  -- Fetch pharmacy info including DEA expiration date
  SELECT
    id, pharmacy_name, npi_number, dea_number, dea_expiration_date, phone, email
  INTO v_pharmacy
  FROM pharmacy
  WHERE id = v_txn.pharmacy_id;

  -- Schedule II items only (dea_form_222_required = true)
  -- Include pkg size, full/partial qty fields and exclude price/value
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'ndc',                    rti.ndc,
      'ndc10',                  rti.ndc_10,
      'proprietaryName',        rti.proprietary_name,
      'genericName',            rti.generic_name,
      'manufacturer',           rti.manufacturer,
      'lotNumber',              rti.lot_number,
      'serialNumber',           rti.serial_number,
      'expirationDate',         rti.expiration_date,
      'quantity',               rti.quantity,
      'fullPackageSize',        rti.full_package_size,
      'fullPackageQtyReturned', rti.full_package_qty_returned,
      'isPartial',              rti.is_partial,
      'partialPercentage',      rti.partial_percentage,
      'deaSchedule',            rti.dea_schedule,
      'strength',               rti.strength,
      'dosageForm',             rti.dosage_form,
      'returnStatus',           rti.return_status,
      'destination',            rti.destination
      -- Removed: 'standardPrice', 'estimatedValue' (as requested)
    ) ORDER BY rti.proprietary_name, rti.ndc
  ), '[]'::jsonb)
  INTO v_items
  FROM return_transaction_items rti
  WHERE rti.transaction_id = p_transaction_id
    AND rti.dea_form_222_required = true;

  -- Count and total (but we won't show value in the form)
  SELECT 
    COUNT(*)::INTEGER,
    COALESCE(SUM(rti.estimated_value), 0)
  INTO v_item_count, v_total_value
  FROM return_transaction_items rti
  WHERE rti.transaction_id = p_transaction_id
    AND dea_form_222_required = true;

  IF v_item_count = 0 THEN
    RETURN jsonb_build_object('error', true, 'code', 404,
      'message', 'No Schedule II (CII) items found requiring DEA Form 222.');
  END IF;

  RETURN jsonb_build_object(
    'error', false,
    'data', jsonb_build_object(
      'transaction', jsonb_build_object(
        'id',           v_txn.id,
        'licensePlate', v_txn.license_plate,
        'status',       v_txn.status,
        'fedexTracking', v_txn.fedex_tracking,
        'finalizedAt',  v_txn.finalized_at,
        'createdAt',    v_txn.created_at
      ),
      'pharmacy', jsonb_build_object(
        'id',           v_pharmacy.id,
        'name',         v_pharmacy.pharmacy_name,
        'npiNumber',    v_pharmacy.npi_number,
        'deaNumber',    v_pharmacy.dea_number,
        'deaExpiration', v_pharmacy.dea_expiration_date,
        'phone',        v_pharmacy.phone,
        'email',        v_pharmacy.email
      ),
      'summary', jsonb_build_object(
        'totalCiiItems', v_item_count,
        'totalValue',    v_total_value
      ),
      'items', v_items
    )
  );
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.get_dea_form_222_data(uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.get_dea_form_222_data(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_dea_form_222_data(uuid) TO service_role;

-- ============================================================
-- ✅ COMPLETED: All DEA Form 222 fixes applied
-- 
-- Database changes:
-- 1. ✅ Added DEA expiration date to pharmacy info
-- 2. ✅ Added pkg size fields (fullPackageSize, fullPackageQtyReturned)
-- 3. ✅ Added partial qty fields (isPartial, partialPercentage)
-- 4. ✅ Removed price and value fields (standardPrice, estimatedValue)
-- 
-- TypeScript changes (src/services/manifestService.ts):
-- 1. ✅ Updated DeaFormItem interface with new fields
-- 2. ✅ Updated DeaFormData interface to include deaExpiration
-- 3. ✅ Updated PDF table layout - removed PRICE/VALUE, added PKG SIZE/FULL QTY/PARTIAL QTY/SERIAL NO
-- 4. ✅ Added DEA expiration to registrant info section
-- 5. ✅ Added warning for missing DEA expiration date
-- 6. ✅ Improved column alignment and widths
-- 7. ✅ Updated summary to remove value display
-- ============================================================

SELECT 'DEA Form 222 completely fixed - database and PDF generation updated!' AS status;