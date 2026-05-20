-- Function : is_return_transaction_locked
-- Arguments: p_status text
-- Type     : FUNCTION
-- =============================================================

DROP FUNCTION IF EXISTS public.is_return_transaction_locked(p_status text) CASCADE;

CREATE OR REPLACE FUNCTION public.is_return_transaction_locked(p_status text)
 RETURNS boolean
 LANGUAGE sql
 IMMUTABLE
AS $function$
  SELECT p_status IN ('finalized', 'scanning', 'received', 'verified', 'closed', 'closed_out');
$function$;
