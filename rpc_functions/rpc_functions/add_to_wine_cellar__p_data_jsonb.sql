-- Function : add_to_wine_cellar
-- Arguments: p_data jsonb
-- Type     : FUNCTION
-- =============================================================

DROP FUNCTION IF EXISTS public.add_to_wine_cellar(p_data jsonb) CASCADE;

CREATE OR REPLACE FUNCTION public.add_to_wine_cellar(p_data jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_row wine_cellar;
BEGIN
  INSERT INTO wine_cellar (
    pharmacy_id,
    transaction_item_id,
    ndc,
    ndc_10,
    product_name,
    manufacturer,
    lot_number,
    serial_number,
    expiration_date,
    quantity,
    standard_price,
    is_partial,
    partial_percentage,
    expected_returnable_date,
    physical_location,
    baggie_barcode,
    notes,
    created_by,
    status,
    date_shelved
  )
  VALUES (
    (p_data->>'pharmacy_id')::uuid,
    NULLIF(p_data->>'transaction_item_id', '')::uuid,
    NULLIF(p_data->>'ndc', ''),
    NULLIF(p_data->>'ndc_10', ''),
    NULLIF(p_data->>'product_name', ''),
    NULLIF(p_data->>'manufacturer', ''),
    NULLIF(p_data->>'lot_number', ''),
    NULLIF(p_data->>'serial_number', ''),
    NULLIF(p_data->>'expiration_date', '')::date,
    COALESCE((p_data->>'quantity')::integer, 1),
    NULLIF(p_data->>'standard_price', '')::numeric,
    COALESCE((p_data->>'is_partial')::boolean, false),
    NULLIF(p_data->>'partial_percentage', '')::numeric,
    NULLIF(p_data->>'expected_returnable_date', '')::date,
    NULLIF(p_data->>'physical_location', ''),
    NULLIF(p_data->>'baggie_barcode', ''),
    NULLIF(p_data->>'notes', ''),
    NULLIF(p_data->>'created_by', '')::uuid,
    'shelved',
    now()
  )
  RETURNING * INTO v_row;

  RETURN jsonb_build_object(
    'error',   false,
    'message', 'Item added to wine cellar',
    'data',    _wc_to_json(v_row)
  );

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'error',   true,
    'message', SQLERRM,
    'code',    400
  );
END;
$function$;
