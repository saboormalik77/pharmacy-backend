-- Migration: Add package_tracking to shipment_groups
-- Run in Supabase Dashboard → SQL Editor

-- Step 1: Add column
ALTER TABLE public.shipment_groups
  ADD COLUMN IF NOT EXISTS package_tracking jsonb;

-- Step 2: Update ship_memo_group RPC to accept and store package_tracking
DROP FUNCTION IF EXISTS public.ship_memo_group(uuid, text, timestamp with time zone, text, jsonb) CASCADE;

CREATE OR REPLACE FUNCTION public.ship_memo_group(
  p_group_id           uuid,
  p_outbound_tracking  text,
  p_shipped_at         timestamp with time zone DEFAULT now(),
  p_fedex_shipment_id  text    DEFAULT NULL::text,
  p_fedex_labels       jsonb   DEFAULT NULL::jsonb,
  p_package_tracking   jsonb   DEFAULT NULL::jsonb
)
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

-- Step 3: Update _shipment_group_to_json to expose packageTracking
CREATE OR REPLACE FUNCTION public._shipment_group_to_json(sg shipment_groups)
RETURNS jsonb
LANGUAGE sql
STABLE
AS $function$
  SELECT jsonb_build_object(
    'id',               sg.id,
    'destination',      sg.destination,
    'outboundTracking', sg.outbound_tracking,
    'shippedAt',        sg.shipped_at,
    'boxCount',         sg.box_count,
    'totalMemos',       sg.total_memos,
    'fedexShipmentId',  sg.fedex_shipment_id,
    'fedexLabels',      sg.fedex_labels,
    'packageTracking',  sg.package_tracking,
    'notes',            sg.notes,
    'createdAt',        sg.created_at,
    'updatedAt',        sg.updated_at
  );
$function$;
