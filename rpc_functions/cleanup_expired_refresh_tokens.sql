-- Function : cleanup_expired_refresh_tokens
-- Arguments: none
-- Type     : FUNCTION
-- =============================================================

DROP FUNCTION IF EXISTS public.cleanup_expired_refresh_tokens() CASCADE;

CREATE OR REPLACE FUNCTION public.cleanup_expired_refresh_tokens()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
    DELETE FROM refresh_tokens 
    WHERE expires_at < NOW() 
       OR revoked_at IS NOT NULL;
END;
$function$;
