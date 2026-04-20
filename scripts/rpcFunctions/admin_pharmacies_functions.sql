-- ============================================================
-- Admin Pharmacies Management RPC Functions
-- Used by: /api/admin/pharmacies endpoints
-- ============================================================
-- Functions:
-- 1. get_admin_pharmacies_list - List pharmacies with search/filter/pagination
-- 2. get_admin_pharmacy_by_id - Get single pharmacy details
-- 3. update_admin_pharmacy - Update pharmacy details
-- 4. update_admin_pharmacy_status - Update pharmacy status (blacklist/restore)
-- ============================================================

-- ============================================================
-- PREREQUISITE: Add missing columns if they don't exist
-- ============================================================

-- Add status column if not exists
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'pharmacy' AND column_name = 'status') THEN
        ALTER TABLE pharmacy ADD COLUMN status VARCHAR(20) DEFAULT 'active';
    END IF;
END $$;

-- Add physical_address column if not exists
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'pharmacy' AND column_name = 'physical_address') THEN
        ALTER TABLE pharmacy ADD COLUMN physical_address JSONB;
    END IF;
END $$;

-- Add billing_address column if not exists
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'pharmacy' AND column_name = 'billing_address') THEN
        ALTER TABLE pharmacy ADD COLUMN billing_address JSONB;
    END IF;
END $$;

-- Add contact_phone column if not exists
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'pharmacy' AND column_name = 'contact_phone') THEN
        ALTER TABLE pharmacy ADD COLUMN contact_phone VARCHAR(20);
    END IF;
END $$;

-- Add subscription columns if not exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'pharmacy' AND column_name = 'subscription_tier') THEN
        ALTER TABLE pharmacy ADD COLUMN subscription_tier VARCHAR(20) DEFAULT 'free';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'pharmacy' AND column_name = 'subscription_status') THEN
        ALTER TABLE pharmacy ADD COLUMN subscription_status VARCHAR(20) DEFAULT 'trial';
    END IF;
END $$;

-- Add license columns if not exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'pharmacy' AND column_name = 'state_license_number') THEN
        ALTER TABLE pharmacy ADD COLUMN state_license_number VARCHAR(100);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'pharmacy' AND column_name = 'license_expiry_date') THEN
        ALTER TABLE pharmacy ADD COLUMN license_expiry_date DATE;
    END IF;
END $$;

-- Update status constraint to include 'blacklisted'
DO $$ 
BEGIN
    -- Check if constraint exists and drop it
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'pharmacy_status_check' 
        AND table_name = 'pharmacy'
    ) THEN
        ALTER TABLE pharmacy DROP CONSTRAINT pharmacy_status_check;
    END IF;
    
    -- Add new constraint with blacklisted status
    ALTER TABLE pharmacy ADD CONSTRAINT pharmacy_status_check 
    CHECK (status IN ('pending', 'active', 'suspended', 'blacklisted'));
EXCEPTION
    WHEN OTHERS THEN
        -- Constraint might not exist or already updated
        NULL;
END $$;

-- ============================================================
-- FUNCTION 1: get_admin_pharmacies_list
-- ============================================================
-- Lists all pharmacies with search, filter, pagination
-- Returns: pharmacies array and total count
-- ============================================================

DROP FUNCTION IF EXISTS get_admin_pharmacies_list(TEXT, TEXT, INTEGER, INTEGER);
DROP FUNCTION IF EXISTS get_admin_pharmacies_list(TEXT, TEXT, INTEGER, INTEGER, UUID);

