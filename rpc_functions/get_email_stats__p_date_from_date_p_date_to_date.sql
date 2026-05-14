-- Function : get_email_stats
-- Arguments: p_date_from date, p_date_to date
-- Type     : FUNCTION
-- =============================================================

DROP FUNCTION IF EXISTS public.get_email_stats(p_date_from date, p_date_to date) CASCADE;

CREATE OR REPLACE FUNCTION public.get_email_stats(p_date_from date DEFAULT NULL::date, p_date_to date DEFAULT NULL::date)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_stats JSONB;
BEGIN
  SELECT jsonb_build_object(
    'total_sent', COUNT(*),
    'delivered', COUNT(*) FILTER (WHERE status = 'delivered'),
    'bounced', COUNT(*) FILTER (WHERE status = 'bounced'),
    'failed', COUNT(*) FILTER (WHERE status = 'failed'),
    'pending', COUNT(*) FILTER (WHERE status = 'sent'),
    'delivery_rate', ROUND(
      (COUNT(*) FILTER (WHERE status = 'delivered')::NUMERIC / 
       NULLIF(COUNT(*), 0) * 100)::NUMERIC, 2
    ),
    'bounce_rate', ROUND(
      (COUNT(*) FILTER (WHERE status = 'bounced')::NUMERIC / 
       NULLIF(COUNT(*), 0) * 100)::NUMERIC, 2
    )
  )
  INTO v_stats
  FROM email_logs
  WHERE (p_date_from IS NULL OR sent_at::date >= p_date_from)
    AND (p_date_to IS NULL OR sent_at::date <= p_date_to);
    
  RETURN v_stats;
END;
$function$;
