-- Function : _get_debit_memo_return_id
-- Arguments: p_memo_id uuid
-- Type     : FUNCTION
-- =============================================================

DROP FUNCTION IF EXISTS public._get_debit_memo_return_id(p_memo_id uuid) CASCADE;

CREATE OR REPLACE FUNCTION public._get_debit_memo_return_id(p_memo_id uuid)
 RETURNS uuid
 LANGUAGE sql
 STABLE
AS $function$
  SELECT rti.transaction_id
    FROM debit_memo_items dmi
    JOIN return_transaction_items rti ON rti.id = dmi.transaction_item_id
   WHERE dmi.debit_memo_id = p_memo_id
   LIMIT 1;
$function$;
