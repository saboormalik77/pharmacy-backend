-- Function : get_admin_pharmacy_by_id
-- Arguments: p_pharmacy_id uuid, p_buying_group_id uuid
-- Type     : FUNCTION
-- =============================================================

DROP FUNCTION IF EXISTS public.get_admin_pharmacy_by_id(p_pharmacy_id uuid, p_buying_group_id uuid) CASCADE;

CREATE OR REPLACE FUNCTION public.get_admin_pharmacy_by_id(p_pharmacy_id uuid, p_buying_group_id uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
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
$function$;
