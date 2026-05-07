-- ============================================================
-- Admin Distributors RPC Functions
-- For managing reverse distributors in the admin panel
-- ============================================================

-- ============================================================
-- 1. Add missing columns if they don't exist
-- ============================================================

-- Add contact_person column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'reverse_distributors' AND column_name = 'contact_person'
    ) THEN
        ALTER TABLE reverse_distributors ADD COLUMN contact_person TEXT;
    END IF;
END $$;

-- Add license_number column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'reverse_distributors' AND column_name = 'license_number'
    ) THEN
        ALTER TABLE reverse_distributors ADD COLUMN license_number TEXT;
    END IF;
END $$;

-- Add specializations column if it doesn't exist (will use this instead of supported_formats for frontend)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'reverse_distributors' AND column_name = 'specializations'
    ) THEN
        ALTER TABLE reverse_distributors ADD COLUMN specializations TEXT[] DEFAULT ARRAY[]::TEXT[];
    END IF;
END $$;

-- ============================================================
-- 2. GET ADMIN DISTRIBUTORS LIST (with stats included)
-- Returns paginated list with search and filter AND stats
-- Stats are merged into the response
-- ============================================================

DROP FUNCTION IF EXISTS get_admin_distributors_list(TEXT, TEXT, INTEGER, INTEGER);

