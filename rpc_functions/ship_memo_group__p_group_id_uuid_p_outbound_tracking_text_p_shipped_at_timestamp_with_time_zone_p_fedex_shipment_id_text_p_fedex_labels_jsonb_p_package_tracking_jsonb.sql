-- Function : ship_memo_group
-- Arguments: p_group_id uuid, p_outbound_tracking text, p_shipped_at timestamp with time zone, p_fedex_shipment_id text, p_fedex_labels jsonb, p_package_tracking jsonb
-- Type     : FUNCTION
-- =============================================================

DROP FUNCTION IF EXISTS public.ship_memo_group(p_group_id uuid, p_outbound_tracking text, p_shipped_at timestamp with time zone, p_fedex_shipment_id text, p_fedex_labels jsonb, p_package_tracking jsonb) CASCADE;

CREATE OR REPLACE FUNCTION public.ship_memo_group(p_group_id uuid, p_outbound_tracking text, p_shipped_at timestamp with time zone DEFAULT now(), p_fedex_shipment_id text DEFAULT NULL::text, p_fedex_labels jsonb DEFAULT NULL::jsonb, p_package_tracking jsonb DEFAULT NULL::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_group      shipment_groups;
  v_memo_count INTEGER;
BEGIN
  SELECT * INTO v_group FROM shipment_groups WHERE id = p_group_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', true, 'code', 404, 'message', 'Shipment group not found');
  END IF;

  IF v_group.shipped_at IS NOT NULL THEN
    RETURN jsonb_build_object('error', true, 'code', 400, 'message', 'Shipment group is already shipped');
  END IF;

  IF p_outbound_tracking IS NULL OR TRIM(p_outbound_tracking) = '' THEN
    RETURN jsonb_build_object('error', true, 'code', 400, 'message', 'Outbound tracking number is required');
  END IF;

  UPDATE shipment_groups SET
    outbound_tracking = TRIM(p_outbound_tracking),
    shipped_at        = COALESCE(p_shipped_at, NOW()),
    fedex_shipment_id = p_fedex_shipment_id,
    fedex_labels      = p_fedex_labels,
    package_tracking  = p_package_tracking
  WHERE id = p_group_id;

  UPDATE debit_memos SET
    outbound_tracking = TRIM(p_outbound_tracking),
    shipped_at        = COALESCE(p_shipped_at, NOW()),
    ra_status         = 'shipped'
  WHERE shipment_group_id = p_group_id;

  GET DIAGNOSTICS v_memo_count = ROW_COUNT;

  SELECT * INTO v_group FROM shipment_groups WHERE id = p_group_id;

  RETURN jsonb_build_object(
    'error', false,
    'data', jsonb_build_object(
      'group',       _shipment_group_to_json(v_group),
      'memosShipped', v_memo_count
    )
  );
END;
$function$;
