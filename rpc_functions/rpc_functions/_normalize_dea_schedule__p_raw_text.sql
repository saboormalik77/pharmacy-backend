-- Function : _normalize_dea_schedule
-- Arguments: p_raw text
-- Type     : FUNCTION
-- =============================================================

DROP FUNCTION IF EXISTS public._normalize_dea_schedule(p_raw text) CASCADE;

CREATE OR REPLACE FUNCTION public._normalize_dea_schedule(p_raw text)
 RETURNS text
 LANGUAGE plpgsql
 IMMUTABLE
AS $function$
DECLARE
  v TEXT;
BEGIN
  IF p_raw IS NULL THEN RETURN NULL; END IF;

  v := UPPER(REGEXP_REPLACE(p_raw, '[^0-9IVC]', '', 'g'));
  -- strip leading "C" (controlled prefix)
  IF v LIKE 'C%' THEN v := SUBSTRING(v FROM 2); END IF;

  IF v = '1' OR v = 'I'   THEN RETURN 'I';   END IF;
  IF v = '2' OR v = 'II'  THEN RETURN 'II';  END IF;
  IF v = '3' OR v = 'III' THEN RETURN 'III'; END IF;
  IF v = '4' OR v = 'IV'  THEN RETURN 'IV';  END IF;
  IF v = '5' OR v = 'V'   THEN RETURN 'V';   END IF;

  RETURN NULL;
END;
$function$;
