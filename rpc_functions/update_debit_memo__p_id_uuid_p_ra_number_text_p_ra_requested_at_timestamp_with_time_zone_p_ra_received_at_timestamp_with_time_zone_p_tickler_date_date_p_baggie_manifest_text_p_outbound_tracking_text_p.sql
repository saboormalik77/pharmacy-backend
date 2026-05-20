-- Function : update_debit_memo
-- Arguments: p_id uuid, p_ra_number text, p_ra_requested_at timestamp with time zone, p_ra_received_at timestamp with time zone, p_tickler_date date, p_baggie_manifest text, p_outbound_tracking text, p_shipped_at timestamp with time zone, p_payment_status text, p_amount_requested numeric, p_amount_received numeric
-- Type     : FUNCTION
-- =============================================================

DROP FUNCTION IF EXISTS public.update_debit_memo(p_id uuid, p_ra_number text, p_ra_requested_at timestamp with time zone, p_ra_received_at timestamp with time zone, p_tickler_date date, p_baggie_manifest text, p_outbound_tracking text, p_shipped_at timestamp with time zone, p_payment_status text, p_amount_requested numeric, p_amount_received numeric) CASCADE;

CREATE OR REPLACE FUNCTION public.update_debit_memo(p_id uuid, p_ra_number text DEFAULT NULL::text, p_ra_requested_at timestamp with time zone DEFAULT NULL::timestamp with time zone, p_ra_received_at timestamp with time zone DEFAULT NULL::timestamp with time zone, p_tickler_date date DEFAULT NULL::date, p_baggie_manifest text DEFAULT NULL::text, p_outbound_tracking text DEFAULT NULL::text, p_shipped_at timestamp with time zone DEFAULT NULL::timestamp with time zone, p_payment_status text DEFAULT NULL::text, p_amount_requested numeric DEFAULT NULL::numeric, p_amount_received numeric DEFAULT NULL::numeric)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_memo debit_memos;
BEGIN
  SELECT * INTO v_memo FROM debit_memos WHERE id = p_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', true, 'code', 404, 'message', 'Debit memo not found');
  END IF;

  UPDATE debit_memos SET
    ra_number         = COALESCE(p_ra_number,         ra_number),
    ra_requested_at   = COALESCE(p_ra_requested_at,   ra_requested_at),
    ra_received_at    = COALESCE(p_ra_received_at,     ra_received_at),
    tickler_date      = COALESCE(p_tickler_date,       tickler_date),
    baggie_manifest   = COALESCE(p_baggie_manifest,    baggie_manifest),
    outbound_tracking = COALESCE(p_outbound_tracking,  outbound_tracking),
    shipped_at        = COALESCE(p_shipped_at,         shipped_at),
    payment_status    = COALESCE(p_payment_status,     payment_status),
    amount_requested  = COALESCE(p_amount_requested,   amount_requested),
    amount_received   = COALESCE(p_amount_received,    amount_received)
  WHERE id = p_id
  RETURNING * INTO v_memo;

  RETURN jsonb_build_object('error', false, 'data', _debit_memo_to_json(v_memo));
END;
$function$;
