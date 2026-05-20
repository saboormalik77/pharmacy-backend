-- Function : _wc_to_json
-- Arguments: r wine_cellar
-- Type     : FUNCTION
-- =============================================================

DROP FUNCTION IF EXISTS public._wc_to_json(r wine_cellar) CASCADE;

CREATE OR REPLACE FUNCTION public._wc_to_json(r wine_cellar)
 RETURNS jsonb
 LANGUAGE sql
 STABLE
AS $function$
  SELECT jsonb_build_object(
    'id',                       r.id,
    'pharmacyId',               r.pharmacy_id,
    'pharmacyName',             COALESCE((SELECT pharmacy_name FROM pharmacy WHERE id = r.pharmacy_id), ''),
    'transactionItemId',        r.transaction_item_id,
    'ndc',                      r.ndc,
    'ndc10',                    r.ndc_10,
    'productName',              r.product_name,
    'manufacturer',             r.manufacturer,
    'lotNumber',                r.lot_number,
    'serialNumber',             r.serial_number,
    'expirationDate',           r.expiration_date,
    'quantity',                 r.quantity,
    'standardPrice',            r.standard_price,
    'estimatedValue',           r.estimated_value,
    'isPartial',                r.is_partial,
    'partialPercentage',        r.partial_percentage,
    'dateShelved',              r.date_shelved,
    'expectedReturnableDate',   r.expected_returnable_date,
    'physicalLocation',         r.physical_location,
    'baggieBarcode',            r.baggie_barcode,
    'status',                   r.status,
    'returnedInTransactionId',  r.returned_in_transaction_id,
    'returnedAt',               r.returned_at,
    'notes',                    r.notes,
    'createdBy',                r.created_by,
    'createdAt',                r.created_at,
    'updatedAt',                r.updated_at
  );
$function$;
