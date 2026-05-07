-- PostgreSQL function to get historical earnings with SQL aggregation
-- This eliminates custom JS logic by using database-level GROUP BY

-- Drop existing function if exists
DROP FUNCTION IF EXISTS get_historical_earnings(UUID, TEXT, DATE, DATE);

CREATE OR REPLACE FUNCTION get_historical_earnings(
  p_pharmacy_id UUID,
  p_period_type TEXT,  -- 'monthly' or 'yearly'
  p_start_date DATE,
  p_end_date DATE
)
RETURNS JSON AS $$
DECLARE
  period_earnings_result JSON;
  distributor_earnings_result JSON;
  total_earnings_val NUMERIC;
  total_documents_val INTEGER;
  avg_period_earnings NUMERIC;
  periods_with_earnings INTEGER;
BEGIN
  -- SECURITY: Check pharmacy status (block suspended/blacklisted)
  PERFORM check_pharmacy_status(p_pharmacy_id);
  
  -- Generate period earnings with all periods (even empty ones)
  IF p_period_type = 'yearly' THEN
    -- Yearly aggregation
    WITH years AS (
      SELECT generate_series(
        EXTRACT(YEAR FROM p_start_date)::INTEGER,
        EXTRACT(YEAR FROM p_end_date)::INTEGER
      ) as year
    ),
    earnings AS (
      SELECT 
        EXTRACT(YEAR FROM report_date)::INTEGER as year,
        ROUND(SUM(total_credit_amount)::NUMERIC, 2) as earnings,
        COUNT(*)::INTEGER as documents_count
      FROM uploaded_documents
      WHERE pharmacy_id = p_pharmacy_id
        AND report_date >= p_start_date
        AND report_date <= p_end_date
        AND total_credit_amount IS NOT NULL
      GROUP BY EXTRACT(YEAR FROM report_date)
    )
    SELECT json_agg(
      json_build_object(
        'period', y.year::TEXT,
        'label', y.year::TEXT,
        'earnings', COALESCE(e.earnings, 0),
        'documentsCount', COALESCE(e.documents_count, 0)
      ) ORDER BY y.year
    )
    INTO period_earnings_result
    FROM years y
    LEFT JOIN earnings e ON y.year = e.year;
  ELSE
    -- Monthly aggregation
    WITH months AS (
      SELECT 
        TO_CHAR(d::DATE, 'YYYY-MM') as period,
        TRIM(TO_CHAR(d::DATE, 'Month')) || ' ' || EXTRACT(YEAR FROM d::DATE)::TEXT as label,
        d::DATE as month_date
      FROM generate_series(
        DATE_TRUNC('month', p_start_date),
        DATE_TRUNC('month', p_end_date),
        '1 month'::INTERVAL
      ) d
    ),
    earnings AS (
      SELECT 
        TO_CHAR(report_date, 'YYYY-MM') as period,
        ROUND(SUM(total_credit_amount)::NUMERIC, 2) as earnings,
        COUNT(*)::INTEGER as documents_count
      FROM uploaded_documents
      WHERE pharmacy_id = p_pharmacy_id
        AND report_date >= p_start_date
        AND report_date <= p_end_date
        AND total_credit_amount IS NOT NULL
      GROUP BY TO_CHAR(report_date, 'YYYY-MM')
    )
    SELECT json_agg(
      json_build_object(
        'period', m.period,
        'label', m.label,
        'earnings', COALESCE(e.earnings, 0),
        'documentsCount', COALESCE(e.documents_count, 0)
      ) ORDER BY m.period
    )
    INTO period_earnings_result
    FROM months m
    LEFT JOIN earnings e ON m.period = e.period;
  END IF;

  -- Get distributor earnings (sorted by earnings desc)
  SELECT json_agg(
    json_build_object(
      'distributorId', distributor_id,
      'distributorName', distributor_name,
      'totalEarnings', total_earnings,
      'documentsCount', documents_count
    ) ORDER BY total_earnings DESC
  )
  INTO distributor_earnings_result
  FROM (
    SELECT 
      ud.reverse_distributor_id as distributor_id,
      COALESCE(rd.name, 'Unknown Distributor') as distributor_name,
      ROUND(SUM(ud.total_credit_amount)::NUMERIC, 2) as total_earnings,
      COUNT(*)::INTEGER as documents_count
    FROM uploaded_documents ud
    LEFT JOIN reverse_distributors rd ON ud.reverse_distributor_id = rd.id
    WHERE ud.pharmacy_id = p_pharmacy_id
      AND ud.report_date >= p_start_date
      AND ud.report_date <= p_end_date
      AND ud.total_credit_amount IS NOT NULL
      AND ud.reverse_distributor_id IS NOT NULL
    GROUP BY ud.reverse_distributor_id, rd.name
  ) sub;

  -- Calculate totals
  SELECT 
    COALESCE(ROUND(SUM(total_credit_amount)::NUMERIC, 2), 0),
    COALESCE(COUNT(*), 0)
  INTO total_earnings_val, total_documents_val
  FROM uploaded_documents
  WHERE pharmacy_id = p_pharmacy_id
    AND report_date >= p_start_date
    AND report_date <= p_end_date
    AND total_credit_amount IS NOT NULL;

  -- Calculate average (only for periods with earnings)
  SELECT COUNT(*)
  INTO periods_with_earnings
  FROM json_array_elements(period_earnings_result) elem
  WHERE (elem->>'earnings')::NUMERIC > 0;

  IF periods_with_earnings > 0 THEN
    avg_period_earnings := ROUND(total_earnings_val / periods_with_earnings, 2);
  ELSE
    avg_period_earnings := 0;
  END IF;

  -- Return complete result
  RETURN json_build_object(
    'periodEarnings', COALESCE(period_earnings_result, '[]'::JSON),
    'totalEarnings', total_earnings_val,
    'averagePeriodEarnings', avg_period_earnings,
    'totalDocuments', total_documents_val,
    'byDistributor', COALESCE(distributor_earnings_result, '[]'::JSON),
    'period', json_build_object(
      'startDate', p_start_date::TEXT,
      'endDate', p_end_date::TEXT,
      'type', p_period_type,
      'periods', CASE 
        WHEN p_period_type = 'yearly' THEN 
          EXTRACT(YEAR FROM p_end_date)::INTEGER - EXTRACT(YEAR FROM p_start_date)::INTEGER
        ELSE
          (EXTRACT(YEAR FROM p_end_date) - EXTRACT(YEAR FROM p_start_date)) * 12 +
          EXTRACT(MONTH FROM p_end_date) - EXTRACT(MONTH FROM p_start_date)
      END
    )
  );
END;
$$ LANGUAGE plpgsql;

