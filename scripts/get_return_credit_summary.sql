-- ============================================================================
-- RPC: get_return_credit_summary
-- ============================================================================
-- Returns the total expected (ask_price) and received (received_price) values
-- from debit_memo_items for a specific return transaction.
--
-- Join path:
--   return_transactions -> return_transaction_items -> debit_memo_items
--
-- Execute with: npx supabase db query --linked < scripts/get_return_credit_summary.sql
-- ============================================================================

DROP FUNCTION IF EXISTS get_return_credit_summary(UUID);

CREATE OR REPLACE FUNCTION get_return_credit_summary(
    p_return_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
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
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_return_credit_summary(UUID) TO service_role, authenticated;

COMMENT ON FUNCTION get_return_credit_summary IS 'Returns total expected (ask_price) and received (received_price) from debit_memo_items for a specific return transaction';
