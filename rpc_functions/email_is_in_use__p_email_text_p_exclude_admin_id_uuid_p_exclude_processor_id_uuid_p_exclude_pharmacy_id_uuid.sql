-- Function : email_is_in_use
-- Arguments: p_email text, p_exclude_admin_id uuid, p_exclude_processor_id uuid, p_exclude_pharmacy_id uuid
-- Type     : FUNCTION
-- =============================================================

DROP FUNCTION IF EXISTS public.email_is_in_use(p_email text, p_exclude_admin_id uuid, p_exclude_processor_id uuid, p_exclude_pharmacy_id uuid) CASCADE;

CREATE OR REPLACE FUNCTION public.email_is_in_use(p_email text, p_exclude_admin_id uuid DEFAULT NULL::uuid, p_exclude_processor_id uuid DEFAULT NULL::uuid, p_exclude_pharmacy_id uuid DEFAULT NULL::uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
AS $function$
DECLARE
  v_email TEXT;
BEGIN
  v_email := LOWER(TRIM(p_email));
  IF v_email IS NULL OR v_email = '' THEN
    RETURN false;
  END IF;

  IF EXISTS (
    SELECT 1 FROM admin
    WHERE LOWER(TRIM(email)) = v_email
      AND (p_exclude_admin_id IS NULL OR id <> p_exclude_admin_id)
  ) THEN
    RETURN true;
  END IF;

  IF EXISTS (
    SELECT 1 FROM processors
    WHERE email IS NOT NULL
      AND LOWER(TRIM(email)) = v_email
      AND (p_exclude_processor_id IS NULL OR id <> p_exclude_processor_id)
  ) THEN
    RETURN true;
  END IF;

  IF EXISTS (
    SELECT 1 FROM pharmacy
    WHERE LOWER(TRIM(email)) = v_email
      AND (p_exclude_pharmacy_id IS NULL OR id <> p_exclude_pharmacy_id)
  ) THEN
    RETURN true;
  END IF;

  IF EXISTS (
    SELECT 1 FROM pharmacy_invites
    WHERE LOWER(TRIM(email)) = v_email
      AND status = 'pending'
      AND expires_at > NOW()
  ) THEN
    RETURN true;
  END IF;

  IF EXISTS (
    SELECT 1 FROM pharmacy_branch_invites
    WHERE LOWER(TRIM(email)) = v_email
      AND status = 'pending'
      AND expires_at > NOW()
  ) THEN
    RETURN true;
  END IF;

  RETURN false;
END;
$function$;
