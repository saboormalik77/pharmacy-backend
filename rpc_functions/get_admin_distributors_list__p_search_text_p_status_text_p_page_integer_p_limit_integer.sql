-- Function : get_admin_distributors_list
-- Arguments: p_search text, p_status text, p_page integer, p_limit integer
-- Type     : FUNCTION
-- =============================================================

DROP FUNCTION IF EXISTS public.get_admin_distributors_list(p_search text, p_status text, p_page integer, p_limit integer) CASCADE;

CREATE OR REPLACE FUNCTION public.get_admin_distributors_list(p_search text DEFAULT NULL::text, p_status text DEFAULT 'all'::text, p_page integer DEFAULT 1, p_limit integer DEFAULT 20)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    v_result JSONB;
    v_distributors JSONB;
    v_total_count INTEGER;
    v_offset INTEGER;
    v_normalized_search TEXT;
    -- Stats variables (global, not affected by search/filter)
    v_stats_total_distributors INTEGER;
    v_stats_active_distributors INTEGER;
    v_stats_total_deals INTEGER;
BEGIN
    -- Normalize search parameter
    IF p_search IS NOT NULL THEN
        v_normalized_search := TRIM(p_search);
        IF v_normalized_search = '' THEN
            v_normalized_search := NULL;
        END IF;
    ELSE
        v_normalized_search := NULL;
    END IF;
    
    -- Calculate offset
    v_offset := (p_page - 1) * p_limit;
    
    -- Get GLOBAL stats (not affected by search/filter)
    SELECT COUNT(*)::INTEGER INTO v_stats_total_distributors
    FROM reverse_distributors;
    
    SELECT COUNT(*)::INTEGER INTO v_stats_active_distributors
    FROM reverse_distributors
    WHERE is_active = TRUE;
    
    SELECT COUNT(*)::INTEGER INTO v_stats_total_deals
    FROM custom_packages
    WHERE distributor_id IS NOT NULL;
    
    -- Get total count with filters (for pagination)
    SELECT COUNT(*)::INTEGER
    INTO v_total_count
    FROM reverse_distributors rd
    WHERE 
        -- Status filter
        (p_status = 'all' OR 
         (p_status = 'active' AND rd.is_active = TRUE) OR
         (p_status = 'inactive' AND rd.is_active = FALSE))
        -- Search filter (company name, contact person, email, id)
        AND (
            v_normalized_search IS NULL 
            OR LOWER(rd.name) LIKE LOWER('%' || v_normalized_search || '%')
            OR LOWER(COALESCE(rd.contact_person, '')) LIKE LOWER('%' || v_normalized_search || '%')
            OR LOWER(COALESCE(rd.contact_email, '')) LIKE LOWER('%' || v_normalized_search || '%')
            OR CAST(rd.id AS TEXT) LIKE LOWER('%' || v_normalized_search || '%')
            OR LOWER(COALESCE(rd.code, '')) LIKE LOWER('%' || v_normalized_search || '%')
        );
    
    -- Get distributors with all required fields
    WITH distributor_data AS (
        SELECT 
            rd.id,
            rd.name AS "companyName",
            COALESCE(rd.contact_person, '') AS "contactPerson",
            COALESCE(rd.contact_email, '') AS email,
            COALESCE(rd.contact_phone, '') AS phone,
            COALESCE(rd.address->>'street', '') AS address,
            COALESCE(rd.address->>'city', '') AS city,
            COALESCE(rd.address->>'state', '') AS state,
            COALESCE(rd.address->>'zipCode', '') AS "zipCode",
            CASE WHEN rd.is_active THEN 'active' ELSE 'inactive' END AS status,
            COALESCE(rd.license_number, '') AS "licenseNumber",
            COALESCE(rd.specializations, ARRAY[]::TEXT[]) AS specializations,
            -- Count total deals (packages) for this distributor
            (SELECT COUNT(*)::INTEGER FROM custom_packages cp WHERE cp.distributor_id = rd.id) AS "totalDeals",
            -- Count unique products (NDCs) from return_reports, only latest report_date per NDC
            (
                SELECT COUNT(DISTINCT latest_ndc.ndc)::INTEGER
                FROM (
                    -- Get the latest report_date for each NDC for this distributor
                    SELECT 
                        rr.data->>'ndcCode' AS ndc,
                        MAX(ud.report_date) AS latest_report_date
                    FROM uploaded_documents ud
                    INNER JOIN return_reports rr ON rr.document_id = ud.id
                    WHERE ud.reverse_distributor_id = rd.id
                      AND rr.data->>'ndcCode' IS NOT NULL
                      AND rr.data->>'ndcCode' != ''
                    GROUP BY rr.data->>'ndcCode'
                ) AS latest_ndc
            ) AS "uniqueProductsCount",
            rd.created_at AS "createdAt"
        FROM reverse_distributors rd
        WHERE 
            -- Status filter
            (p_status = 'all' OR 
             (p_status = 'active' AND rd.is_active = TRUE) OR
             (p_status = 'inactive' AND rd.is_active = FALSE))
            -- Search filter
            AND (
                v_normalized_search IS NULL 
                OR LOWER(rd.name) LIKE LOWER('%' || v_normalized_search || '%')
                OR LOWER(COALESCE(rd.contact_person, '')) LIKE LOWER('%' || v_normalized_search || '%')
                OR LOWER(COALESCE(rd.contact_email, '')) LIKE LOWER('%' || v_normalized_search || '%')
                OR CAST(rd.id AS TEXT) LIKE LOWER('%' || v_normalized_search || '%')
                OR LOWER(COALESCE(rd.code, '')) LIKE LOWER('%' || v_normalized_search || '%')
            )
        ORDER BY rd.created_at DESC
        LIMIT p_limit
        OFFSET v_offset
    )
    SELECT COALESCE(jsonb_agg(row_to_json(distributor_data)), '[]'::JSONB)
    INTO v_distributors
    FROM distributor_data;
    
    -- Build result with stats included
    v_result := jsonb_build_object(
        'distributors', v_distributors,
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
        'stats', jsonb_build_object(
            'totalDistributors', v_stats_total_distributors,
            'activeDistributors', v_stats_active_distributors,
            'inactiveDistributors', v_stats_total_distributors - v_stats_active_distributors,
            'totalDeals', v_stats_total_deals
        ),
        'generatedAt', NOW()
    );
    
    RETURN v_result;
END;
$function$;
