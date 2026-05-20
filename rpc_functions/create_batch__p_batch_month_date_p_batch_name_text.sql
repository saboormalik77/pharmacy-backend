-- Function : create_batch
-- Arguments: p_batch_month date, p_batch_name text
-- Type     : FUNCTION
-- =============================================================

DROP FUNCTION IF EXISTS public.create_batch(p_batch_month date, p_batch_name text) CASCADE;

CREATE OR REPLACE FUNCTION public.create_batch(p_batch_month date, p_batch_name text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_name TEXT;
  v_row  return_batches;
BEGIN
  -- Normalise to first of month
  p_batch_month := DATE_TRUNC('month', p_batch_month)::date;

  -- Check duplicate
  IF EXISTS (SELECT 1 FROM return_batches WHERE batch_month = p_batch_month) THEN
    RETURN jsonb_build_object('error', true, 'code', 400,
      'message', format('A batch already exists for %s', TO_CHAR(p_batch_month, 'Month YYYY')));
  END IF;

  v_name := COALESCE(NULLIF(TRIM(p_batch_name), ''), TO_CHAR(p_batch_month, 'Month YYYY'));

  INSERT INTO return_batches (batch_month, batch_name)
  VALUES (p_batch_month, v_name)
  RETURNING * INTO v_row;

  RETURN jsonb_build_object('error', false, 'data', _batch_to_json(v_row));
END;
$function$;
