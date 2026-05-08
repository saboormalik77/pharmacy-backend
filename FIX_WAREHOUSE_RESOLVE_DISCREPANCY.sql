-- ============================================================
-- FIX: Create warehouse_resolve_discrepancy function
-- ============================================================

-- First, ensure the warehouse_discrepancies table has the necessary columns
ALTER TABLE warehouse_discrepancies 
ADD COLUMN IF NOT EXISTS resolution text;

ALTER TABLE warehouse_discrepancies 
ADD COLUMN IF NOT EXISTS resolution_notes text;

ALTER TABLE warehouse_discrepancies 
ADD COLUMN IF NOT EXISTS resolved_by uuid;

ALTER TABLE warehouse_discrepancies 
ADD COLUMN IF NOT EXISTS resolved_at timestamptz;

ALTER TABLE warehouse_discrepancies 
ADD COLUMN IF NOT EXISTS status text DEFAULT 'pending';

-- Create the warehouse_resolve_discrepancy function
DROP FUNCTION IF EXISTS public.warehouse_resolve_discrepancy(uuid, text, text, uuid);

CREATE OR REPLACE FUNCTION public.warehouse_resolve_discrepancy(
  p_discrepancy_id uuid,
  p_resolution text,
  p_resolution_notes text DEFAULT NULL,
  p_resolved_by uuid DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_disc warehouse_discrepancies;
BEGIN
  -- Find the discrepancy
  SELECT * INTO v_disc FROM warehouse_discrepancies WHERE id = p_discrepancy_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', true, 'code', 404,
      'message', 'Discrepancy not found');
  END IF;

  -- Check if already resolved
  IF v_disc.status = 'resolved' THEN
    RETURN jsonb_build_object('error', true, 'code', 400,
      'message', 'Discrepancy is already resolved');
  END IF;

  -- Validate resolution
  IF p_resolution IS NULL OR p_resolution = '' THEN
    RETURN jsonb_build_object('error', true, 'code', 400,
      'message', 'Resolution is required');
  END IF;

  -- Update the discrepancy
  UPDATE warehouse_discrepancies SET
    resolution = p_resolution,
    resolution_notes = p_resolution_notes,
    resolved_by = p_resolved_by,
    resolved_at = NOW(),
    status = 'resolved'
  WHERE id = p_discrepancy_id
  RETURNING * INTO v_disc;

  RETURN jsonb_build_object(
    'error', false,
    'data', jsonb_build_object(
      'id',              v_disc.id,
      'transactionId',   v_disc.transaction_id,
      'itemId',          v_disc.item_id,
      'type',            v_disc.type,
      'ndc',             v_disc.ndc,
      'productName',     v_disc.product_name,
      'expectedQuantity', v_disc.expected_quantity,
      'actualQuantity',  v_disc.actual_quantity,
      'notes',           v_disc.notes,
      'reportedBy',      v_disc.reported_by,
      'resolution',      v_disc.resolution,
      'resolutionNotes', v_disc.resolution_notes,
      'resolvedBy',      v_disc.resolved_by,
      'resolvedAt',      v_disc.resolved_at,
      'status',          v_disc.status,
      'createdAt',       v_disc.created_at
    )
  );
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.warehouse_resolve_discrepancy(uuid, text, text, uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.warehouse_resolve_discrepancy(uuid, text, text, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.warehouse_resolve_discrepancy(uuid, text, text, uuid) TO service_role;

-- ============================================================
-- ✅ COMPLETED: Created warehouse_resolve_discrepancy function
-- ============================================================