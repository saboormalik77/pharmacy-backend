-- ============================================================
-- COMPLETE FIX: Drop and recreate get_admin_pharmacies_list
-- with buying group scoping, then refresh PostgREST cache
-- ============================================================

-- Step 1: Drop ALL versions of the function (any signature)
DO $$
DECLARE
    func_record RECORD;
BEGIN
    FOR func_record IN
        SELECT p.oid::regprocedure AS func_signature
        FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'public'
          AND p.proname IN (
              'get_admin_pharmacies_list',
              'get_admin_pharmacy_by_id',
              'update_admin_pharmacy',
              'update_admin_pharmacy_status'
          )
    LOOP
        EXECUTE 'DROP FUNCTION IF EXISTS ' || func_record.func_signature || ' CASCADE';
        RAISE NOTICE 'Dropped: %', func_record.func_signature;
    END LOOP;
END $$;

-- Step 2: Create get_admin_pharmacies_list with buying group scope
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
    IF p_search IS NOT NULL THEN
        v_normalized_search := TRIM(p_search);
        IF v_normalized_search = '' THEN
            v_normalized_search := NULL;
        END IF;
    ELSE
        v_normalized_search := NULL;
    END IF;

    v_offset := (p_page - 1) * p_limit;

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
            (SELECT COUNT(*)::INTEGER FROM uploaded_documents ud WHERE ud.pharmacy_id = p.id) AS "totalReturns"
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

-- Step 3: Create get_admin_pharmacy_by_id with buying group scope
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

    v_result := jsonb_build_object(
        'pharmacy', v_pharmacy,
        'generatedAt', NOW()
    );

    RETURN v_result;
END;
$$;

-- Step 4: Create update_admin_pharmacy with buying group scope
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
    v_exists BOOLEAN;
    v_physical_address JSONB;
    v_billing_address JSONB;
BEGIN
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

    SELECT
        COALESCE(physical_address, '{}'::JSONB),
        COALESCE(billing_address, '{}'::JSONB)
    INTO v_physical_address, v_billing_address
    FROM pharmacy
    WHERE id = p_pharmacy_id;

    IF p_updates ? 'physicalAddress' THEN
        v_physical_address := p_updates->'physicalAddress';
    ELSE
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

    IF p_updates ? 'billingAddress' THEN
        v_billing_address := p_updates->'billingAddress';
    END IF;

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
        npi_number = CASE WHEN p_updates ? 'npiNumber' THEN p_updates->>'npiNumber' ELSE npi_number END,
        dea_number = CASE WHEN p_updates ? 'deaNumber' THEN p_updates->>'deaNumber' ELSE dea_number END,
        dea_expiration_date = CASE WHEN p_updates ? 'deaExpiration' THEN (p_updates->>'deaExpiration')::DATE ELSE dea_expiration_date END,
        fax_number = CASE WHEN p_updates ? 'fax' THEN p_updates->>'fax' ELSE fax_number END,
        primary_wholesaler = CASE WHEN p_updates ? 'wholesaler' THEN p_updates->>'wholesaler' ELSE primary_wholesaler END,
        wholesaler_account_number = CASE WHEN p_updates ? 'wholesalerAccount' THEN p_updates->>'wholesalerAccount' ELSE wholesaler_account_number END,
        service_type = CASE WHEN p_updates ? 'serviceType' THEN p_updates->>'serviceType' ELSE service_type END,
        days_between_visits = CASE WHEN p_updates ? 'daysBetweenVisits' THEN (p_updates->>'daysBetweenVisits')::INTEGER ELSE days_between_visits END,
        last_visit_date = CASE WHEN p_updates ? 'lastVisitDate' THEN (p_updates->>'lastVisitDate')::DATE ELSE last_visit_date END,
        next_visit_date = CASE WHEN p_updates ? 'nextVisitDate' THEN (p_updates->>'nextVisitDate')::DATE ELSE next_visit_date END,
        physical_address = v_physical_address,
        billing_address = v_billing_address,
        subscription_tier = CASE WHEN p_updates ? 'subscriptionTier' THEN p_updates->>'subscriptionTier' ELSE subscription_tier END,
        secondary_wholesaler = CASE WHEN p_updates ? 'secondaryWholesaler' THEN p_updates->>'secondaryWholesaler' ELSE secondary_wholesaler END,
        subscription_status = CASE WHEN p_updates ? 'subscriptionStatus' THEN p_updates->>'subscriptionStatus' ELSE subscription_status END,
        updated_at = NOW()
    WHERE id = p_pharmacy_id;

    RETURN get_admin_pharmacy_by_id(p_pharmacy_id, p_buying_group_id);
END;
$$;

-- Step 5: Create update_admin_pharmacy_status with buying group scope
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
    IF p_new_status NOT IN ('pending', 'active', 'suspended', 'blacklisted') THEN
        RETURN jsonb_build_object(
            'error', true,
            'message', 'Invalid status. Must be one of: pending, active, suspended, blacklisted',
            'code', 400
        );
    END IF;

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

    SELECT status INTO v_old_status FROM pharmacy WHERE id = p_pharmacy_id;

    UPDATE pharmacy
    SET status = p_new_status, updated_at = NOW()
    WHERE id = p_pharmacy_id;

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

-- Step 6: Grants
GRANT EXECUTE ON FUNCTION get_admin_pharmacies_list(TEXT, TEXT, INTEGER, INTEGER, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_admin_pharmacies_list(TEXT, TEXT, INTEGER, INTEGER, UUID) TO service_role;
GRANT EXECUTE ON FUNCTION get_admin_pharmacy_by_id(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_admin_pharmacy_by_id(UUID, UUID) TO service_role;
GRANT EXECUTE ON FUNCTION update_admin_pharmacy(UUID, JSONB, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION update_admin_pharmacy(UUID, JSONB, UUID) TO service_role;
GRANT EXECUTE ON FUNCTION update_admin_pharmacy_status(UUID, TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION update_admin_pharmacy_status(UUID, TEXT, UUID) TO service_role;

-- Step 7: CRITICAL — tell PostgREST to reload its schema cache
NOTIFY pgrst, 'reload schema';

-- Step 8: Verify the new functions are in place
SELECT
    p.proname AS function_name,
    pg_get_function_identity_arguments(p.oid) AS arguments
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname IN (
      'get_admin_pharmacies_list',
      'get_admin_pharmacy_by_id',
      'update_admin_pharmacy',
      'update_admin_pharmacy_status'
  )
ORDER BY p.proname;