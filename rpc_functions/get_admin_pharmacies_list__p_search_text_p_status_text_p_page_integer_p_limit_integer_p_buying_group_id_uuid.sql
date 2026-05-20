-- Function : get_admin_pharmacies_list
-- Arguments: p_search text, p_status text, p_page integer, p_limit integer, p_buying_group_id uuid
-- Type     : FUNCTION
-- =============================================================

DROP FUNCTION IF EXISTS public.get_admin_pharmacies_list(p_search text, p_status text, p_page integer, p_limit integer, p_buying_group_id uuid) CASCADE;

CREATE OR REPLACE FUNCTION public.get_admin_pharmacies_list(p_search text DEFAULT NULL::text, p_status text DEFAULT 'all'::text, p_page integer DEFAULT 1, p_limit integer DEFAULT 10, p_buying_group_id uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
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
            -- Count total returns (transactions) for this pharmacy
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
$function$;
