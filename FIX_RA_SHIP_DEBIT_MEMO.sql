-- ================================================================
-- FIX: Missing ra_ship_debit_memo Function
-- ================================================================
-- This script creates the missing ra_ship_debit_memo function 
-- that's needed for creating FedEx shipments for debit memos
-- ================================================================

-- Drop any existing version to avoid conflicts
DROP FUNCTION IF EXISTS public.ra_ship_debit_memo(uuid, text, timestamptz);
DROP FUNCTION IF EXISTS public.ra_ship_debit_memo(uuid, text);

-- Create the ra_ship_debit_memo function
CREATE OR REPLACE FUNCTION public.ra_ship_debit_memo(
  p_debit_memo_id uuid, 
  p_outbound_tracking text, 
  p_shipped_at timestamp with time zone DEFAULT now()
) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
  v_memo debit_memos;
BEGIN
  -- Find the debit memo
  SELECT * INTO v_memo FROM debit_memos WHERE id = p_debit_memo_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', true, 'code', 404, 'message', 'Debit memo not found');
  END IF;

  -- Check if RA number exists
  IF v_memo.ra_number IS NULL OR TRIM(v_memo.ra_number) = '' THEN
    RETURN jsonb_build_object('error', true, 'code', 400,
      'message', 'Cannot ship without an RA number. Record RA received first.');
  END IF;

  -- Validate tracking number
  IF p_outbound_tracking IS NULL OR TRIM(p_outbound_tracking) = '' THEN
    RETURN jsonb_build_object('error', true, 'code', 400, 'message', 'Outbound tracking number is required');
  END IF;

  -- Update the debit memo with shipping information
  UPDATE debit_memos SET
    outbound_tracking = TRIM(p_outbound_tracking),
    shipped_at = p_shipped_at,
    ra_status = 'shipped',
    updated_at = NOW()
  WHERE id = p_debit_memo_id;

  -- Get the updated memo
  SELECT * INTO v_memo FROM debit_memos WHERE id = p_debit_memo_id;

  -- Return success response
  RETURN jsonb_build_object(
    'error', false,
    'data', _debit_memo_to_json(v_memo)
  );
END;
$$;

-- Set ownership and permissions
ALTER FUNCTION public.ra_ship_debit_memo(uuid, text, timestamptz) OWNER TO postgres;
GRANT ALL ON FUNCTION public.ra_ship_debit_memo(uuid, text, timestamptz) TO anon;
GRANT ALL ON FUNCTION public.ra_ship_debit_memo(uuid, text, timestamptz) TO authenticated;
GRANT ALL ON FUNCTION public.ra_ship_debit_memo(uuid, text, timestamptz) TO service_role;

-- Verify function was created successfully
SELECT 
  p.proname as function_name,
  pg_get_function_arguments(p.oid) as arguments,
  pg_get_function_result(p.oid) as return_type,
  'Function created successfully!' as status
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public' 
  AND p.proname = 'ra_ship_debit_memo';

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ FEDEX SHIPMENT FIX COMPLETE!';
  RAISE NOTICE '📦 ra_ship_debit_memo function created successfully';
  RAISE NOTICE '🚚 You can now create FedEx shipments for debit memos';
  RAISE NOTICE '📋 Function signature: ra_ship_debit_memo(p_debit_memo_id uuid, p_outbound_tracking text, p_shipped_at timestamptz)';
END $$;