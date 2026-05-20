-- Function : auto_set_dea_form_222_required
-- Arguments: none
-- Type     : FUNCTION
-- =============================================================

DROP FUNCTION IF EXISTS public.auto_set_dea_form_222_required() CASCADE;

CREATE OR REPLACE FUNCTION public.auto_set_dea_form_222_required()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  -- Check if dea_schedule indicates Schedule II controlled substance
  -- (Only CII/Schedule II requires DEA Form 222)
  IF NEW.dea_schedule IS NOT NULL AND (
    NEW.dea_schedule = 'CII' OR      -- From dropdown: "CII" 
    NEW.dea_schedule ILIKE '%CII%' OR -- Legacy: "CII", "C-II", etc.
    NEW.dea_schedule ILIKE '%C-II%' OR 
    NEW.dea_schedule ILIKE '%C2%' OR 
    NEW.dea_schedule = 'II' OR 
    NEW.dea_schedule = '2' OR
    NEW.dea_schedule ILIKE 'Schedule II%'
  ) THEN
    NEW.dea_form_222_required := true;
  END IF;
  
  RETURN NEW;
END;
$function$;
