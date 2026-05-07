-- ============================================================
-- Schedule read-ra-emails Edge Function via pg_cron + pg_net
-- ============================================================
-- Prereqs:
--   1. Deploy edge function read-ra-emails on this project.
--   2. Replace zggtgjbokgfsbenazzpx and eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpnZ3RnamJva2dmc2JlbmF6enB4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTIyMjM4NCwiZXhwIjoyMDkwNzk4Mzg0fQ.VEuwxNr5OUTE5WnH9APUB2K0ivS611eccff8LZhBdSU below (never commit real values).
--
-- If you see: relation "cron.job" does not exist
--   → Extensions are not installed yet. Do ONE of:
--     A) Run STEP 1 below (CREATE EXTENSION). If it errors with permission denied, use B.
--     B) Dashboard → Database → Extensions → enable pg_net, then pg_cron → then run from STEP 2.
--
-- If a service_role key was ever committed, rotate: Settings → API → Regenerate service_role.
-- ============================================================

-- STEP 1 — creates cron schema (cron.job). Required before any cron.* query.
-- If this fails: use Dashboard → Database → Extensions → enable pg_net, then pg_cron, then start at STEP 2.
CREATE EXTENSION IF NOT EXISTS pg_net;
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- STEP 2 — remove old job if present (0 rows = nothing to remove)
SELECT cron.unschedule(jobid)
FROM cron.job
WHERE jobname = 'read-ra-emails-cron-1min';

-- STEP 3 — schedule (every minute). Use '*/15 * * * *' for every 15 minutes.
SELECT cron.schedule(
  'read-ra-emails-cron-1min',
  '* * * * *',
  $$
  SELECT net.http_post(
    url := 'https://zggtgjbokgfsbenazzpx.supabase.co/functions/v1/read-ra-emails',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpnZ3RnamJva2dmc2JlbmF6enB4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTIyMjM4NCwiZXhwIjoyMDkwNzk4Mzg0fQ.VEuwxNr5OUTE5WnH9APUB2K0ivS611eccff8LZhBdSU'
    ),
    body := '{"maxEmails": 50, "markAsRead": true}'::jsonb
  );
  $$
);

-- STEP 4 — verify
SELECT jobid, schedule, active, jobname
FROM cron.job
WHERE jobname = 'read-ra-emails-cron-1min';
