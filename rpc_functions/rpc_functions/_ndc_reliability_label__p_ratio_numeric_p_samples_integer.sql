-- Function : _ndc_reliability_label
-- Arguments: p_ratio numeric, p_samples integer
-- Type     : FUNCTION
-- =============================================================

DROP FUNCTION IF EXISTS public._ndc_reliability_label(p_ratio numeric, p_samples integer) CASCADE;

CREATE OR REPLACE FUNCTION public._ndc_reliability_label(p_ratio numeric, p_samples integer)
 RETURNS text
 LANGUAGE sql
 IMMUTABLE
AS $function$
  SELECT CASE
    WHEN p_samples IS NULL OR p_samples = 0 OR p_ratio IS NULL THEN 'unknown'
    WHEN p_ratio >= 90 AND p_samples >= 10 THEN 'excellent'
    WHEN p_ratio >= 80 AND p_samples >= 5  THEN 'good'
    WHEN p_ratio >= 65 AND p_samples >= 3  THEN 'average'
    ELSE 'poor'
  END;
$function$;
