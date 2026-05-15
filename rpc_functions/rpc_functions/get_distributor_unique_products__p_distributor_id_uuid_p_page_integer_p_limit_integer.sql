-- Function : get_distributor_unique_products
-- Arguments: p_distributor_id uuid, p_page integer, p_limit integer
-- Type     : FUNCTION
-- =============================================================

DROP FUNCTION IF EXISTS public.get_distributor_unique_products(p_distributor_id uuid, p_page integer, p_limit integer) CASCADE;

CREATE OR REPLACE FUNCTION public.get_distributor_unique_products(p_distributor_id uuid, p_page integer DEFAULT 1, p_limit integer DEFAULT 50)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
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
$function$;
