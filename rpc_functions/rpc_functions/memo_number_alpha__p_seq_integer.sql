-- Function : memo_number_alpha
-- Arguments: p_seq integer
-- Type     : FUNCTION
-- =============================================================

DROP FUNCTION IF EXISTS public.memo_number_alpha(p_seq integer) CASCADE;

CREATE OR REPLACE FUNCTION public.memo_number_alpha(p_seq integer)
 RETURNS text
 LANGUAGE sql
 IMMUTABLE
AS $function$
  -- Clamp to [1, 17576] so callers can never produce a corrupt chr() value.
  -- 17576 = 26^3 (ZZZ), sufficient for any realistic batch size.
  SELECT
    CHR(65 + (GREATEST(1, LEAST(p_seq, 17576)) - 1) / 676 % 26) ||
    CHR(65 + (GREATEST(1, LEAST(p_seq, 17576)) - 1) / 26  % 26) ||
    CHR(65 + (GREATEST(1, LEAST(p_seq, 17576)) - 1)        % 26);
$function$;
