-- Function : ra_update_request_status
-- Arguments: p_request_id uuid, p_status text, p_error_message text, p_resend_email_id text
-- Type     : FUNCTION
-- =============================================================

DROP FUNCTION IF EXISTS public.ra_update_request_status(p_request_id uuid, p_status text, p_error_message text, p_resend_email_id text) CASCADE;

CREATE OR REPLACE FUNCTION public.ra_update_request_status(p_request_id uuid, p_status text, p_error_message text DEFAULT NULL::text, p_resend_email_id text DEFAULT NULL::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  UPDATE ra_requests
  SET
    status = p_status,
    error_message = p_error_message,
    smtp_message_id = COALESCE(p_resend_email_id, smtp_message_id),
    updated_at = NOW()
  WHERE id = p_request_id;

  INSERT INTO email_logs (
    ra_request_id,
    smtp_message_id,
    email_type,
    recipient_email,
    status,
    error_message
  )
  SELECT
    p_request_id,
    p_resend_email_id,
    'ra-request',
    COALESCE(r.destination_email, 'unknown@example.com'),
    p_status,
    p_error_message
  FROM ra_requests r
  WHERE r.id = p_request_id
  ON CONFLICT DO NOTHING;
END;
$function$;
