-- Function : _pharmacy_reports_find_txn
-- Arguments: p_pharmacy_id uuid, p_ref_num text
-- Type     : FUNCTION
-- =============================================================

DROP FUNCTION IF EXISTS public._pharmacy_reports_find_txn(p_pharmacy_id uuid, p_ref_num text) CASCADE;

CREATE OR REPLACE FUNCTION public._pharmacy_reports_find_txn(p_pharmacy_id uuid, p_ref_num text)
 RETURNS return_transactions
 LANGUAGE sql
 STABLE
AS $function$
  SELECT rt.*
    FROM return_transactions rt
   WHERE rt.pharmacy_id = p_pharmacy_id
     AND rt.license_plate = p_ref_num
   LIMIT 1;
$function$;
