-- Function : _pharmacy_reports_header
-- Arguments: p_pharmacy_id uuid
-- Type     : FUNCTION
-- =============================================================

DROP FUNCTION IF EXISTS public._pharmacy_reports_header(p_pharmacy_id uuid) CASCADE;

CREATE OR REPLACE FUNCTION public._pharmacy_reports_header(p_pharmacy_id uuid)
 RETURNS jsonb
 LANGUAGE sql
 STABLE
AS $function$
  SELECT jsonb_build_object(
    'pharmacyId',        p.id,
    'pharmacyName',      COALESCE(p.pharmacy_name, p.name, ''),
    'corporateName',     COALESCE(p.corporate_name, ''),
    'storeNumber',       COALESCE(p.store_number, ''),
    'deaNumber',         COALESCE(p.dea_number, ''),
    'deaExpirationDate', p.dea_expiration_date,
    'npiNumber',         COALESCE(p.npi_number, ''),
    'stateLicenseNumber',COALESCE(p.state_license_number, ''),
    'licenseExpiryDate', p.license_expiry_date,
    'contactPhone',      COALESCE(p.contact_phone, p.phone, ''),
    'faxNumber',         COALESCE(p.fax_number, ''),
    'email',             COALESCE(p.email, ''),
    'contactName',       '',
    'primaryWholesaler', COALESCE(p.primary_wholesaler, ''),
    'wholesalerAccountNumber', COALESCE(p.wholesaler_account_number, ''),
    -- Nicely formatted single-line address for report headers
    'address',           CASE
      WHEN p.physical_address IS NOT NULL AND jsonb_typeof(p.physical_address) = 'object' THEN
        TRIM(BOTH ', ' FROM CONCAT_WS(', ',
          NULLIF(TRIM(COALESCE(p.physical_address->>'street', '')),  ''),
          NULLIF(TRIM(COALESCE(p.physical_address->>'city',   '')),  ''),
          TRIM(CONCAT_WS(' ',
            NULLIF(TRIM(COALESCE(p.physical_address->>'state','')), ''),
            NULLIF(TRIM(COALESCE(p.physical_address->>'zip',  '')), '')
          ))
        ))
      ELSE COALESCE(p.mailing_address, '')
    END,
    -- Detailed address components for multi-line layouts (Controls.pdf style)
    'street',            COALESCE(p.physical_address->>'street', ''),
    'city',              COALESCE(p.physical_address->>'city', ''),
    'state',             COALESCE(p.physical_address->>'state', ''),
    'zip',               COALESCE(p.physical_address->>'zip', ''),
    -- Raw physical address JSON for downstream formatting flexibility
    'physicalAddress',   p.physical_address
  )
  FROM pharmacy p
  WHERE p.id = p_pharmacy_id;
$function$;
