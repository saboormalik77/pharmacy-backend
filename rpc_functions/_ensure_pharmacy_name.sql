-- Function : _ensure_pharmacy_name
-- Arguments: none
-- Type     : FUNCTION
-- =============================================================

DROP FUNCTION IF EXISTS public._ensure_pharmacy_name() CASCADE;

CREATE OR REPLACE FUNCTION public._ensure_pharmacy_name()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  IF NEW.pharmacy_name IS NULL OR TRIM(NEW.pharmacy_name) = '' THEN
    NEW.pharmacy_name := COALESCE(
      NULLIF(TRIM(NEW.name), ''),
      NULLIF(TRIM(SPLIT_PART(NEW.email, '@', 1)), ''),
      'Pharmacy ' || SUBSTRING(NEW.id::text, 1, 8)
    );
  END IF;
  RETURN NEW;
END;
$function$;
