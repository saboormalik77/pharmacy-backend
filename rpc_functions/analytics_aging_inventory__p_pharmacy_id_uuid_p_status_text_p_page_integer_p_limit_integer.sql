-- Function : analytics_aging_inventory
-- Arguments: p_pharmacy_id uuid, p_status text, p_page integer, p_limit integer
-- Type     : FUNCTION
-- =============================================================

DROP FUNCTION IF EXISTS public.analytics_aging_inventory(p_pharmacy_id uuid, p_status text, p_page integer, p_limit integer) CASCADE;

CREATE OR REPLACE FUNCTION public.analytics_aging_inventory(p_pharmacy_id uuid DEFAULT NULL::uuid, p_status text DEFAULT NULL::text, p_page integer DEFAULT 1, p_limit integer DEFAULT 20)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
AS $function$
DECLARE
  v_offset   INTEGER;
  v_total    INTEGER;
  v_rows     jsonb;
  v_summary  jsonb;
  v_aging    jsonb;
BEGIN
  v_offset := (GREATEST(p_page, 1) - 1) * p_limit;

  -- Summary stats
  SELECT jsonb_build_object(
    'totalItems',      COUNT(*),
    'totalValue',      COALESCE(SUM(wc.estimated_value), 0),
    'shelvedCount',    COUNT(*) FILTER (WHERE wc.status = 'shelved'),
    'readyCount',      COUNT(*) FILTER (WHERE wc.status = 'ready_to_return'),
    'returnedCount',   COUNT(*) FILTER (WHERE wc.status = 'returned'),
    'destroyedCount',  COUNT(*) FILTER (WHERE wc.status = 'destroyed'),
    'avgDaysShelved',  ROUND(COALESCE(AVG(
      CASE WHEN wc.status = 'shelved'
        THEN EXTRACT(DAY FROM (NOW() - wc.date_shelved))
        ELSE NULL END
    ), 0), 0)
  )
  INTO v_summary
  FROM wine_cellar wc
  WHERE (p_pharmacy_id IS NULL OR wc.pharmacy_id = p_pharmacy_id)
    AND (p_status IS NULL OR wc.status = p_status);

  -- Aging buckets (for shelved items only)
  SELECT jsonb_build_object(
    'under30Days',  jsonb_build_object(
      'count', COUNT(*) FILTER (WHERE EXTRACT(DAY FROM (NOW() - wc.date_shelved)) < 30),
      'value', COALESCE(SUM(wc.estimated_value) FILTER (WHERE EXTRACT(DAY FROM (NOW() - wc.date_shelved)) < 30), 0)
    ),
    'days30to90',   jsonb_build_object(
      'count', COUNT(*) FILTER (WHERE EXTRACT(DAY FROM (NOW() - wc.date_shelved)) BETWEEN 30 AND 90),
      'value', COALESCE(SUM(wc.estimated_value) FILTER (WHERE EXTRACT(DAY FROM (NOW() - wc.date_shelved)) BETWEEN 30 AND 90), 0)
    ),
    'days91to180',  jsonb_build_object(
      'count', COUNT(*) FILTER (WHERE EXTRACT(DAY FROM (NOW() - wc.date_shelved)) BETWEEN 91 AND 180),
      'value', COALESCE(SUM(wc.estimated_value) FILTER (WHERE EXTRACT(DAY FROM (NOW() - wc.date_shelved)) BETWEEN 91 AND 180), 0)
    ),
    'over180Days',  jsonb_build_object(
      'count', COUNT(*) FILTER (WHERE EXTRACT(DAY FROM (NOW() - wc.date_shelved)) > 180),
      'value', COALESCE(SUM(wc.estimated_value) FILTER (WHERE EXTRACT(DAY FROM (NOW() - wc.date_shelved)) > 180), 0)
    )
  )
  INTO v_aging
  FROM wine_cellar wc
  WHERE wc.status = 'shelved'
    AND (p_pharmacy_id IS NULL OR wc.pharmacy_id = p_pharmacy_id);

  -- Count for pagination
  SELECT COUNT(*) INTO v_total
  FROM wine_cellar wc
  WHERE (p_pharmacy_id IS NULL OR wc.pharmacy_id = p_pharmacy_id)
    AND (p_status IS NULL OR wc.status = p_status);

  -- Data rows
  SELECT COALESCE(jsonb_agg(row_data ORDER BY days_shelved DESC), '[]'::jsonb)
  INTO v_rows
  FROM (
    SELECT jsonb_build_object(
      'id',                    wc.id,
      'pharmacyId',            wc.pharmacy_id,
      'pharmacyName',          COALESCE(ph.pharmacy_name, ''),
      'ndc',                   wc.ndc,
      'productName',           wc.product_name,
      'manufacturer',          wc.manufacturer,
      'lotNumber',             wc.lot_number,
      'expirationDate',        wc.expiration_date,
      'quantity',              wc.quantity,
      'estimatedValue',        wc.estimated_value,
      'dateShelved',           wc.date_shelved,
      'expectedReturnableDate',wc.expected_returnable_date,
      'status',                wc.status,
      'daysShelved',           EXTRACT(DAY FROM (NOW() - wc.date_shelved))::integer,
      'physicalLocation',      wc.physical_location,
      'baggieBarcode',         wc.baggie_barcode
    ) AS row_data,
    EXTRACT(DAY FROM (NOW() - wc.date_shelved))::integer AS days_shelved
    FROM wine_cellar wc
    LEFT JOIN pharmacy ph ON ph.id = wc.pharmacy_id
    WHERE (p_pharmacy_id IS NULL OR wc.pharmacy_id = p_pharmacy_id)
      AND (p_status IS NULL OR wc.status = p_status)
    ORDER BY wc.date_shelved ASC
    LIMIT p_limit OFFSET v_offset
  ) sub;

  RETURN jsonb_build_object(
    'error', false,
    'data', v_rows,
    'summary', v_summary,
    'agingBuckets', v_aging,
    'pagination', jsonb_build_object(
      'page', p_page, 'limit', p_limit, 'total', v_total,
      'totalPages', CEIL(GREATEST(v_total, 1)::float / p_limit)::integer
    )
  );
END;
$function$;
