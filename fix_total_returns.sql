-- Fix totalReturns calculation in admin_pharmacies_functions
-- This script updates the get_admin_pharmacies_list function to count from return_transactions instead of uploaded_documents

-- Drop all possible variations of get_admin_pharmacies_list
DROP FUNCTION IF EXISTS get_admin_pharmacies_list(TEXT, TEXT, INTEGER, INTEGER);
DROP FUNCTION IF EXISTS get_admin_pharmacies_list(TEXT, TEXT, INTEGER, INTEGER, UUID);
DROP FUNCTION IF EXISTS get_admin_pharmacies_list(UUID, INTEGER, INTEGER, TEXT, TEXT);
DROP FUNCTION IF EXISTS get_admin_pharmacies_list CASCADE;

CREATE OR REPLACE FUNCTION get_admin_pharmacies_list(
    p_search TEXT DEFAULT NULL,
    p_status TEXT DEFAULT 'all',
    p_page INTEGER DEFAULT 1,
    p_limit INTEGER DEFAULT 10,
    p_buying_group_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_result JSONB;
    v_pharmacies JSONB;
    v_total_count INTEGER;
    v_offset INTEGER;
    v_normalized_search TEXT;
BEGIN
    -- Normalize search parameter: trim whitespace and handle empty strings
    IF p_search IS NOT NULL THEN
        v_normalized_search := TRIM(p_search);
        -- Set to NULL if empty after trimming
        IF v_normalized_search = '' THEN
            v_normalized_search := NULL;
        END IF;
    ELSE
        v_normalized_search := NULL;
    END IF;
    
    -- Calculate offset
    v_offset := (p_page - 1) * p_limit;
    
    -- Get total count with filters
    SELECT COUNT(*)::INTEGER
    INTO v_total_count
    FROM pharmacy p
    WHERE 
        -- Status filter
        (p_status = 'all' OR p.status = p_status)
        -- Tenant (buying group) scope filter.
        -- When p_buying_group_id is NULL (MainAdmin / localhost), show all.
        -- Otherwise only return pharmacies owned by that buying group.
        AND (p_buying_group_id IS NULL OR p.created_by = p_buying_group_id)
        -- Search filter (business name, owner name, email, or id)
        AND (
            v_normalized_search IS NULL 
            OR LOWER(p.pharmacy_name) LIKE LOWER('%' || v_normalized_search || '%')
            OR LOWER(p.name) LIKE LOWER('%' || v_normalized_search || '%')
            OR LOWER(p.email) LIKE LOWER('%' || v_normalized_search || '%')
            OR CAST(p.id AS TEXT) LIKE LOWER('%' || v_normalized_search || '%')
        );
    
    -- Get pharmacies with all required fields
    WITH pharmacy_data AS (
        SELECT 
            p.id,
            p.pharmacy_name AS "businessName",
            p.name AS owner,
            p.email,
            COALESCE(p.phone, p.contact_phone) AS phone,
            p.fax_number AS fax,
            COALESCE(p.physical_address->>'city', '') AS city,
            COALESCE(p.physical_address->>'state', '') AS state,
            COALESCE(p.status, 'pending') AS status,
            COALESCE(p.physical_address->>'street', '') AS address,
            COALESCE(p.physical_address->>'zip', '') AS "zipCode",
            COALESCE(p.state_license_number, p.npi_number, p.dea_number, '') AS "licenseNumber",
            p.dea_number AS "deaNumber",
            p.dea_expiration_date AS "deaExpiration",
            p.primary_wholesaler AS wholesaler,
            p.wholesaler_account_number AS "wholesalerAccount",
            p.secondary_wholesaler AS "secondaryWholesaler",
            p.service_type AS "serviceType",
            p.days_between_visits AS "daysBetweenVisits",
            p.last_visit_date AS "lastVisitDate",
            p.next_visit_date AS "nextVisitDate",
            p.created_at AS "createdAt",
            -- Count total returns (transactions) for this pharmacy - FIXED
            (SELECT COUNT(*)::INTEGER FROM return_transactions rt WHERE rt.pharmacy_id = p.id) AS "totalReturns"
        FROM pharmacy p
        WHERE 
            -- Status filter
            (p_status = 'all' OR p.status = p_status)
            -- Tenant (buying group) scope filter.
            AND (p_buying_group_id IS NULL OR p.created_by = p_buying_group_id)
            -- Search filter
            AND (
                v_normalized_search IS NULL 
                OR LOWER(p.pharmacy_name) LIKE LOWER('%' || v_normalized_search || '%')
                OR LOWER(p.name) LIKE LOWER('%' || v_normalized_search || '%')
                OR LOWER(p.email) LIKE LOWER('%' || v_normalized_search || '%')
                OR CAST(p.id AS TEXT) LIKE LOWER('%' || v_normalized_search || '%')
            )
        ORDER BY p.created_at DESC
        LIMIT p_limit
        OFFSET v_offset
    )
    SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
            'id', pd.id,
            'businessName', pd."businessName",
            'owner', pd.owner,
            'email', pd.email,
            'phone', pd.phone,
            'fax', pd.fax,
            'city', pd.city,
            'state', pd.state,
            'status', pd.status,
            'address', pd.address,
            'zipCode', pd."zipCode",
            'licenseNumber', pd."licenseNumber",
            'deaNumber', pd."deaNumber",
            'deaExpiration', pd."deaExpiration",
            'wholesaler', pd.wholesaler,
            'wholesalerAccount', pd."wholesalerAccount",
            'secondaryWholesaler', pd."secondaryWholesaler",
            'serviceType', pd."serviceType",
            'daysBetweenVisits', pd."daysBetweenVisits",
            'lastVisitDate', pd."lastVisitDate",
            'nextVisitDate', pd."nextVisitDate",
            'totalReturns', pd."totalReturns",
            'createdAt', pd."createdAt"
        )
    ), '[]'::JSONB)
    INTO v_pharmacies
    FROM pharmacy_data pd;
    
    -- Build result
    v_result := jsonb_build_object(
        'pharmacies', v_pharmacies,
        'pagination', jsonb_build_object(
            'page', p_page,
            'limit', p_limit,
            'total', v_total_count,
            'totalPages', CEIL(v_total_count::NUMERIC / p_limit::NUMERIC)::INTEGER
        ),
        'filters', jsonb_build_object(
            'search', v_normalized_search,
            'status', p_status
        ),
        'generatedAt', NOW()
    );
    
    RETURN v_result;
