-- ============================================================
-- read-ra-emails pg_cron diagnostics (Supabase-safe)
-- ============================================================
-- NEVER paste this in the same run as a plain query:
--   SELECT * FROM cron.job ...
-- That fails with 42P01 until pg_cron is enabled (cron schema missing).
--
-- This file has NO direct cron.job reference — only dynamic SQL inside
-- the function, which runs only after checking pg_extension.
--
-- Enable pg_cron: Dashboard → Database → Extensions → pg_cron → Enable
-- ============================================================

CREATE OR REPLACE FUNCTION public.diagnostics_list_read_ra_cron_jobs()
RETURNS TABLE(
  jobid bigint,
  schedule text,
  command text,
  jobname text,
  active boolean
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;

COMMENT ON FUNCTION public.diagnostics_list_read_ra_cron_jobs() IS
  'Lists read-ra-emails cron jobs when pg_cron is enabled; else empty set.';

-- Extension present? (always safe — no cron schema needed)
SELECT extname, extversion
FROM pg_extension
WHERE extname = 'pg_cron';

-- Job rows (safe even when pg_cron is off — returns 0 rows)
SELECT * FROM public.diagnostics_list_read_ra_cron_jobs();