CREATE OR REPLACE FUNCTION get_admin_pharmacies_list(
    p_search TEXT DEFAULT NULL,
    p_status TEXT DEFAULT 'all',
    p_page INTEGER DEFAULT 1,
    p_limit INTEGER DEFAULT 20,
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
            -- Count total returns (documents) for this pharmacy
            (SELECT COUNT(*)::INTEGER FROM uploaded_documents ud WHERE ud.pharmacy_id = p.id) AS "totalReturns"
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

-- ============================================================
-- FUNCTION 2: get_admin_pharmacy_by_id
-- ============================================================
-- Get single pharmacy details by ID
-- ============================================================

DROP FUNCTION IF EXISTS get_admin_pharmacy_by_id(UUID);
DROP FUNCTION IF EXISTS get_admin_pharmacy_by_id(UUID, UUID);

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
        'totalReturns', (SELECT COUNT(*)::INTEGER FROM uploaded_documents ud WHERE ud.pharmacy_id = p.id),
        'totalReturnsValue', (SELECT COALESCE(SUM(total_credit_amount), 0)::NUMERIC FROM uploaded_documents ud WHERE ud.pharmacy_id = p.id AND total_credit_amount IS NOT NULL),
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

-- ============================================================
-- FUNCTION 3: update_admin_pharmacy
-- ============================================================
-- Update pharmacy details (for admin edit functionality)
-- ============================================================

DROP FUNCTION IF EXISTS update_admin_pharmacy(UUID, JSONB);
DROP FUNCTION IF EXISTS update_admin_pharmacy(UUID, JSONB, UUID);

CREATE OR REPLACE FUNCTION update_admin_pharmacy(
    p_pharmacy_id UUID,
    p_updates JSONB,
    p_buying_group_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_result JSONB;
    v_exists BOOLEAN;
    v_physical_address JSONB;
    v_billing_address JSONB;
BEGIN
    -- Check if pharmacy exists AND belongs to the caller's buying group.
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
    
    -- Get current addresses
    SELECT 
        COALESCE(physical_address, '{}'::JSONB),
        COALESCE(billing_address, '{}'::JSONB)
    INTO v_physical_address, v_billing_address
    FROM pharmacy
    WHERE id = p_pharmacy_id;
    
    -- Handle physicalAddress object (direct JSONB update)
    IF p_updates ? 'physicalAddress' THEN
        v_physical_address := p_updates->'physicalAddress';
    ELSE
        -- Build updated physical_address from individual fields (backward compatibility)
        IF p_updates ? 'address' THEN
            v_physical_address := v_physical_address || jsonb_build_object('street', p_updates->>'address');
        END IF;
        IF p_updates ? 'city' THEN
            v_physical_address := v_physical_address || jsonb_build_object('city', p_updates->>'city');
        END IF;
        IF p_updates ? 'state' THEN
            v_physical_address := v_physical_address || jsonb_build_object('state', p_updates->>'state');
        END IF;
        IF p_updates ? 'zipCode' THEN
            v_physical_address := v_physical_address || jsonb_build_object('zip', p_updates->>'zipCode');
        END IF;
    END IF;
    
    -- Handle billingAddress object (direct JSONB update)
    IF p_updates ? 'billingAddress' THEN
        v_billing_address := p_updates->'billingAddress';
    END IF;
    
    -- Update pharmacy record
    UPDATE pharmacy
    SET
        pharmacy_name = COALESCE(p_updates->>'businessName', pharmacy_name),
        name = COALESCE(p_updates->>'owner', name),
        email = COALESCE(p_updates->>'email', email),
        phone = COALESCE(p_updates->>'phone', phone),
        state_license_number = CASE 
            WHEN p_updates ? 'licenseNumber' THEN p_updates->>'licenseNumber'
            WHEN p_updates ? 'stateLicenseNumber' THEN p_updates->>'stateLicenseNumber'
            ELSE state_license_number
        END,
        license_expiry_date = CASE 
            WHEN p_updates ? 'licenseExpiryDate' THEN (p_updates->>'licenseExpiryDate')::DATE
            ELSE license_expiry_date
        END,
        npi_number = CASE 
            WHEN p_updates ? 'npiNumber' THEN p_updates->>'npiNumber'
            ELSE npi_number
        END,
        dea_number = CASE 
            WHEN p_updates ? 'deaNumber' THEN p_updates->>'deaNumber'
            ELSE dea_number
        END,
        dea_expiration_date = CASE 
            WHEN p_updates ? 'deaExpiration' THEN (p_updates->>'deaExpiration')::DATE
            ELSE dea_expiration_date
        END,
        fax_number = CASE 
            WHEN p_updates ? 'fax' THEN p_updates->>'fax'
            ELSE fax_number
        END,
        primary_wholesaler = CASE 
            WHEN p_updates ? 'wholesaler' THEN p_updates->>'wholesaler'
            ELSE primary_wholesaler
        END,
        wholesaler_account_number = CASE 
            WHEN p_updates ? 'wholesalerAccount' THEN p_updates->>'wholesalerAccount'
            ELSE wholesaler_account_number
        END,
        service_type = CASE 
            WHEN p_updates ? 'serviceType' THEN p_updates->>'serviceType'
            ELSE service_type
        END,
        days_between_visits = CASE 
            WHEN p_updates ? 'daysBetweenVisits' THEN (p_updates->>'daysBetweenVisits')::INTEGER
            ELSE days_between_visits
        END,
        last_visit_date = CASE 
            WHEN p_updates ? 'lastVisitDate' THEN (p_updates->>'lastVisitDate')::DATE
            ELSE last_visit_date
        END,
        next_visit_date = CASE 
            WHEN p_updates ? 'nextVisitDate' THEN (p_updates->>'nextVisitDate')::DATE
            ELSE next_visit_date
        END,
        physical_address = v_physical_address,
        billing_address = v_billing_address,
        subscription_tier = CASE 
            WHEN p_updates ? 'subscriptionTier' THEN p_updates->>'subscriptionTier'
            ELSE subscription_tier
        END,
        secondary_wholesaler = CASE
            WHEN p_updates ? 'secondaryWholesaler' THEN p_updates->>'secondaryWholesaler'
            ELSE secondary_wholesaler
        END,
        subscription_status = CASE 
            WHEN p_updates ? 'subscriptionStatus' THEN p_updates->>'subscriptionStatus'
            ELSE subscription_status
        END,
        updated_at = NOW()
    WHERE id = p_pharmacy_id;
    
    -- Return updated pharmacy (scoped to the same buying group).
    RETURN get_admin_pharmacy_by_id(p_pharmacy_id, p_buying_group_id);
END;
$$;

-- ============================================================
-- FUNCTION 4: update_admin_pharmacy_status
-- ============================================================
-- Update pharmacy status (blacklist/restore/suspend)
-- ============================================================

DROP FUNCTION IF EXISTS update_admin_pharmacy_status(UUID, TEXT);
DROP FUNCTION IF EXISTS update_admin_pharmacy_status(UUID, TEXT, UUID);

CREATE OR REPLACE FUNCTION update_admin_pharmacy_status(
    p_pharmacy_id UUID,
    p_new_status TEXT,
    p_buying_group_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_result JSONB;
    v_exists BOOLEAN;
    v_old_status TEXT;
BEGIN
    -- Validate status value
    IF p_new_status NOT IN ('pending', 'active', 'suspended', 'blacklisted') THEN
        RETURN jsonb_build_object(
            'error', true,
            'message', 'Invalid status. Must be one of: pending, active, suspended, blacklisted',
            'code', 400
        );
    END IF;
    
    -- Check if pharmacy exists AND belongs to the caller's buying group.
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
    
    -- Get old status for logging
    SELECT status INTO v_old_status FROM pharmacy WHERE id = p_pharmacy_id;
    
    -- Update status
    UPDATE pharmacy
    SET
        status = p_new_status,
        updated_at = NOW()
    WHERE id = p_pharmacy_id;
    
    -- Return success with updated pharmacy (scoped to the same buying group).
    v_result := get_admin_pharmacy_by_id(p_pharmacy_id, p_buying_group_id);
    v_result := v_result || jsonb_build_object(
        'statusChange', jsonb_build_object(
            'from', v_old_status,
            'to', p_new_status
        )
    );
    
    RETURN v_result;
END;
$$;

-- ============================================================
-- Grant Permissions
-- ============================================================

GRANT EXECUTE ON FUNCTION get_admin_pharmacies_list(TEXT, TEXT, INTEGER, INTEGER, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_admin_pharmacies_list(TEXT, TEXT, INTEGER, INTEGER, UUID) TO service_role;

GRANT EXECUTE ON FUNCTION get_admin_pharmacy_by_id(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_admin_pharmacy_by_id(UUID, UUID) TO service_role;

GRANT EXECUTE ON FUNCTION update_admin_pharmacy(UUID, JSONB, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION update_admin_pharmacy(UUID, JSONB, UUID) TO service_role;

GRANT EXECUTE ON FUNCTION update_admin_pharmacy_status(UUID, TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION update_admin_pharmacy_status(UUID, TEXT, UUID) TO service_role;

-- ============================================================
-- Example Usage:
-- ============================================================
-- List all pharmacies:
-- SELECT get_admin_pharmacies_list();
--
-- Search pharmacies:
-- SELECT get_admin_pharmacies_list('health', 'all', 1, 20);
--
-- Filter by status:
-- SELECT get_admin_pharmacies_list(NULL, 'active', 1, 20);
--
-- Get single pharmacy:
-- SELECT get_admin_pharmacy_by_id('pharmacy-uuid-here'::UUID);
--
-- Update pharmacy:
-- SELECT update_admin_pharmacy(
--     'pharmacy-uuid-here'::UUID,
--     '{"businessName": "New Name", "owner": "John Doe", "city": "New York"}'::JSONB
-- );
--
-- Blacklist pharmacy:
-- SELECT update_admin_pharmacy_status('pharmacy-uuid-here'::UUID, 'blacklisted');
--
-- Restore pharmacy:
-- SELECT update_admin_pharmacy_status('pharmacy-uuid-here'::UUID, 'active');

