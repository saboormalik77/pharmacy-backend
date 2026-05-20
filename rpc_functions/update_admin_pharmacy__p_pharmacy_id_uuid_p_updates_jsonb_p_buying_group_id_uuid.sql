-- Function : update_admin_pharmacy
-- Arguments: p_pharmacy_id uuid, p_updates jsonb, p_buying_group_id uuid
-- Type     : FUNCTION
-- =============================================================

DROP FUNCTION IF EXISTS public.update_admin_pharmacy(p_pharmacy_id uuid, p_updates jsonb, p_buying_group_id uuid) CASCADE;

CREATE OR REPLACE FUNCTION public.update_admin_pharmacy(p_pharmacy_id uuid, p_updates jsonb, p_buying_group_id uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
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
$function$;
