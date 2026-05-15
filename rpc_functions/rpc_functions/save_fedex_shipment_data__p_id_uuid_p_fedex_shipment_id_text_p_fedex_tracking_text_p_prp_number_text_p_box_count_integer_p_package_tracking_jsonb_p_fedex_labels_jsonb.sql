-- Function : save_fedex_shipment_data
-- Arguments: p_id uuid, p_fedex_shipment_id text, p_fedex_tracking text, p_prp_number text, p_box_count integer, p_package_tracking jsonb, p_fedex_labels jsonb
-- Type     : FUNCTION
-- =============================================================

DROP FUNCTION IF EXISTS public.save_fedex_shipment_data(p_id uuid, p_fedex_shipment_id text, p_fedex_tracking text, p_prp_number text, p_box_count integer, p_package_tracking jsonb, p_fedex_labels jsonb) CASCADE;

CREATE OR REPLACE FUNCTION public.save_fedex_shipment_data(p_id uuid, p_fedex_shipment_id text, p_fedex_tracking text DEFAULT NULL::text, p_prp_number text DEFAULT NULL::text, p_box_count integer DEFAULT NULL::integer, p_package_tracking jsonb DEFAULT NULL::jsonb, p_fedex_labels jsonb DEFAULT NULL::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_row return_transactions;
BEGIN
  SELECT * INTO v_row FROM return_transactions WHERE id = p_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', true, 'code', 404,
      'message', 'Return transaction not found');
  END IF;

  IF v_row.status NOT IN ('completed', 'in_progress', 'paused') THEN
    RETURN jsonb_build_object('error', true, 'code', 400,
      'message', format('Cannot update shipping data for status "%s"', v_row.status));
  END IF;

  UPDATE return_transactions SET
    fedex_shipment_id  = COALESCE(p_fedex_shipment_id, fedex_shipment_id),
    fedex_tracking     = COALESCE(NULLIF(TRIM(p_fedex_tracking), ''), fedex_tracking),
    prp_number         = COALESCE(NULLIF(TRIM(p_prp_number), ''), prp_number),
    box_count          = COALESCE(p_box_count, box_count),
    package_tracking   = COALESCE(p_package_tracking, package_tracking),
    fedex_labels       = COALESCE(p_fedex_labels, fedex_labels),
    updated_at         = NOW()
  WHERE id = p_id
  RETURNING * INTO v_row;

  RETURN jsonb_build_object('error', false, 'data', _rt_to_json(v_row));
END;
$function$;
