-- Function : find_debit_memo_by_credit_filename
-- Arguments: p_filename text
-- Type     : FUNCTION
-- =============================================================

DROP FUNCTION IF EXISTS public.find_debit_memo_by_credit_filename(p_filename text) CASCADE;

CREATE OR REPLACE FUNCTION public.find_debit_memo_by_credit_filename(p_filename text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
AS $function$
DECLARE
  v_memo  debit_memos;
  v_items jsonb;
BEGIN
  -- Scan all memo numbers; for each one derive the "key":
  --   DEL-prefixed  → strip "DEL" (3 chars)
  --   otherwise     → use the full memo_number
  -- Then check whether p_filename ILIKE '%<key>%'.
  -- We order by created_at DESC so the most recent memo wins when
  -- (in an edge case) two memos share the same key.
  SELECT dm.*
    INTO v_memo
    FROM debit_memos dm
   WHERE p_filename ILIKE '%' ||
         CASE
           WHEN dm.memo_number ILIKE 'DEL%' THEN SUBSTRING(dm.memo_number FROM 4)
           ELSE dm.memo_number
         END
         || '%'
   ORDER BY dm.created_at DESC
   LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'error',   true,
      'code',    404,
      'message', 'No debit memo found matching credit memo filename: ' || p_filename
    );
  END IF;

  -- Fetch items for the matched memo
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'id',             dmi.id,
      'ndc',            dmi.ndc,
      'productName',    dmi.product_name,
      'quantity',       dmi.quantity,
      'askPrice',       dmi.ask_price,
      'lotNumber',      dmi.lot_number,
      'expirationDate', dmi.expiration_date
    ) ORDER BY dmi.product_name, dmi.ndc
  ), '[]'::jsonb)
  INTO v_items
  FROM debit_memo_items dmi WHERE dmi.debit_memo_id = v_memo.id;

  RETURN jsonb_build_object(
    'error', false,
    'data', jsonb_build_object(
      'memo',  _debit_memo_to_json(v_memo),
      'items', v_items
    )
  );
END;
$function$;
