-- Function : get_inbox_processing_stats
-- Arguments: p_date_from date, p_date_to date
-- Type     : FUNCTION
-- =============================================================

DROP FUNCTION IF EXISTS public.get_inbox_processing_stats(p_date_from date, p_date_to date) CASCADE;

CREATE OR REPLACE FUNCTION public.get_inbox_processing_stats(p_date_from date DEFAULT NULL::date, p_date_to date DEFAULT NULL::date)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_stats JSONB;
BEGIN
  SELECT jsonb_build_object(
    'total_processed',   COUNT(*),
    'ra_updated',        COUNT(*) FILTER (WHERE status = 'updated'),
    'already_received',  COUNT(*) FILTER (WHERE status = 'already_received'),
    'no_memo_found',     COUNT(*) FILTER (WHERE status = 'no_memo_found'),
    'no_ra_found',       COUNT(*) FILTER (WHERE status = 'no_ra_found'),
    'memo_not_in_db',    COUNT(*) FILTER (WHERE status = 'memo_not_in_db'),
    'update_failed',     COUNT(*) FILTER (WHERE status = 'update_failed'),
    'errors',            COUNT(*) FILTER (WHERE status = 'error'),
    'avg_confidence',    ROUND(COALESCE(AVG(ai_confidence) FILTER (WHERE extracted_ra_number IS NOT NULL), 0)::NUMERIC, 2),
    'success_rate',      CASE
      WHEN COUNT(*) FILTER (WHERE memo_number IS NOT NULL) > 0
      THEN ROUND(
        (COUNT(*) FILTER (WHERE status = 'updated')::NUMERIC /
         NULLIF(COUNT(*) FILTER (WHERE memo_number IS NOT NULL), 0) * 100
        )::NUMERIC, 2)
      ELSE 0
    END
  )
  INTO v_stats
  FROM processed_inbox_emails
  WHERE (p_date_from IS NULL OR processed_at::date >= p_date_from)
    AND (p_date_to IS NULL OR processed_at::date <= p_date_to);

  RETURN v_stats;
END;
$function$;
