-- ============================================================
-- FIX: Remove serialNumber from DEA Form 222 and fix pharmacy_id issue
-- ============================================================

-- Drop and recreate the function with fixes
DROP FUNCTION IF EXISTS public.get_dea_form_222_data(uuid);

CREATE OR REPLACE FUNCTION public.get_dea_form_222_data(p_transaction_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
AS $$
DECLARE
  v_txn          record;
  v_pharmacy     record;
  v_items        jsonb;
  v_item_count   integer;
  v_total_value  numeric;
BEGIN
  -- Fetch transaction info including pharmacy_id
  SELECT id, license_plate, pharmacy_id, status, fedex_tracking, finalized_at, created_at
  INTO v_txn
  FROM return_transactions
  WHERE id = p_transaction_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', true, 'code', 404,
      'message', 'Return transaction not found.');
  END IF;

  -- Fetch pharmacy info including DEA expiration date
  SELECT
    id, pharmacy_name, npi_number, dea_number, dea_expiration_date, phone, email
  INTO v_pharmacy
  FROM pharmacy
  WHERE id = v_txn.pharmacy_id;

  -- Count CII items and get total value
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

  -- Schedule II items only (dea_form_222_required = true)
  -- Include pkg size, full/partial qty fields and exclude price/value and serialNumber
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'ndc',                    rti.ndc,
      'ndc10',                  rti.ndc_10,
      'proprietaryName',        rti.proprietary_name,
      'genericName',            rti.generic_name,
      'manufacturer',           rti.manufacturer,
      'lotNumber',              rti.lot_number,
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
      -- Removed: 'serialNumber', 'standardPrice', 'estimatedValue'
    ) ORDER BY rti.proprietary_name, rti.ndc
  ), '[]'::jsonb)
  INTO v_items
  FROM return_transaction_items rti
  WHERE rti.transaction_id = p_transaction_id
    AND rti.dea_form_222_required = true;

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
-- ✅ COMPLETED: Fixed pharmacy_id issue and removed serialNumber
-- ============================================================