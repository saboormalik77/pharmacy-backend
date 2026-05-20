-- Function : get_debit_memo
-- Arguments: p_id uuid
-- Type     : FUNCTION
-- =============================================================

DROP FUNCTION IF EXISTS public.get_debit_memo(p_id uuid) CASCADE;

CREATE OR REPLACE FUNCTION public.get_debit_memo(p_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
AS $function$
DECLARE
  v_memo                 debit_memos;
  v_items_returnable     jsonb;
  v_items_non_returnable jsonb;
BEGIN
  SELECT * INTO v_memo FROM debit_memos WHERE id = p_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', true, 'code', 404, 'message', 'Debit memo not found');
  END IF;

  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'id',                  dmi.id,
      'debitMemoId',         dmi.debit_memo_id,
      'transactionItemId',   dmi.transaction_item_id,
      'ndc',                 dmi.ndc,
      'productName',         dmi.product_name,
      'quantity',            dmi.quantity,
      'askPrice',            dmi.ask_price,
      'receivedPrice',       dmi.received_price,
      'lotNumber',           dmi.lot_number,
      'expirationDate',      dmi.expiration_date,
      'isNonReturnable',     dmi.is_non_returnable,
      'nonReturnableReason', dmi.non_returnable_reason,
      'createdAt',           dmi.created_at
    ) ORDER BY dmi.product_name, dmi.ndc
  ), '[]'::jsonb)
  INTO v_items_returnable
  FROM debit_memo_items dmi
  WHERE dmi.debit_memo_id = p_id
    AND COALESCE(dmi.is_non_returnable, FALSE) = FALSE;

  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'id',                  dmi.id,
      'debitMemoId',         dmi.debit_memo_id,
      'transactionItemId',   dmi.transaction_item_id,
      'ndc',                 dmi.ndc,
      'productName',         dmi.product_name,
      'quantity',            dmi.quantity,
      'askPrice',            dmi.ask_price,
      'receivedPrice',       dmi.received_price,
      'lotNumber',           dmi.lot_number,
      'expirationDate',      dmi.expiration_date,
      'isNonReturnable',     dmi.is_non_returnable,
      'nonReturnableReason', dmi.non_returnable_reason,
      'createdAt',           dmi.created_at
    ) ORDER BY dmi.product_name, dmi.ndc
  ), '[]'::jsonb)
  INTO v_items_non_returnable
  FROM debit_memo_items dmi
  WHERE dmi.debit_memo_id = p_id
    AND COALESCE(dmi.is_non_returnable, FALSE) = TRUE;

  RETURN jsonb_build_object(
    'error', false,
    'data', jsonb_build_object(
      'memo',               _debit_memo_to_json(v_memo),
      'items',              v_items_returnable,
      'nonReturnableItems', v_items_non_returnable
    )
  );
END;
$function$;
