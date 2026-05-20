-- Function : get_available_languages
-- Arguments: none
-- Type     : FUNCTION
-- =============================================================

DROP FUNCTION IF EXISTS public.get_available_languages() CASCADE;

CREATE OR REPLACE FUNCTION public.get_available_languages()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  RETURN jsonb_build_object(
    'languages', jsonb_build_array(
      jsonb_build_object('value', 'en', 'label', 'English'),
      jsonb_build_object('value', 'es', 'label', 'Spanish'),
      jsonb_build_object('value', 'fr', 'label', 'French')
    )
  );
END;
$function$;
