-- Debug: What is my current SQL function actually picking?

SELECT 
  'search_ndc_pricing' as source,
  (search_ndc_pricing('60219-1748-02', 50)::jsonb->'results'->0->'distributors') as distributors_data;
