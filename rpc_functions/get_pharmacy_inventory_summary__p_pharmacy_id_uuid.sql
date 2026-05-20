-- Function : get_pharmacy_inventory_summary
-- Arguments: p_pharmacy_id uuid
-- Type     : FUNCTION
-- =============================================================

DROP FUNCTION IF EXISTS public.get_pharmacy_inventory_summary(p_pharmacy_id uuid) CASCADE;

CREATE OR REPLACE FUNCTION public.get_pharmacy_inventory_summary(p_pharmacy_id uuid)
 RETURNS TABLE(total_items bigint, items_to_return bigint, items_to_keep bigint, total_potential_value numeric, items_by_recommendation jsonb, top_return_items jsonb, upcoming_expirations bigint)
 LANGUAGE plpgsql
AS $function$
BEGIN
  RETURN QUERY
  WITH item_stats AS (
    SELECT 
      COUNT(*) AS total_items,
      COUNT(*) FILTER (WHERE recommendation_type = 'return_now') AS items_to_return,
      COUNT(*) FILTER (WHERE recommendation_type IN ('keep', 'monitor')) AS items_to_keep,
      COALESCE(SUM(estimated_return_value) FILTER (WHERE recommendation_type = 'return_now'), 0) AS total_potential_value,
      COUNT(*) FILTER (WHERE expiration_date IS NOT NULL AND expiration_date <= CURRENT_DATE + INTERVAL '90 days') AS upcoming_expirations
    FROM pharmacy_inventory_items
    WHERE pharmacy_id = p_pharmacy_id
      AND status = 'active'
  ),
  by_recommendation AS (
    SELECT jsonb_object_agg(
      recommendation_type,
      cnt
    ) AS items_by_recommendation
    FROM (
      SELECT recommendation_type, COUNT(*) AS cnt
      FROM pharmacy_inventory_items
      WHERE pharmacy_id = p_pharmacy_id
        AND status = 'active'
      GROUP BY recommendation_type
    ) sub
  ),
  top_items AS (
    SELECT jsonb_agg(
      jsonb_build_object(
        'id', id,
        'ndc_code', ndc_code,
        'product_name', product_name,
        'quantity', quantity,
        'estimated_return_value', estimated_return_value,
        'recommended_distributor', recommended_distributor_name,
        'expiration_date', expiration_date
      ) ORDER BY estimated_return_value DESC
    ) AS top_return_items
    FROM (
      SELECT id, ndc_code, product_name, quantity, estimated_return_value, 
             recommended_distributor_name, expiration_date
      FROM pharmacy_inventory_items
      WHERE pharmacy_id = p_pharmacy_id
        AND status = 'active'
        AND recommendation_type = 'return_now'
      ORDER BY estimated_return_value DESC
      LIMIT 10
    ) sub
  )
  SELECT 
    COALESCE(s.total_items, 0),
    COALESCE(s.items_to_return, 0),
    COALESCE(s.items_to_keep, 0),
    COALESCE(s.total_potential_value, 0),
    COALESCE(r.items_by_recommendation, '{}'::jsonb),
    COALESCE(t.top_return_items, '[]'::jsonb),
    COALESCE(s.upcoming_expirations, 0)
  FROM item_stats s
  CROSS JOIN by_recommendation r
  CROSS JOIN top_items t;
END;
$function$;
