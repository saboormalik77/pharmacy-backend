-- PostgreSQL function to get earnings estimation with SQL aggregation
-- This eliminates custom JS logic by using database-level processing
-- Compares pharmacy's actual earnings vs best possible earnings from all distributors

-- Drop existing function if exists
DROP FUNCTION IF EXISTS get_earnings_estimation(UUID, TEXT, DATE, DATE);

CREATE OR REPLACE FUNCTION get_earnings_estimation(
  p_pharmacy_id UUID,
  p_period_type TEXT,
  p_start_date DATE,
  p_end_date DATE
)
RETURNS JSON AS $$
DECLARE
  chart_data_result JSON;
  top_missed_result JSON;
  total_actual NUMERIC := 0;
  total_potential NUMERIC := 0;
  total_missed NUMERIC := 0;
  opt_score INTEGER := 100;
  is_optimal BOOLEAN := true;
BEGIN
  -- SECURITY: Check pharmacy status (block suspended/blacklisted)
  PERFORM check_pharmacy_status(p_pharmacy_id);
  
  -- Create temp table for earnings comparison data (used by multiple queries)
  CREATE TEMP TABLE temp_earnings_comparison ON COMMIT DROP AS
  WITH all_pricing AS (
    SELECT 
      UPPER(REGEXP_REPLACE(COALESCE(rr.data->>'ndcCode', rr.data->>'ndc'), '[-\s]', '', 'g')) as normalized_ndc,
      ud.reverse_distributor_id as distributor_id,
      rd.name as distributor_name,
      (rr.data->>'pricePerUnit')::NUMERIC as price_per_unit,
      COALESCE(ud.report_date, rr.created_at::DATE) as report_date,
      CASE 
        WHEN (rr.data->>'full')::NUMERIC > 0 AND COALESCE((rr.data->>'partial')::NUMERIC, 0) = 0 THEN 'full'
        WHEN (rr.data->>'partial')::NUMERIC > 0 AND COALESCE((rr.data->>'full')::NUMERIC, 0) = 0 THEN 'partial'
        ELSE 'mixed'
      END as record_type
    FROM return_reports rr
    JOIN uploaded_documents ud ON rr.document_id = ud.id
    JOIN reverse_distributors rd ON ud.reverse_distributor_id = rd.id
    WHERE (rr.data->>'pricePerUnit')::NUMERIC > 0
      AND COALESCE(rr.data->>'ndcCode', rr.data->>'ndc') IS NOT NULL
      AND (
        ((rr.data->>'full')::NUMERIC > 0 AND COALESCE((rr.data->>'partial')::NUMERIC, 0) = 0)
        OR ((rr.data->>'partial')::NUMERIC > 0 AND COALESCE((rr.data->>'full')::NUMERIC, 0) = 0)
      )
  ),
  best_full_prices AS (
    SELECT DISTINCT ON (normalized_ndc)
      normalized_ndc,
      distributor_id as best_full_distributor_id,
      distributor_name as best_full_distributor_name,
      price_per_unit as best_full_price
    FROM all_pricing
    WHERE record_type = 'full'
    ORDER BY normalized_ndc, report_date DESC, price_per_unit DESC
  ),
  best_partial_prices AS (
    SELECT DISTINCT ON (normalized_ndc)
      normalized_ndc,
      distributor_id as best_partial_distributor_id,
      distributor_name as best_partial_distributor_name,
      price_per_unit as best_partial_price
    FROM all_pricing
    WHERE record_type = 'partial'
    ORDER BY normalized_ndc, report_date DESC, price_per_unit DESC
  ),
  best_prices AS (
    SELECT 
      COALESCE(f.normalized_ndc, p.normalized_ndc) as normalized_ndc,
      f.best_full_price,
      f.best_full_distributor_id,
      f.best_full_distributor_name,
      p.best_partial_price,
      p.best_partial_distributor_id,
      p.best_partial_distributor_name
    FROM best_full_prices f
    FULL OUTER JOIN best_partial_prices p ON f.normalized_ndc = p.normalized_ndc
  ),
  pharmacy_reports AS (
    SELECT 
      rr.id as report_id,
      ud.report_date,
      UPPER(REGEXP_REPLACE(COALESCE(rr.data->>'ndcCode', rr.data->>'ndc'), '[-\s]', '', 'g')) as normalized_ndc,
      COALESCE(rr.data->>'ndcCode', rr.data->>'ndc') as original_ndc,
      COALESCE(rr.data->>'itemName', rr.data->>'productDescription', 'Product ' || COALESCE(rr.data->>'ndcCode', rr.data->>'ndc')) as product_name,
      (rr.data->>'quantity')::NUMERIC as quantity,
      COALESCE((rr.data->>'full')::NUMERIC, 0) as full_qty,
      COALESCE((rr.data->>'partial')::NUMERIC, 0) as partial_qty,
      (rr.data->>'creditAmount')::NUMERIC as credit_amount,
      CASE 
        WHEN (rr.data->>'full')::NUMERIC > 0 AND COALESCE((rr.data->>'partial')::NUMERIC, 0) = 0 THEN 'full'
        WHEN (rr.data->>'partial')::NUMERIC > 0 AND COALESCE((rr.data->>'full')::NUMERIC, 0) = 0 THEN 'partial'
        ELSE 'mixed'
      END as record_type
    FROM return_reports rr
    JOIN uploaded_documents ud ON rr.document_id = ud.id
    WHERE ud.pharmacy_id = p_pharmacy_id
      AND ud.status = 'completed'
      AND ud.report_date >= p_start_date
      AND ud.report_date <= p_end_date
      AND (rr.data->>'creditAmount')::NUMERIC > 0
  )
  SELECT 
    pr.report_id,
    pr.report_date,
    pr.normalized_ndc,
    pr.original_ndc,
    pr.product_name,
    pr.quantity,
    pr.full_qty,
    pr.partial_qty,
    pr.credit_amount,
    pr.record_type,
    CASE 
      WHEN pr.record_type = 'full' THEN bp.best_full_price
      WHEN pr.record_type = 'partial' THEN bp.best_partial_price
      ELSE GREATEST(COALESCE(bp.best_full_price, 0), COALESCE(bp.best_partial_price, 0))
    END as best_price,
    CASE 
      WHEN pr.record_type = 'full' THEN bp.best_full_distributor_id
      WHEN pr.record_type = 'partial' THEN bp.best_partial_distributor_id
      ELSE CASE 
        WHEN COALESCE(bp.best_full_price, 0) >= COALESCE(bp.best_partial_price, 0) THEN bp.best_full_distributor_id
        ELSE bp.best_partial_distributor_id
      END
    END as best_distributor_id,
    CASE 
      WHEN pr.record_type = 'full' THEN bp.best_full_distributor_name
      WHEN pr.record_type = 'partial' THEN bp.best_partial_distributor_name
      ELSE CASE 
        WHEN COALESCE(bp.best_full_price, 0) >= COALESCE(bp.best_partial_price, 0) THEN bp.best_full_distributor_name
        ELSE bp.best_partial_distributor_name
      END
    END as best_distributor_name,
    CASE 
      WHEN pr.record_type = 'full' AND bp.best_full_price > 0 THEN bp.best_full_price * pr.quantity
      WHEN pr.record_type = 'partial' AND bp.best_partial_price > 0 THEN bp.best_partial_price * pr.quantity
      WHEN GREATEST(COALESCE(bp.best_full_price, 0), COALESCE(bp.best_partial_price, 0)) > 0 
        THEN GREATEST(COALESCE(bp.best_full_price, 0), COALESCE(bp.best_partial_price, 0)) * pr.quantity
      ELSE pr.credit_amount
    END as potential_earnings
  FROM pharmacy_reports pr
  LEFT JOIN best_prices bp ON pr.normalized_ndc = bp.normalized_ndc;

  -- Get chart data (period aggregation)
  WITH period_aggregation AS (
    SELECT 
      CASE 
        WHEN p_period_type = 'yearly' THEN EXTRACT(YEAR FROM report_date)::TEXT
        ELSE TO_CHAR(report_date, 'YYYY-MM')
      END as period,
      ROUND(SUM(credit_amount)::NUMERIC, 2) as actual_earnings,
      ROUND(SUM(potential_earnings)::NUMERIC, 2) as potential_earnings
    FROM temp_earnings_comparison
    GROUP BY 
      CASE 
        WHEN p_period_type = 'yearly' THEN EXTRACT(YEAR FROM report_date)::TEXT
        ELSE TO_CHAR(report_date, 'YYYY-MM')
      END
  ),
  periods_yearly AS (
    SELECT 
      year::TEXT as period,
      year::TEXT as label
    FROM generate_series(
      EXTRACT(YEAR FROM p_start_date)::INTEGER,
      EXTRACT(YEAR FROM p_end_date)::INTEGER
    ) as year
    WHERE p_period_type = 'yearly'
  ),
  periods_monthly AS (
    SELECT 
      TO_CHAR(d, 'YYYY-MM') as period,
      TRIM(TO_CHAR(d, 'Month')) || ' ' || EXTRACT(YEAR FROM d)::TEXT as label
    FROM generate_series(
      DATE_TRUNC('month', p_start_date),
      DATE_TRUNC('month', p_end_date),
      '1 month'::INTERVAL
    ) d
    WHERE p_period_type = 'monthly'
  ),
  all_periods_combined AS (
    SELECT * FROM periods_yearly
    UNION ALL
    SELECT * FROM periods_monthly
  )
  SELECT json_agg(
    json_build_object(
      'period', ap.period,
      'label', ap.label,
      'actualEarnings', COALESCE(pa.actual_earnings, 0),
      'potentialEarnings', COALESCE(pa.potential_earnings, 0),
      'difference', COALESCE(pa.potential_earnings, 0) - COALESCE(pa.actual_earnings, 0)
    ) ORDER BY ap.period
  )
  INTO chart_data_result
  FROM all_periods_combined ap
  LEFT JOIN period_aggregation pa ON ap.period = pa.period;

  -- Get top missed opportunities
  WITH ndc_aggregation AS (
    SELECT 
      normalized_ndc,
      original_ndc as ndc_code,
      MAX(product_name) as product_name,
      SUM(quantity)::INTEGER as quantity,
      SUM(full_qty)::INTEGER as full_count,
      SUM(partial_qty)::INTEGER as partial_count,
      ROUND(SUM(credit_amount)::NUMERIC, 2) as actual_earned,
      (array_agg(best_price ORDER BY potential_earnings DESC NULLS LAST))[1] as best_price_per_unit,
      (array_agg(best_distributor_id ORDER BY potential_earnings DESC NULLS LAST))[1] as best_distributor_id,
      (array_agg(best_distributor_name ORDER BY potential_earnings DESC NULLS LAST))[1] as best_distributor_name,
      ROUND(SUM(potential_earnings)::NUMERIC, 2) as potential_earnings
    FROM temp_earnings_comparison
    GROUP BY normalized_ndc, original_ndc
  ),
  missed_opportunities AS (
    SELECT 
      ndc_code,
      product_name,
      quantity,
      full_count,
      partial_count,
      actual_earned,
      best_price_per_unit,
      best_distributor_id,
      best_distributor_name,
      potential_earnings,
      ROUND((potential_earnings - actual_earned)::NUMERIC, 2) as potential_additional_earnings,
      CASE 
        WHEN actual_earned > 0 THEN ROUND(((potential_earnings - actual_earned) / actual_earned * 100)::NUMERIC, 2)
        ELSE 0
      END as percentage_difference,
      (potential_earnings - actual_earned) * 0.6 + 
        CASE WHEN actual_earned > 0 THEN ((potential_earnings - actual_earned) / actual_earned * actual_earned * 0.4) ELSE 0 END as sort_score
    FROM ndc_aggregation
    WHERE potential_earnings - actual_earned > 0.01
  )
  SELECT json_agg(row_data)
  INTO top_missed_result
  FROM (
    SELECT 
      json_build_object(
        'ndcCode', ndc_code,
        'productName', product_name,
        'quantity', quantity,
        'full', full_count,
        'partial', partial_count,
        'actualEarned', actual_earned,
        'bestDistributor', json_build_object(
          'id', COALESCE(best_distributor_id::TEXT, ''),
          'name', COALESCE(best_distributor_name, ''),
          'pricePerUnit', COALESCE(best_price_per_unit, 0),
          'potentialEarnings', potential_earnings
        ),
        'potentialAdditionalEarnings', potential_additional_earnings,
        'percentageDifference', percentage_difference
      ) as row_data
    FROM missed_opportunities
    ORDER BY sort_score DESC
    LIMIT 10
  ) sub;

  -- Get totals
  SELECT 
    COALESCE(ROUND(SUM(credit_amount)::NUMERIC, 2), 0),
    COALESCE(ROUND(SUM(potential_earnings)::NUMERIC, 2), 0)
  INTO total_actual, total_potential
  FROM temp_earnings_comparison;

  total_missed := total_potential - total_actual;
  
  IF total_potential > 0 THEN
    opt_score := ROUND((total_actual / total_potential) * 100)::INTEGER;
  ELSE
    opt_score := 100;
  END IF;
  
  is_optimal := total_missed < 1;

  RETURN json_build_object(
    'summary', json_build_object(
      'totalActualEarnings', total_actual,
      'totalPotentialEarnings', total_potential,
      'totalMissedEarnings', total_missed,
      'optimizationScore', opt_score,
      'isAlreadyOptimal', is_optimal,
      'periodType', p_period_type,
      'dateRange', json_build_object(
        'startDate', p_start_date::TEXT,
        'endDate', p_end_date::TEXT
      )
    ),
    'chartData', COALESCE(chart_data_result, '[]'::JSON),
    'topMissedOpportunities', COALESCE(top_missed_result, '[]'::JSON)
  );
END;
$$ LANGUAGE plpgsql;
