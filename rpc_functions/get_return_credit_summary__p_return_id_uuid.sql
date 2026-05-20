-- Function : get_return_credit_summary
-- Arguments: p_return_id uuid
-- Type     : FUNCTION
-- =============================================================

DROP FUNCTION IF EXISTS public.get_return_credit_summary(p_return_id uuid) CASCADE;

CREATE OR REPLACE FUNCTION public.get_return_credit_summary(p_return_id uuid)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    v_total_ask     DECIMAL(12,2) := 0;
    v_total_received DECIMAL(12,2) := 0;
BEGIN
    SELECT
        COALESCE(SUM(dmi.ask_price), 0),
        COALESCE(SUM(dmi.received_price), 0)
    INTO
        v_total_ask,
        v_total_received
    FROM return_transaction_items rti
    JOIN debit_memo_items dmi ON dmi.transaction_item_id = rti.id
    WHERE rti.transaction_id = p_return_id;

    RETURN json_build_object(
        'total_ask', v_total_ask,
        'total_received', v_total_received
    );
END;
$function$;
