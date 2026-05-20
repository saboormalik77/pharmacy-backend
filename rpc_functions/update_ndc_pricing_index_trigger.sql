-- Function : update_ndc_pricing_index_trigger
-- Arguments: none
-- Type     : FUNCTION
-- =============================================================

DROP FUNCTION IF EXISTS public.update_ndc_pricing_index_trigger() CASCADE;

CREATE OR REPLACE FUNCTION public.update_ndc_pricing_index_trigger()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
  v_ndc_original TEXT;
  v_ndc_normalized TEXT;
  v_product_name TEXT;
  v_credit_amount DECIMAL;
  v_quantity INTEGER;
  v_price_per_unit DECIMAL;
  v_full_count INTEGER;
  v_partial_count INTEGER;
  v_is_full_record BOOLEAN;     -- TRUE if (full > 0 AND partial = 0)
  v_is_partial_record BOOLEAN;  -- TRUE if (partial > 0 AND full = 0)
  v_distributor_id UUID;
  v_distributor_name TEXT;
  v_distributor_email TEXT;
  v_distributor_phone TEXT;
  v_distributor_location TEXT;
  v_report_date DATE;
  v_uploaded_at TIMESTAMP WITH TIME ZONE;      -- uploaded_documents.uploaded_at
  v_source_created_at TIMESTAMP WITH TIME ZONE; -- return_reports.created_at (ORIGINAL - for fallback)
