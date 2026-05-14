-- Function : _rti_to_json
-- Arguments: r return_transaction_items
-- Type     : FUNCTION
-- =============================================================

DROP FUNCTION IF EXISTS public._rti_to_json(r return_transaction_items) CASCADE;

CREATE OR REPLACE FUNCTION public._rti_to_json(r return_transaction_items)
 RETURNS jsonb
 LANGUAGE sql
 STABLE
AS $function$
  SELECT jsonb_build_object(
    'id',                   (r).id,
    'transactionId',        (r).transaction_id,
    'ndc',                  (r).ndc,
    'ndc10',                (r).ndc_10,
    'gtin',                 (r).gtin,
    'proprietaryName',      (r).proprietary_name,
    'genericName',          (r).generic_name,
    'manufacturer',         (r).manufacturer,
    'packageDescription',   (r).package_description,
    'dosageForm',           (r).dosage_form,
    'strength',             (r).strength,
    'route',                (r).route,
    'lotNumber',            (r).lot_number,
    'serialNumber',         (r).serial_number,
    'expirationDate',       (r).expiration_date,
    'standardPrice',        (r).standard_price,
    'quantity',             (r).quantity,
    'quantityReturned',     (r).quantity_returned,
    'fullPackageSize',      (r).full_package_size,
    'isPartial',            (r).is_partial,
    'partialPercentage',    (r).partial_percentage,
    'estimatedValue',       (r).estimated_value,
    'returnStatus',         (r).return_status,
    'nonReturnableReason',  (r).non_returnable_reason,
    'returnReason',         (r).return_reason,
    'destination',          (r).destination,
    'deaSchedule',          (r).dea_schedule,
    'deaForm222Required',   (r).dea_form_222_required,
    'productType',          (r).product_type,
    'coStatus',             (r).co_status,
    'bmpStatus',            (r).bmp_status,
    'memo',                 (r).memo,
    'wineCellarId',         (r).wine_cellar_id,
    'scanSource',           (r).scan_source,
    'createdAt',            (r).created_at,
    'updatedAt',            (r).updated_at
  );
$function$;
