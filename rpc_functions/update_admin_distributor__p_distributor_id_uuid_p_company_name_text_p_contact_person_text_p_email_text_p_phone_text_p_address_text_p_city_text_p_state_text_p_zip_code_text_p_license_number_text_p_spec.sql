-- Function : update_admin_distributor
-- Arguments: p_distributor_id uuid, p_company_name text, p_contact_person text, p_email text, p_phone text, p_address text, p_city text, p_state text, p_zip_code text, p_license_number text, p_specializations text[]
-- Type     : FUNCTION
-- =============================================================

DROP FUNCTION IF EXISTS public.update_admin_distributor(p_distributor_id uuid, p_company_name text, p_contact_person text, p_email text, p_phone text, p_address text, p_city text, p_state text, p_zip_code text, p_license_number text, p_specializations text[]) CASCADE;

CREATE OR REPLACE FUNCTION public.update_admin_distributor(p_distributor_id uuid, p_company_name text DEFAULT NULL::text, p_contact_person text DEFAULT NULL::text, p_email text DEFAULT NULL::text, p_phone text DEFAULT NULL::text, p_address text DEFAULT NULL::text, p_city text DEFAULT NULL::text, p_state text DEFAULT NULL::text, p_zip_code text DEFAULT NULL::text, p_license_number text DEFAULT NULL::text, p_specializations text[] DEFAULT NULL::text[])
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    v_result JSONB;
    v_current_address JSONB;
BEGIN
    -- Check if distributor exists
    IF NOT EXISTS (SELECT 1 FROM reverse_distributors WHERE id = p_distributor_id) THEN
        RAISE EXCEPTION 'Distributor not found';
    END IF;
    
    -- Get current address for merging
    SELECT COALESCE(address, '{}'::JSONB) INTO v_current_address
    FROM reverse_distributors
    WHERE id = p_distributor_id;
    
    -- Update distributor fields (only non-null parameters)
    UPDATE reverse_distributors
    SET
        name = COALESCE(NULLIF(TRIM(p_company_name), ''), name),
        contact_person = CASE 
            WHEN p_contact_person IS NOT NULL THEN NULLIF(TRIM(p_contact_person), '')
            ELSE contact_person
        END,
        contact_email = CASE 
            WHEN p_email IS NOT NULL THEN NULLIF(TRIM(p_email), '')
            ELSE contact_email
        END,
        contact_phone = CASE 
            WHEN p_phone IS NOT NULL THEN NULLIF(TRIM(p_phone), '')
            ELSE contact_phone
        END,
        address = CASE 
            WHEN p_address IS NOT NULL OR p_city IS NOT NULL OR p_state IS NOT NULL OR p_zip_code IS NOT NULL THEN
                jsonb_build_object(
                    'street', COALESCE(p_address, v_current_address->>'street', ''),
                    'city', COALESCE(p_city, v_current_address->>'city', ''),
                    'state', COALESCE(p_state, v_current_address->>'state', ''),
                    'zipCode', COALESCE(p_zip_code, v_current_address->>'zipCode', ''),
                    'country', COALESCE(v_current_address->>'country', 'USA')
                )
            ELSE address
        END,
        license_number = CASE 
            WHEN p_license_number IS NOT NULL THEN NULLIF(TRIM(p_license_number), '')
            ELSE license_number
        END,
        specializations = COALESCE(p_specializations, specializations)
    WHERE id = p_distributor_id;
    
    -- Get the updated distributor
    v_result := get_admin_distributor_by_id(p_distributor_id);
    
    RETURN v_result;
END;
$function$;