BEGIN
  -- Extract NDC (same as optimization service: item.ndcCode || item.ndc)
  v_ndc_original := COALESCE(
    NEW.data->>'ndcCode', 
    NEW.data->>'ndc'
  );
  
  -- Skip if no NDC
  IF v_ndc_original IS NULL OR TRIM(v_ndc_original) = '' THEN
    RETURN NEW;
  END IF;
  
  -- Normalize NDC
  v_ndc_normalized := LOWER(REPLACE(TRIM(v_ndc_original), '-', ''));
  
  -- Extract product name (same priority as optimization service)
  -- itemName > productName > product_name > product > description > drugName > name
  v_product_name := COALESCE(
    NULLIF(TRIM(NEW.data->>'itemName'), ''),
    NULLIF(TRIM(NEW.data->>'productName'), ''),
    NULLIF(TRIM(NEW.data->>'product_name'), ''),
    NULLIF(TRIM(NEW.data->>'product'), ''),
    NULLIF(TRIM(NEW.data->>'description'), ''),
    NULLIF(TRIM(NEW.data->>'drugName'), ''),
    NULLIF(TRIM(NEW.data->>'name'), '')
  );
  
  -- Extract quantity and creditAmount (same as optimization service)
  v_quantity := COALESCE((NEW.data->>'quantity')::INTEGER, 1);
  v_credit_amount := COALESCE((NEW.data->>'creditAmount')::DECIMAL, 0);
  
  -- Calculate price per unit (same formula as optimization service)
  -- pricePerUnit = item.pricePerUnit || (creditAmount / quantity)
  v_price_per_unit := COALESCE(
    (NEW.data->>'pricePerUnit')::DECIMAL,
    CASE WHEN v_quantity > 0 AND v_credit_amount > 0 
         THEN v_credit_amount / v_quantity 
         ELSE 0 
    END
  );
  
  -- Extract full and partial counts (same as optimization service)
  v_full_count := COALESCE((NEW.data->>'full')::INTEGER, 0);
  v_partial_count := COALESCE((NEW.data->>'partial')::INTEGER, 0);
  
  -- CRITICAL: Calculate boolean flags (same logic as optimization API lines 750-751)
  -- is_full_record = (full > 0 && partial === 0)
  -- is_partial_record = (partial > 0 && full === 0)
  v_is_full_record := (v_full_count > 0 AND v_partial_count = 0);
  v_is_partial_record := (v_partial_count > 0 AND v_full_count = 0);
  
  -- Store original return_reports.created_at for fallback ordering
  -- This matches optimization API line 343: a.created_at (return_reports.created_at)
  v_source_created_at := NEW.created_at;
  
  -- Skip if no valid price
  IF v_price_per_unit <= 0 THEN
    RETURN NEW;
  END IF;
  
  -- Get distributor info (including uploaded_at for fallback ordering)
  -- CRITICAL: Use same fallback chain for distributor name as optimization API (lines 455-458):
  --   1. reverse_distributors.name
  --   2. return_reports.data->>'reverseDistributor'
  --   3. return_reports.data->'reverseDistributorInfo'->>'name'
  --   4. 'Unknown Distributor'
  SELECT 
    ud.reverse_distributor_id,
    TRIM(COALESCE(
      rd.name,
      NEW.data->>'reverseDistributor',
      NEW.data->'reverseDistributorInfo'->>'name',
      'Unknown Distributor'
    )),
    rd.contact_email,
    rd.contact_phone,
    safe_get_location(rd.address),
    ud.report_date,
    ud.uploaded_at
  INTO 
    v_distributor_id, 
    v_distributor_name,
    v_distributor_email,
    v_distributor_phone,
    v_distributor_location,
    v_report_date,
    v_uploaded_at
  FROM uploaded_documents ud
  LEFT JOIN reverse_distributors rd ON ud.reverse_distributor_id = rd.id
  WHERE ud.id = NEW.document_id;
  
  -- Skip if no valid distributor name
  IF v_distributor_name IS NULL OR v_distributor_name = 'Unknown Distributor' THEN
    RETURN NEW;
  END IF;
  
  -- Upsert into pricing index
  INSERT INTO ndc_pricing_index (
    ndc_original,
    ndc_normalized,
    product_name,
    distributor_id,
    distributor_name,
    distributor_email,
    distributor_phone,
    distributor_location,
    price_per_unit,
    credit_amount,
    quantity,
    is_full_record,
    is_partial_record,
    source_report_id,
    report_date,
    uploaded_at,
    source_created_at,
    updated_at
  )
  VALUES (
    v_ndc_original,
    v_ndc_normalized,
    v_product_name,
    v_distributor_id,
    v_distributor_name,
    v_distributor_email,
    v_distributor_phone,
    v_distributor_location,
    v_price_per_unit,
    v_credit_amount,
    v_quantity,
    v_is_full_record,
    v_is_partial_record,
    NEW.id,
    v_report_date,
    v_uploaded_at,
    v_source_created_at,
    NOW()
  )
  ON CONFLICT (ndc_normalized, distributor_name, is_full_record, is_partial_record)
  DO UPDATE SET
    ndc_original = EXCLUDED.ndc_original,
    product_name = COALESCE(EXCLUDED.product_name, ndc_pricing_index.product_name),
    distributor_id = COALESCE(EXCLUDED.distributor_id, ndc_pricing_index.distributor_id),
    distributor_email = COALESCE(EXCLUDED.distributor_email, ndc_pricing_index.distributor_email),
    distributor_phone = COALESCE(EXCLUDED.distributor_phone, ndc_pricing_index.distributor_phone),
    distributor_location = COALESCE(EXCLUDED.distributor_location, ndc_pricing_index.distributor_location),
    -- Only update price if new report is more recent
    -- SAME fallback chain as optimization API: report_date || uploaded_at || created_at
    price_per_unit = CASE 
      WHEN COALESCE(EXCLUDED.report_date::timestamp, EXCLUDED.uploaded_at, EXCLUDED.source_created_at) >= 
           COALESCE(ndc_pricing_index.report_date::timestamp, ndc_pricing_index.uploaded_at, ndc_pricing_index.source_created_at)
      THEN EXCLUDED.price_per_unit 
      ELSE ndc_pricing_index.price_per_unit 
    END,
    credit_amount = CASE 
      WHEN COALESCE(EXCLUDED.report_date::timestamp, EXCLUDED.uploaded_at, EXCLUDED.source_created_at) >= 
           COALESCE(ndc_pricing_index.report_date::timestamp, ndc_pricing_index.uploaded_at, ndc_pricing_index.source_created_at)
      THEN EXCLUDED.credit_amount 
      ELSE ndc_pricing_index.credit_amount 
    END,
    quantity = CASE 
      WHEN COALESCE(EXCLUDED.report_date::timestamp, EXCLUDED.uploaded_at, EXCLUDED.source_created_at) >= 
           COALESCE(ndc_pricing_index.report_date::timestamp, ndc_pricing_index.uploaded_at, ndc_pricing_index.source_created_at)
      THEN EXCLUDED.quantity 
      ELSE ndc_pricing_index.quantity 
    END,
    report_date = CASE 
      WHEN COALESCE(EXCLUDED.report_date::timestamp, EXCLUDED.uploaded_at, EXCLUDED.source_created_at) >= 
           COALESCE(ndc_pricing_index.report_date::timestamp, ndc_pricing_index.uploaded_at, ndc_pricing_index.source_created_at)
      THEN EXCLUDED.report_date 
      ELSE ndc_pricing_index.report_date 
    END,
    uploaded_at = CASE 
      WHEN COALESCE(EXCLUDED.report_date::timestamp, EXCLUDED.uploaded_at, EXCLUDED.source_created_at) >= 
           COALESCE(ndc_pricing_index.report_date::timestamp, ndc_pricing_index.uploaded_at, ndc_pricing_index.source_created_at)
      THEN EXCLUDED.uploaded_at 
      ELSE ndc_pricing_index.uploaded_at 
    END,
    source_created_at = CASE 
      WHEN COALESCE(EXCLUDED.report_date::timestamp, EXCLUDED.uploaded_at, EXCLUDED.source_created_at) >= 
           COALESCE(ndc_pricing_index.report_date::timestamp, ndc_pricing_index.uploaded_at, ndc_pricing_index.source_created_at)
      THEN EXCLUDED.source_created_at 
      ELSE ndc_pricing_index.source_created_at 
    END,
    source_report_id = CASE 
      WHEN COALESCE(EXCLUDED.report_date::timestamp, EXCLUDED.uploaded_at, EXCLUDED.source_created_at) >= 
           COALESCE(ndc_pricing_index.report_date::timestamp, ndc_pricing_index.uploaded_at, ndc_pricing_index.source_created_at)
      THEN EXCLUDED.source_report_id 
      ELSE ndc_pricing_index.source_report_id 
    END,
    updated_at = NOW();
  
  RETURN NEW;
END;
$function$;
