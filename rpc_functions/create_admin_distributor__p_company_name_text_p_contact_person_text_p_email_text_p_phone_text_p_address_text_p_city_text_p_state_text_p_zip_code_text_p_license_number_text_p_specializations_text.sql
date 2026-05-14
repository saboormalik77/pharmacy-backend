-- Function : create_admin_distributor
-- Arguments: p_company_name text, p_contact_person text, p_email text, p_phone text, p_address text, p_city text, p_state text, p_zip_code text, p_license_number text, p_specializations text[]
-- Type     : FUNCTION
-- =============================================================

DROP FUNCTION IF EXISTS public.create_admin_distributor(p_company_name text, p_contact_person text, p_email text, p_phone text, p_address text, p_city text, p_state text, p_zip_code text, p_license_number text, p_specializations text[]) CASCADE;

CREATE OR REPLACE FUNCTION public.create_admin_distributor(p_company_name text, p_contact_person text DEFAULT NULL::text, p_email text DEFAULT NULL::text, p_phone text DEFAULT NULL::text, p_address text DEFAULT NULL::text, p_city text DEFAULT NULL::text, p_state text DEFAULT NULL::text, p_zip_code text DEFAULT NULL::text, p_license_number text DEFAULT NULL::text, p_specializations text[] DEFAULT ARRAY[]::text[])
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    v_result JSONB;
    v_new_id UUID;
    v_address_json JSONB;
    v_code TEXT;
BEGIN
    -- Validate required field
    IF p_company_name IS NULL OR TRIM(p_company_name) = '' THEN
        RAISE EXCEPTION 'Company name is required';
    END IF;
    
    -- Generate a code from company name (first 4 chars uppercase)
    v_code := UPPER(SUBSTRING(REGEXP_REPLACE(p_company_name, '[^a-zA-Z]', '', 'g'), 1, 4));
    
    -- Build address JSON
    v_address_json := jsonb_build_object(
        'street', COALESCE(p_address, ''),
        'city', COALESCE(p_city, ''),
        'state', COALESCE(p_state, ''),
        'zipCode', COALESCE(p_zip_code, ''),
        'country', 'USA'
    );
    
    -- Insert new distributor
    INSERT INTO reverse_distributors (
        name,
        code,
        contact_person,
        contact_email,
        contact_phone,
        address,
        license_number,
        specializations,
        is_active,
        created_at
    ) VALUES (
        TRIM(p_company_name),
        v_code,
        NULLIF(TRIM(p_contact_person), ''),
        NULLIF(TRIM(p_email), ''),
        NULLIF(TRIM(p_phone), ''),
        v_address_json,
        NULLIF(TRIM(p_license_number), ''),
        p_specializations,
        TRUE,
        NOW()
    )
    RETURNING id INTO v_new_id;
    
    -- Get the created distributor
    v_result := get_admin_distributor_by_id(v_new_id);
    
    RETURN v_result;
END;
$function$;
