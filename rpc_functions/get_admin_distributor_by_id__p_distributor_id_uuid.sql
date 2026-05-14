-- Function : get_admin_distributor_by_id
-- Arguments: p_distributor_id uuid
-- Type     : FUNCTION
-- =============================================================

DROP FUNCTION IF EXISTS public.get_admin_distributor_by_id(p_distributor_id uuid) CASCADE;

CREATE OR REPLACE FUNCTION public.get_admin_distributor_by_id(p_distributor_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
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
$function$;
