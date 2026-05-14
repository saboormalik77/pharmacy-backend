-- Function : list_pharmacy_dashboard_returns
-- Arguments: p_pharmacy_id uuid
-- Type     : FUNCTION
-- =============================================================

DROP FUNCTION IF EXISTS public.list_pharmacy_dashboard_returns(p_pharmacy_id uuid) CASCADE;

CREATE OR REPLACE FUNCTION public.list_pharmacy_dashboard_returns(p_pharmacy_id uuid)
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'id', f.id,
        'licensePlate', f.license_plate,
        'createdAt', f.created_at,
        'status', f.status,
        'totalReturnableValue', COALESCE(f.total_returnable_value, 0),
        'totalNonReturnableValue', COALESCE(f.total_non_returnable_value, 0)
      )
      ORDER BY f.created_at DESC NULLS LAST
    ),
    '[]'::jsonb
  )
  FROM (
    SELECT
      rt.id,
      rt.license_plate,
      rt.created_at,
      rt.status,
      rt.total_returnable_value,
      rt.total_non_returnable_value
    FROM return_transactions rt
    WHERE rt.pharmacy_id = p_pharmacy_id
      -- At least one line item appears on a debit memo with ask price populated
      AND EXISTS (
        SELECT 1
        FROM return_transaction_items rti
        INNER JOIN debit_memo_items dmi ON dmi.transaction_item_id = rti.id
        WHERE rti.transaction_id = rt.id
          AND dmi.ask_price IS NOT NULL
      )
      -- No non-returnable line missing a reason (dashboard breakdown needs it)
      AND NOT EXISTS (
        SELECT 1
        FROM return_transaction_items x
        WHERE x.transaction_id = rt.id
          AND x.return_status = 'non_returnable'
          AND (
            x.non_returnable_reason IS NULL
            OR length(trim(x.non_returnable_reason::text)) = 0
          )
      )
  ) f;
$function$;
