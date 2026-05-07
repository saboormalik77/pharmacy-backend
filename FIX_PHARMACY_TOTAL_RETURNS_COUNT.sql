-- ============================================================
-- FIX: Update Pharmacy Total Returns Count Logic
-- 
-- Problem: Currently counts only uploaded_documents (return reports)
-- Solution: Count all return_transactions for each pharmacy (created by processors + pharmacy itself)
--
-- This includes:
-- 1. Returns created by processors when visiting pharmacies
-- 2. Returns created by pharmacies themselves (self-service)
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- Update get_admin_pharmacies_list function to count return_transactions
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_admin_pharmacies_list(
    p_search text DEFAULT NULL::text, 
    p_status text DEFAULT 'all'::text, 
    p_page integer DEFAULT 1, 
    p_limit integer DEFAULT 20, 
    p_buying_group_id uuid DEFAULT NULL::uuid
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
    v_result JSONB;
    v_pharmacies JSONB;
    v_total_count INTEGER;
    v_offset INTEGER;
    v_normalized_search TEXT;
BEGIN
    IF p_search IS NOT NULL THEN
        v_normalized_search := TRIM(p_search);
        IF v_normalized_search = '' THEN
            v_normalized_search := NULL;
        END IF;
    ELSE
        v_normalized_search := NULL;
    END IF;

    v_offset := (p_page - 1) * p_limit;

    -- Count total pharmacies (for pagination)
    SELECT COUNT(*)::INTEGER
    INTO v_total_count
    FROM pharmacy p
    WHERE
        (p_status = 'all' OR p.status = p_status)
        AND (p_buying_group_id IS NULL OR p.created_by = p_buying_group_id)
        AND (
            v_normalized_search IS NULL
            OR LOWER(p.pharmacy_name) LIKE LOWER('%' || v_normalized_search || '%')
            OR LOWER(p.name) LIKE LOWER('%' || v_normalized_search || '%')
            OR LOWER(p.email) LIKE LOWER('%' || v_normalized_search || '%')
            OR CAST(p.id AS TEXT) LIKE LOWER('%' || v_normalized_search || '%')
        );

    -- Get pharmacy data with return transactions count
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
            -- UPDATED: Count return_transactions instead of uploaded_documents
            -- This includes both processor-created and pharmacy self-service returns
            (SELECT COUNT(*)::INTEGER FROM return_transactions rt WHERE rt.pharmacy_id = p.id) AS "totalReturns"
        FROM pharmacy p
        WHERE
            (p_status = 'all' OR p.status = p_status)
            AND (p_buying_group_id IS NULL OR p.created_by = p_buying_group_id)
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

    -- Build final result
    SELECT jsonb_build_object(
        'pharmacies', v_pharmacies,
        'pagination', jsonb_build_object(
            'page', p_page,
            'limit', p_limit,
            'total', v_total_count,
            'totalPages', CEIL(v_total_count::NUMERIC / p_limit)::INTEGER
        ),
        'filters', jsonb_build_object(
            'search', p_search,
            'status', p_status
        ),
        'generatedAt', NOW()::TEXT
    )
    INTO v_result;

    RETURN v_result;
END;
$$;

-- ────────────────────────────────────────────────────────────
-- Also update get_admin_pharmacy_by_id function for consistency
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_admin_pharmacy_by_id(
    p_pharmacy_id uuid, 
    p_buying_group_id uuid DEFAULT NULL::uuid
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
    v_pharmacy RECORD;
    v_result JSONB;
BEGIN
    -- Get pharmacy details
    SELECT 
        p.id,
        p.pharmacy_name,
        p.name,
        p.email,
        COALESCE(p.phone, p.contact_phone) AS phone,
        p.fax_number,
        p.physical_address,
        p.billing_address,
        COALESCE(p.status, 'pending') AS status,
        p.state_license_number,
        p.license_expiry_date,
        p.npi_number,
        p.dea_number,
        p.dea_expiration_date,
        p.primary_wholesaler,
        p.wholesaler_account_number,
        p.secondary_wholesaler,
        p.gpo_affiliation,
        p.service_type,
        p.days_between_visits,
        p.last_visit_date,
        p.next_visit_date,
        p.assigned_processor_id,
        p.assigned_sales_person_id,
        p.subscription_tier,
        p.subscription_status,
        p.created_at,
        p.updated_at,
        -- UPDATED: Count return_transactions instead of uploaded_documents
        (SELECT COUNT(*)::INTEGER FROM return_transactions rt WHERE rt.pharmacy_id = p.id) AS total_returns,
        -- Keep the original uploaded documents count as a separate field for reference
        (SELECT COUNT(*)::INTEGER FROM uploaded_documents ud WHERE ud.pharmacy_id = p.id) AS total_uploaded_documents,
        -- Calculate total returns value from return_transactions
        (SELECT COALESCE(SUM(total_returnable_value + total_non_returnable_value), 0) 
         FROM return_transactions rt 
         WHERE rt.pharmacy_id = p.id) AS total_returns_value
    INTO v_pharmacy
    FROM pharmacy p
    WHERE 
        p.id = p_pharmacy_id
        AND (p_buying_group_id IS NULL OR p.created_by = p_buying_group_id);

    -- Check if pharmacy exists
    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'error', true,
            'code', 404,
            'message', 'Pharmacy not found'
        );
    END IF;

    -- Build pharmacy object
    SELECT jsonb_build_object(
        'id', v_pharmacy.id,
        'businessName', v_pharmacy.pharmacy_name,
        'owner', v_pharmacy.name,
        'email', v_pharmacy.email,
        'phone', v_pharmacy.phone,
        'fax', v_pharmacy.fax_number,
        'physicalAddress', v_pharmacy.physical_address,
        'billingAddress', v_pharmacy.billing_address,
        'status', v_pharmacy.status,
        'stateLicenseNumber', v_pharmacy.state_license_number,
        'licenseExpiryDate', v_pharmacy.license_expiry_date,
        'npiNumber', v_pharmacy.npi_number,
        'deaNumber', v_pharmacy.dea_number,
        'deaExpiration', v_pharmacy.dea_expiration_date,
        'wholesaler', v_pharmacy.primary_wholesaler,
        'wholesalerAccount', v_pharmacy.wholesaler_account_number,
        'secondaryWholesaler', v_pharmacy.secondary_wholesaler,
        'gpoAffiliation', v_pharmacy.gpo_affiliation,
        'serviceType', v_pharmacy.service_type,
        'daysBetweenVisits', v_pharmacy.days_between_visits,
        'lastVisitDate', v_pharmacy.last_visit_date,
        'nextVisitDate', v_pharmacy.next_visit_date,
        'assignedProcessorId', v_pharmacy.assigned_processor_id,
        'assignedSalesPersonId', v_pharmacy.assigned_sales_person_id,
        'subscriptionTier', v_pharmacy.subscription_tier,
        'subscriptionStatus', v_pharmacy.subscription_status,
        'totalReturns', v_pharmacy.total_returns,
        'totalUploadedDocuments', v_pharmacy.total_uploaded_documents,
        'totalReturnsValue', v_pharmacy.total_returns_value,
        'createdAt', v_pharmacy.created_at,
        'updatedAt', v_pharmacy.updated_at
    )
    INTO v_result;

    RETURN jsonb_build_object(
        'error', false,
        'pharmacy', v_result,
        'generatedAt', NOW()::TEXT
    );
END;
$$;

-- ────────────────────────────────────────────────────────────
-- Grant permissions
-- ────────────────────────────────────────────────────────────
GRANT EXECUTE ON FUNCTION public.get_admin_pharmacies_list(text, text, integer, integer, uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.get_admin_pharmacies_list(text, text, integer, integer, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_admin_pharmacies_list(text, text, integer, integer, uuid) TO service_role;

GRANT EXECUTE ON FUNCTION public.get_admin_pharmacy_by_id(uuid, uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.get_admin_pharmacy_by_id(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_admin_pharmacy_by_id(uuid, uuid) TO service_role;

-- ────────────────────────────────────────────────────────────
-- Verification and Summary
-- ────────────────────────────────────────────────────────────
SELECT 'Pharmacy total returns count updated successfully' AS status;

-- Summary of changes:
-- 1. get_admin_pharmacies_list now counts return_transactions instead of uploaded_documents
-- 2. get_admin_pharmacy_by_id updated for consistency 
-- 3. This includes both processor-created and pharmacy self-service returns
-- 4. The count reflects the total number of return transactions for each pharmacy