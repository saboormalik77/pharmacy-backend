-- Function : _shipment_group_to_json
-- Arguments: sg shipment_groups
-- Type     : FUNCTION
-- =============================================================

DROP FUNCTION IF EXISTS public._shipment_group_to_json(sg shipment_groups) CASCADE;

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
