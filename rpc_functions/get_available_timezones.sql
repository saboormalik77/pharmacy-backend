-- Function : get_available_timezones
-- Arguments: none
-- Type     : FUNCTION
-- =============================================================

DROP FUNCTION IF EXISTS public.get_available_timezones() CASCADE;

CREATE OR REPLACE FUNCTION public.get_available_timezones()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  RETURN jsonb_build_object(
    'timezones', jsonb_build_array(
      jsonb_build_object('value', 'America/New_York', 'label', 'Eastern Time (ET)'),
      jsonb_build_object('value', 'America/Chicago', 'label', 'Central Time (CT)'),
      jsonb_build_object('value', 'America/Denver', 'label', 'Mountain Time (MT)'),
      jsonb_build_object('value', 'America/Los_Angeles', 'label', 'Pacific Time (PT)'),
      jsonb_build_object('value', 'America/Phoenix', 'label', 'Arizona Time'),
      jsonb_build_object('value', 'America/Anchorage', 'label', 'Alaska Time (AKT)'),
      jsonb_build_object('value', 'Pacific/Honolulu', 'label', 'Hawaii Time (HT)'),
      jsonb_build_object('value', 'UTC', 'label', 'UTC')
    )
  );
END;
$function$;