CREATE OR REPLACE FUNCTION get_admin_distributors_list(
    p_search TEXT DEFAULT NULL,
    p_status TEXT DEFAULT 'all',
    p_page INTEGER DEFAULT 1,
    p_limit INTEGER DEFAULT 20
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
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
$$;

GRANT EXECUTE ON FUNCTION get_admin_distributors_list(TEXT, TEXT, INTEGER, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_admin_distributors_list(TEXT, TEXT, INTEGER, INTEGER) TO service_role;

-- ============================================================
-- 3. GET ADMIN DISTRIBUTOR BY ID
-- Returns single distributor with all details
-- ============================================================

DROP FUNCTION IF EXISTS get_admin_distributor_by_id(UUID);

CREATE OR REPLACE FUNCTION get_admin_distributor_by_id(p_distributor_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_result JSONB;
    v_distributor JSONB;
    v_total_deals INTEGER;
    v_unique_products_count INTEGER;
BEGIN
    -- Check if distributor exists
    IF NOT EXISTS (SELECT 1 FROM reverse_distributors WHERE id = p_distributor_id) THEN
        RAISE EXCEPTION 'Distributor not found';
    END IF;
    
    -- Get total deals for this distributor
    SELECT COUNT(*)::INTEGER INTO v_total_deals
    FROM custom_packages
    WHERE distributor_id = p_distributor_id;
    
    -- Get unique products count (unique NDCs, latest report_date per NDC)
    SELECT COUNT(DISTINCT latest_ndc.ndc)::INTEGER INTO v_unique_products_count
    FROM (
        SELECT 
            rr.data->>'ndcCode' AS ndc,
            MAX(ud.report_date) AS latest_report_date
        FROM uploaded_documents ud
        INNER JOIN return_reports rr ON rr.document_id = ud.id
        WHERE ud.reverse_distributor_id = p_distributor_id
          AND rr.data->>'ndcCode' IS NOT NULL
          AND rr.data->>'ndcCode' != ''
        GROUP BY rr.data->>'ndcCode'
    ) AS latest_ndc;
    
    -- Get distributor details
    SELECT jsonb_build_object(
        'id', rd.id,
        'companyName', rd.name,
        'contactPerson', COALESCE(rd.contact_person, ''),
        'email', COALESCE(rd.contact_email, ''),
        'phone', COALESCE(rd.contact_phone, ''),
        'address', COALESCE(rd.address->>'street', ''),
        'city', COALESCE(rd.address->>'city', ''),
        'state', COALESCE(rd.address->>'state', ''),
        'zipCode', COALESCE(rd.address->>'zipCode', ''),
        'status', CASE WHEN rd.is_active THEN 'active' ELSE 'inactive' END,
        'licenseNumber', COALESCE(rd.license_number, ''),
        'specializations', COALESCE(rd.specializations, ARRAY[]::TEXT[]),
        'totalDeals', v_total_deals,
        'uniqueProductsCount', COALESCE(v_unique_products_count, 0),
        'code', COALESCE(rd.code, ''),
        'portalUrl', COALESCE(rd.portal_url, ''),
        'supportedFormats', COALESCE(rd.supported_formats, ARRAY[]::TEXT[]),
        'feeRates', COALESCE(rd.fee_rates, '{}'::JSONB),
        'createdAt', rd.created_at
    )
    INTO v_distributor
    FROM reverse_distributors rd
    WHERE rd.id = p_distributor_id;
    
    -- Build result
    v_result := jsonb_build_object(
        'distributor', v_distributor,
        'generatedAt', NOW()
    );
    
    RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION get_admin_distributor_by_id(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_admin_distributor_by_id(UUID) TO service_role;

-- ============================================================
-- 4. CREATE ADMIN DISTRIBUTOR
-- Creates a new reverse distributor
-- ============================================================

DROP FUNCTION IF EXISTS create_admin_distributor(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT[]);

CREATE OR REPLACE FUNCTION create_admin_distributor(
    p_company_name TEXT,
    p_contact_person TEXT DEFAULT NULL,
    p_email TEXT DEFAULT NULL,
    p_phone TEXT DEFAULT NULL,
    p_address TEXT DEFAULT NULL,
    p_city TEXT DEFAULT NULL,
    p_state TEXT DEFAULT NULL,
    p_zip_code TEXT DEFAULT NULL,
    p_license_number TEXT DEFAULT NULL,
    p_specializations TEXT[] DEFAULT ARRAY[]::TEXT[]
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
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
$$;

GRANT EXECUTE ON FUNCTION create_admin_distributor(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT[]) TO authenticated;
GRANT EXECUTE ON FUNCTION create_admin_distributor(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT[]) TO service_role;

-- ============================================================
-- 5. UPDATE ADMIN DISTRIBUTOR
-- Updates an existing distributor
-- ============================================================

DROP FUNCTION IF EXISTS update_admin_distributor(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT[]);

CREATE OR REPLACE FUNCTION update_admin_distributor(
    p_distributor_id UUID,
    p_company_name TEXT DEFAULT NULL,
    p_contact_person TEXT DEFAULT NULL,
    p_email TEXT DEFAULT NULL,
    p_phone TEXT DEFAULT NULL,
    p_address TEXT DEFAULT NULL,
    p_city TEXT DEFAULT NULL,
    p_state TEXT DEFAULT NULL,
    p_zip_code TEXT DEFAULT NULL,
    p_license_number TEXT DEFAULT NULL,
    p_specializations TEXT[] DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
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
$$;

GRANT EXECUTE ON FUNCTION update_admin_distributor(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT[]) TO authenticated;
GRANT EXECUTE ON FUNCTION update_admin_distributor(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT[]) TO service_role;

-- ============================================================
-- 6. UPDATE ADMIN DISTRIBUTOR STATUS
-- Activates or deactivates a distributor
-- ============================================================

DROP FUNCTION IF EXISTS update_admin_distributor_status(UUID, TEXT);

CREATE OR REPLACE FUNCTION update_admin_distributor_status(
    p_distributor_id UUID,
    p_status TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_result JSONB;
    v_is_active BOOLEAN;
BEGIN
    -- Check if distributor exists
    IF NOT EXISTS (SELECT 1 FROM reverse_distributors WHERE id = p_distributor_id) THEN
        RAISE EXCEPTION 'Distributor not found';
    END IF;
    
    -- Validate status
    IF p_status NOT IN ('active', 'inactive') THEN
        RAISE EXCEPTION 'Invalid status. Must be "active" or "inactive"';
    END IF;
    
    -- Convert status to boolean
    v_is_active := (p_status = 'active');
    
    -- Update distributor status
    UPDATE reverse_distributors
    SET is_active = v_is_active
    WHERE id = p_distributor_id;
    
    -- Get the updated distributor
    v_result := get_admin_distributor_by_id(p_distributor_id);
    
    RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION update_admin_distributor_status(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION update_admin_distributor_status(UUID, TEXT) TO service_role;

-- ============================================================
-- 7. DELETE ADMIN DISTRIBUTOR
-- Deletes a distributor (soft delete optional - for now hard delete)
-- ============================================================

DROP FUNCTION IF EXISTS delete_admin_distributor(UUID);

CREATE OR REPLACE FUNCTION delete_admin_distributor(p_distributor_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_result JSONB;
    v_distributor_name TEXT;
    v_deals_count INTEGER;
BEGIN
    -- Check if distributor exists
    IF NOT EXISTS (SELECT 1 FROM reverse_distributors WHERE id = p_distributor_id) THEN
        RAISE EXCEPTION 'Distributor not found';
    END IF;
    
    -- Get distributor name for response
    SELECT name INTO v_distributor_name
    FROM reverse_distributors
    WHERE id = p_distributor_id;
    
    -- Check for existing deals (packages)
    SELECT COUNT(*)::INTEGER INTO v_deals_count
    FROM custom_packages
    WHERE distributor_id = p_distributor_id;
    
    -- Prevent deletion if there are existing deals
    IF v_deals_count > 0 THEN
        RAISE EXCEPTION 'Cannot delete distributor with % existing deal(s). Deactivate instead.', v_deals_count;
    END IF;
    
    -- Delete the distributor
    DELETE FROM reverse_distributors
    WHERE id = p_distributor_id;
    
    -- Build result
    v_result := jsonb_build_object(
        'success', TRUE,
        'message', 'Distributor "' || v_distributor_name || '" deleted successfully',
        'deletedId', p_distributor_id,
        'deletedAt', NOW()
    );
    
    RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION delete_admin_distributor(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION delete_admin_distributor(UUID) TO service_role;

-- ============================================================
-- 8. GET DISTRIBUTOR UNIQUE PRODUCTS
-- Returns unique products (by NDC) for a distributor
-- Only the latest record per NDC based on report_date
-- ============================================================

DROP FUNCTION IF EXISTS get_distributor_unique_products(UUID, INTEGER, INTEGER);

CREATE OR REPLACE FUNCTION get_distributor_unique_products(
    p_distributor_id UUID,
    p_page INTEGER DEFAULT 1,
    p_limit INTEGER DEFAULT 50
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_result JSONB;
    v_products JSONB;
    v_total_count INTEGER;
    v_offset INTEGER;
    v_distributor_name TEXT;
BEGIN
    -- Check if distributor exists
    IF NOT EXISTS (SELECT 1 FROM reverse_distributors WHERE id = p_distributor_id) THEN
        RAISE EXCEPTION 'Distributor not found';
    END IF;
    
    -- Get distributor name
    SELECT name INTO v_distributor_name
    FROM reverse_distributors
    WHERE id = p_distributor_id;
    
    -- Calculate offset
    v_offset := (p_page - 1) * p_limit;
    
    -- Get total count of unique NDCs
    SELECT COUNT(*)::INTEGER INTO v_total_count
    FROM (
        SELECT DISTINCT rr.data->>'ndcCode' AS ndc
        FROM uploaded_documents ud
        INNER JOIN return_reports rr ON rr.document_id = ud.id
        WHERE ud.reverse_distributor_id = p_distributor_id
          AND rr.data->>'ndcCode' IS NOT NULL
          AND rr.data->>'ndcCode' != ''
    ) AS unique_ndcs;
    
    -- Get unique products with latest report_date per NDC
    WITH latest_reports AS (
        -- Find the latest report_date for each NDC
        SELECT 
            rr.data->>'ndcCode' AS ndc,
            MAX(ud.report_date) AS latest_report_date
        FROM uploaded_documents ud
        INNER JOIN return_reports rr ON rr.document_id = ud.id
        WHERE ud.reverse_distributor_id = p_distributor_id
          AND rr.data->>'ndcCode' IS NOT NULL
          AND rr.data->>'ndcCode' != ''
        GROUP BY rr.data->>'ndcCode'
    ),
    latest_products AS (
        -- Get the full product details for the latest report per NDC
        SELECT DISTINCT ON (rr.data->>'ndcCode')
            rr.id AS "reportId",
            rr.data->>'ndcCode' AS "ndcCode",
            rr.data->>'itemName' AS "productName",
            rr.data->>'manufacturer' AS manufacturer,
            COALESCE((rr.data->>'creditAmount')::NUMERIC, 0) AS "creditAmount",
            -- Calculate pricePerUnit: use from data if exists, otherwise creditAmount / quantity
            COALESCE(
                (rr.data->>'pricePerUnit')::NUMERIC,
                CASE 
                    WHEN COALESCE((rr.data->>'quantity')::INTEGER, 1) > 0 
                    THEN COALESCE((rr.data->>'creditAmount')::NUMERIC, 0) / GREATEST(COALESCE((rr.data->>'quantity')::INTEGER, 1), 1)
                    ELSE 0 
                END
            ) AS "pricePerUnit",
            -- Calculate quantity: use from data if exists, otherwise full + partial
            COALESCE(
                (rr.data->>'quantity')::INTEGER,
                COALESCE((rr.data->>'full')::INTEGER, 0) + COALESCE((rr.data->>'partial')::INTEGER, 0)
            ) AS quantity,
            COALESCE((rr.data->>'full')::INTEGER, 0) AS "fullUnits",
            COALESCE((rr.data->>'partial')::INTEGER, 0) AS "partialUnits",
            rr.data->>'lotNumber' AS "lotNumber",
            rr.data->>'expirationDate' AS "expirationDate",
            rr.data->>'pkgSz' AS "packageSize",
            ud.report_date AS "reportDate",
            ud.file_name AS "fileName",
            rr.pharmacy_id AS "pharmacyId"
        FROM uploaded_documents ud
        INNER JOIN return_reports rr ON rr.document_id = ud.id
        INNER JOIN latest_reports lr ON lr.ndc = rr.data->>'ndcCode' AND lr.latest_report_date = ud.report_date
        WHERE ud.reverse_distributor_id = p_distributor_id
        ORDER BY rr.data->>'ndcCode', ud.report_date DESC, rr.id
    )
    SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
            'reportId', lp."reportId",
            'ndcCode', lp."ndcCode",
            'productName', lp."productName",
            'manufacturer', lp.manufacturer,
            'creditAmount', ROUND(lp."creditAmount", 2),
            'pricePerUnit', ROUND(lp."pricePerUnit", 2),
            'quantity', lp.quantity,
            'fullUnits', lp."fullUnits",
            'partialUnits', lp."partialUnits",
            'lotNumber', lp."lotNumber",
            'expirationDate', lp."expirationDate",
            'packageSize', lp."packageSize",
            'reportDate', lp."reportDate",
            'fileName', lp."fileName",
            'pharmacyId', lp."pharmacyId"
        )
        ORDER BY lp."reportDate" DESC, lp."productName"
    ), '[]'::JSONB)
    INTO v_products
    FROM (
        SELECT * FROM latest_products
        ORDER BY "reportDate" DESC, "productName"
        LIMIT p_limit
        OFFSET v_offset
    ) lp;
    
    -- Build result
    v_result := jsonb_build_object(
        'distributor', jsonb_build_object(
            'id', p_distributor_id,
            'name', v_distributor_name
        ),
        'products', v_products,
        'pagination', jsonb_build_object(
            'page', p_page,
            'limit', p_limit,
            'total', v_total_count,
            'totalPages', CEIL(v_total_count::NUMERIC / p_limit::NUMERIC)::INTEGER
        ),
        'generatedAt', NOW()
    );
    
    RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION get_distributor_unique_products(UUID, INTEGER, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_distributor_unique_products(UUID, INTEGER, INTEGER) TO service_role;
