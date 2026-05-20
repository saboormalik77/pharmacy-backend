-- Function : is_legacy_return_locked
-- Arguments: p_status text
-- Type     : FUNCTION
-- =============================================================

DROP FUNCTION IF EXISTS public.is_legacy_return_locked(p_status text) CASCADE;

CREATE OR REPLACE FUNCTION public.is_legacy_return_locked(p_status text)
 RETURNS boolean
 LANGUAGE sql
 IMMUTABLE
AS $function$
  -- Lock returns that are in_transit, processing, or completed
  -- These correspond to returns that have been shipped or are being processed
  SELECT p_status IN ('in_transit', 'processing', 'completed');
$function$;
