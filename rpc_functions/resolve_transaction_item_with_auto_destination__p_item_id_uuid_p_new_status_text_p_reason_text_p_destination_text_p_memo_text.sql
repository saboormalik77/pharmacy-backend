-- Function : resolve_transaction_item_with_auto_destination
-- Arguments: p_item_id uuid, p_new_status text, p_reason text, p_destination text, p_memo text
-- Type     : FUNCTION
-- =============================================================

DROP FUNCTION IF EXISTS public.resolve_transaction_item_with_auto_destination(p_item_id uuid, p_new_status text, p_reason text, p_destination text, p_memo text) CASCADE;

CREATE OR REPLACE FUNCTION public.resolve_transaction_item_with_auto_destination(p_item_id uuid, p_new_status text, p_reason text DEFAULT NULL::text, p_destination text DEFAULT NULL::text, p_memo text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_item           return_transaction_items;
  v_auto_destination TEXT;
  v_updates        jsonb;
  v_result         jsonb;
  v_resolved       return_transaction_items;
  v_created_by     UUID := NULL;
BEGIN
  SELECT * INTO v_item FROM return_transaction_items WHERE id = p_item_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', true, 'code', 404, 'message', 'Item not found');
  END IF;

  IF v_item.return_status != 'tbd' THEN
    RETURN jsonb_build_object('error', true, 'code', 400,
      'message', format('Item is already classified as "%s". Only TBD items can be resolved.', v_item.return_status));
  END IF;

  v_updates := jsonb_build_object('returnStatus', p_new_status);

  IF p_reason IS NOT NULL THEN
    v_updates := v_updates || jsonb_build_object('nonReturnableReason', p_reason);
  END IF;

  IF p_memo IS NOT NULL THEN
    v_updates := v_updates || jsonb_build_object('memo', p_memo);
  END IF;

  IF p_new_status = 'returnable' AND (p_destination IS NULL OR TRIM(p_destination) = '') THEN
    v_auto_destination := get_destination_for_ndc(v_item.ndc);
    IF v_auto_destination IS NOT NULL THEN
      v_updates := v_updates || jsonb_build_object('destination', v_auto_destination);
    END IF;
  ELSIF p_destination IS NOT NULL THEN
    v_updates := v_updates || jsonb_build_object('destination', p_destination);
  END IF;

  v_result := update_return_transaction_item(p_item_id, v_updates);
  IF (v_result->>'error')::boolean THEN
    RETURN v_result;
  END IF;

  -- Destruction workflow: auto-create record when non_returnable + destination=destruction
  IF p_new_status = 'non_returnable' THEN
    SELECT * INTO v_resolved FROM return_transaction_items WHERE id = p_item_id;
    IF LOWER(TRIM(COALESCE(v_resolved.destination, ''))) = 'destruction' THEN
      PERFORM create_destruction_record_for_transaction_item(p_item_id, v_created_by, p_memo);
    END IF;
  END IF;

  RETURN v_result;
END;
$function$;
