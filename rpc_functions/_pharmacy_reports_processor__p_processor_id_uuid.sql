-- Function : _pharmacy_reports_processor
-- Arguments: p_processor_id uuid
-- Type     : FUNCTION
-- =============================================================

DROP FUNCTION IF EXISTS public._pharmacy_reports_processor(p_processor_id uuid) CASCADE;

CREATE OR REPLACE FUNCTION public._pharmacy_reports_processor(p_processor_id uuid)
 RETURNS jsonb
 LANGUAGE sql
 STABLE
AS $function$
  SELECT CASE
    WHEN p_processor_id IS NULL THEN
      jsonb_build_object(
        'processorId',   NULL,
        'name',          'Pharmacy Returns Center',
        'address',       '',
        'phone',         '',
        'deaNumber',     '',
        'email',         ''
      )
    ELSE
      jsonb_build_object(
        'processorId',   pr.id,
        'name',          COALESCE(pr.name, 'Pharmacy Returns Center'),
        'address',       '',
        'phone',         COALESCE(pr.phone, ''),
        'deaNumber',     '',
        'email',         COALESCE(pr.email, '')
      )
  END
  FROM (SELECT 1) dummy
  LEFT JOIN processors pr ON pr.id = p_processor_id;
$function$;
