-- Function : log_email_status
-- Arguments: p_resend_email_id text, p_status text, p_delivered_at timestamp with time zone, p_bounced_at timestamp with time zone, p_error_message text
-- Type     : FUNCTION
-- =============================================================

DROP FUNCTION IF EXISTS public.log_email_status(p_resend_email_id text, p_status text, p_delivered_at timestamp with time zone, p_bounced_at timestamp with time zone, p_error_message text) CASCADE;

CREATE OR REPLACE FUNCTION public.log_email_status(p_resend_email_id text, p_status text, p_delivered_at timestamp with time zone DEFAULT NULL::timestamp with time zone, p_bounced_at timestamp with time zone DEFAULT NULL::timestamp with time zone, p_error_message text DEFAULT NULL::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  UPDATE email_logs
  SET
    status = p_status,
    delivered_at = COALESCE(p_delivered_at, delivered_at),
    bounced_at = COALESCE(p_bounced_at, bounced_at),
    error_message = COALESCE(p_error_message, error_message),
    updated_at = NOW()
  WHERE smtp_message_id = p_resend_email_id;

  IF p_status = 'delivered' THEN
    UPDATE ra_requests
    SET updated_at = NOW()
    WHERE smtp_message_id = p_resend_email_id;
  END IF;
END;
$function$;