END;
$$;

-- Also fix the single pharmacy function
-- Drop all possible variations of get_admin_pharmacy_by_id
DROP FUNCTION IF EXISTS get_admin_pharmacy_by_id(UUID);
DROP FUNCTION IF EXISTS get_admin_pharmacy_by_id(UUID, UUID);
DROP FUNCTION IF EXISTS get_admin_pharmacy_by_id CASCADE;

CREATE OR REPLACE FUNCTION get_admin_pharmacy_by_id(
    p_pharmacy_id UUID,
    p_buying_group_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_result JSONB;
    v_pharmacy JSONB;
    v_exists BOOLEAN;
BEGIN
    -- Check if pharmacy exists AND belongs to the caller's buying group
    -- (NULL buying group = MainAdmin / localhost → no tenant filter)
    SELECT EXISTS(
        SELECT 1 FROM pharmacy
        WHERE id = p_pharmacy_id
          AND (p_buying_group_id IS NULL OR created_by = p_buying_group_id)
    )
    INTO v_exists;
    
    IF NOT v_exists THEN
        RETURN jsonb_build_object(
            'error', true,
            'message', 'Pharmacy not found',
            'code', 404
        );
    END IF;
    
    -- Get pharmacy details
    SELECT jsonb_build_object(
        'id', p.id,
        'businessName', p.pharmacy_name,
        'owner', p.name,
        'email', p.email,
        'phone', COALESCE(p.phone, p.contact_phone),
        'fax', p.fax_number,
        'city', COALESCE(p.physical_address->>'city', ''),
        'state', COALESCE(p.physical_address->>'state', ''),
        'status', COALESCE(p.status, 'pending'),
        'address', COALESCE(p.physical_address->>'street', ''),
        'zipCode', COALESCE(p.physical_address->>'zip', ''),
        'licenseNumber', COALESCE(p.state_license_number, p.npi_number, p.dea_number, ''),
        'stateLicenseNumber', p.state_license_number,
        'licenseExpiryDate', p.license_expiry_date,
        'npiNumber', p.npi_number,
        'deaNumber', p.dea_number,
        'deaExpiration', p.dea_expiration_date,
        'wholesaler', p.primary_wholesaler,
        'wholesalerAccount', p.wholesaler_account_number,
        'serviceType', p.service_type,
        'daysBetweenVisits', p.days_between_visits,
        'lastVisitDate', p.last_visit_date,
        'nextVisitDate', p.next_visit_date,
        'totalReturns', (SELECT COUNT(*)::INTEGER FROM return_transactions rt WHERE rt.pharmacy_id = p.id),
        'totalReturnsValue', (SELECT COALESCE(SUM(total_returnable_value), 0)::NUMERIC FROM return_transactions rt WHERE rt.pharmacy_id = p.id),
        'physicalAddress', p.physical_address,
        'billingAddress', p.billing_address,
        'secondaryWholesaler', p.secondary_wholesaler,
        'subscriptionTier', p.subscription_tier,
        'subscriptionStatus', p.subscription_status,
        'createdAt', p.created_at,
        'updatedAt', p.updated_at
    )
    INTO v_pharmacy
    FROM pharmacy p
    WHERE p.id = p_pharmacy_id;
    
    -- Build result
    v_result := jsonb_build_object(
        'pharmacy', v_pharmacy,
        'generatedAt', NOW()
    );
    
    RETURN v_result;
END;
$$;

-- Grant Permissions
GRANT EXECUTE ON FUNCTION get_admin_pharmacies_list(TEXT, TEXT, INTEGER, INTEGER, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_admin_pharmacies_list(TEXT, TEXT, INTEGER, INTEGER, UUID) TO service_role;

GRANT EXECUTE ON FUNCTION get_admin_pharmacy_by_id(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_admin_pharmacy_by_id(UUID, UUID) TO service_role;