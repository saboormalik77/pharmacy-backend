-- ================================================================
-- CREATE MISSING _rti_to_json FUNCTION
-- ================================================================
-- 
-- This function is used by return transaction items RPC functions
-- and is missing from your live database
--
-- ================================================================

CREATE OR REPLACE FUNCTION public._rti_to_json(r public.return_transaction_items) 
RETURNS jsonb
LANGUAGE sql STABLE
AS $$
  SELECT jsonb_build_object(
    'id',                      r.id,
    'transactionId',           r.transaction_id,
    'ndc',                     r.ndc,
    'ndc10',                   r.ndc_10,
    'gtin',                    r.gtin,
    'proprietaryName',         r.proprietary_name,
    'genericName',             r.generic_name,
    'manufacturer',            r.manufacturer,
    'packageDescription',      r.package_description,
    'dosageForm',              r.dosage_form,
    'strength',                r.strength,
    'route',                   r.route,
    'lotNumber',               r.lot_number,
    'serialNumber',            r.serial_number,
    'expirationDate',          r.expiration_date,
    'standardPrice',           r.standard_price,
    'estimatedValue',          r.estimated_value,
    'quantity',                r.quantity,
    'fullPackageSize',         r.full_package_size,
    'fullPackageQtyReturned',  r.full_package_qty_returned,
    'isPartial',               r.is_partial,
    'partialPercentage',       r.partial_percentage,
    'returnStatus',            r.return_status,
    'nonReturnableReason',     r.non_returnable_reason,
    'returnReason',            r.return_reason,
    'destination',             r.destination,
    'deaSchedule',             r.dea_schedule,
    'deaForm222Required',      r.dea_form_222_required,
    'productType',             r.product_type,
    'coStatus',                r.co_status,
    'bmpStatus',               r.bmp_status,
    'memo',                    r.memo,
    'scanSource',              r.scan_source,
    'rawScanData',             r.raw_scan_data,
    'wineCellarId',            r.wine_cellar_id,
    'createdAt',               r.created_at,
    'updatedAt',               r.updated_at
  );
$$;

-- Grant permissions
GRANT ALL ON FUNCTION public._rti_to_json(r public.return_transaction_items) TO anon;
GRANT ALL ON FUNCTION public._rti_to_json(r public.return_transaction_items) TO authenticated;
GRANT ALL ON FUNCTION public._rti_to_json(r public.return_transaction_items) TO service_role;