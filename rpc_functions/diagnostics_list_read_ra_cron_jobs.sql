-- Function : diagnostics_list_read_ra_cron_jobs
-- Arguments: none
-- Type     : FUNCTION
-- =============================================================

DROP FUNCTION IF EXISTS public.diagnostics_list_read_ra_cron_jobs() CASCADE;

CREATE OR REPLACE FUNCTION public.diagnostics_list_read_ra_cron_jobs()
 RETURNS TABLE(jobid bigint, schedule text, command text, jobname text, active boolean)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    RETURN;
  END IF;

  RETURN QUERY EXECUTE $q$
    SELECT j.jobid, j.schedule, j.command::text, j.jobname, j.active
    FROM cron.job j
    WHERE j.jobname = 'read-ra-emails-cron-1min'
       OR j.jobname LIKE 'read-ra-emails%'
  $q$;
END;
$function$;
