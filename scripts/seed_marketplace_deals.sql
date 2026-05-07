-- ============================================================
-- Seed Marketplace Deals
-- Run this script to add sample deals to the marketplace
-- ============================================================

-- Reset sequence if needed (uncomment if you want to start from DEAL-001)
-- ALTER SEQUENCE marketplace_deal_number_seq RESTART WITH 1;

-- Insert sample marketplace deals
INSERT INTO public.marketplace_deals (
  product_name, category, quantity, unit, original_price, deal_price, 
  distributor_name, expiry_date, posted_date, status, ndc, notes
) VALUES 
-- Pain Relief Category
(
  'Ibuprofen 200mg',
  'Pain Relief',
  500,
  'bottles',
  15.00,
  12.00,
  'MediSupply Corp',
  '2025-06-30',
  CURRENT_DATE,
  'active',
  '00904-5809-60',
  'Brand new stock, original packaging'
),
(
  'Acetaminophen 500mg',
  'Pain Relief',
  300,
  'bottles',
  12.00,
  9.50,
  'PharmaDistribute Inc',
  '2025-08-15',
  CURRENT_DATE - INTERVAL '2 days',
  'active',
  '00904-1982-60',
  'Extra strength formula'
),
(
  'Naproxen 250mg',
  'Pain Relief',
  200,
  'bottles',
  18.00,
  14.00,
  'HealthWholesale LLC',
  '2025-07-20',
  CURRENT_DATE - INTERVAL '5 days',
  'active',
  '00904-7914-60',
  NULL
),

-- Antibiotics Category
(
  'Amoxicillin 500mg',
  'Antibiotics',
  300,
  'bottles',
  25.00,
  20.00,
  'PharmaDistribute Inc',
  '2025-08-15',
  CURRENT_DATE - INTERVAL '1 day',
  'active',
  '65862-0015-01',
  'Capsules, sealed bottles'
),
(
  'Azithromycin 250mg',
  'Antibiotics',
  150,
  'packs',
  35.00,
  28.00,
  'MediSupply Corp',
  '2025-09-30',
  CURRENT_DATE - INTERVAL '3 days',
  'active',
  '65862-0596-06',
  'Z-Pack format'
),
(
  'Ciprofloxacin 500mg',
  'Antibiotics',
  250,
  'bottles',
  30.00,
  24.00,
  'HealthWholesale LLC',
  '2025-05-15',
  CURRENT_DATE - INTERVAL '7 days',
  'active',
  '65862-0537-01',
  NULL
),

-- Cardiovascular Category
(
  'Lisinopril 10mg',
  'Cardiovascular',
  200,
  'bottles',
  18.00,
  14.00,
  'HealthWholesale LLC',
  '2025-05-20',
  CURRENT_DATE - INTERVAL '4 days',
  'active',
  '65862-0197-01',
  'ACE inhibitor'
),
(
  'Atorvastatin 20mg',
  'Cardiovascular',
  400,
  'bottles',
  22.00,
  17.00,
  'MediSupply Corp',
  '2025-10-30',
  CURRENT_DATE - INTERVAL '2 days',
  'active',
  '00071-0155-23',
  'Lipitor generic'
),
(
  'Amlodipine 5mg',
  'Cardiovascular',
  350,
  'bottles',
  16.00,
  12.50,
  'PharmaDistribute Inc',
  '2025-11-15',
  CURRENT_DATE,
  'active',
  '65862-0176-01',
  'Calcium channel blocker'
),
(
  'Losartan 50mg',
  'Cardiovascular',
  280,
  'bottles',
  20.00,
  15.00,
  'HealthWholesale LLC',
  '2025-08-25',
  CURRENT_DATE - INTERVAL '6 days',
  'active',
  '65862-0202-01',
  'ARB medication'
),

-- Diabetes Category
(
  'Metformin 1000mg',
  'Diabetes',
  400,
  'bottles',
  22.00,
  18.00,
  'MediSupply Corp',
  '2025-07-10',
  CURRENT_DATE - INTERVAL '1 day',
  'active',
  '65862-0009-01',
  'Extended release'
),
(
  'Glipizide 5mg',
  'Diabetes',
  250,
  'bottles',
  28.00,
  22.00,
  'PharmaDistribute Inc',
  '2025-09-20',
  CURRENT_DATE - INTERVAL '3 days',
  'active',
  '65862-0048-01',
  'Sulfonylurea'
),
(
  'Januvia 100mg',
  'Diabetes',
  100,
  'boxes',
  120.00,
  95.00,
  'HealthWholesale LLC',
  '2025-12-31',
  CURRENT_DATE,
  'active',
  '00006-0277-31',
  'DPP-4 inhibitor, brand name'
),

-- Gastrointestinal Category
(
  'Omeprazole 20mg',
  'Gastrointestinal',
  300,
  'bottles',
  20.00,
  15.00,
  'MediSupply Corp',
  '2025-06-15',
  CURRENT_DATE - INTERVAL '5 days',
  'active',
  '65862-0103-01',
  'Proton pump inhibitor'
),
(
  'Pantoprazole 40mg',
  'Gastrointestinal',
  200,
  'bottles',
  25.00,
  19.00,
  'PharmaDistribute Inc',
  '2025-08-20',
  CURRENT_DATE - INTERVAL '2 days',
  'active',
  '65862-0497-01',
  NULL
),

-- Respiratory Category
(
  'Albuterol Inhaler',
  'Respiratory',
  150,
  'units',
  45.00,
  35.00,
  'HealthWholesale LLC',
  '2025-07-30',
  CURRENT_DATE - INTERVAL '4 days',
  'active',
  '00173-0682-20',
  'Rescue inhaler'
),
(
  'Montelukast 10mg',
  'Respiratory',
  200,
  'bottles',
  32.00,
  25.00,
  'MediSupply Corp',
  '2025-10-15',
  CURRENT_DATE - INTERVAL '1 day',
  'active',
  '00006-0711-31',
  'Leukotriene inhibitor'
),

-- Mental Health Category
(
  'Sertraline 50mg',
  'Mental Health',
  250,
  'bottles',
  28.00,
  22.00,
  'PharmaDistribute Inc',
  '2025-09-10',
  CURRENT_DATE - INTERVAL '3 days',
  'active',
  '65862-0086-01',
  'SSRI antidepressant'
),
(
  'Escitalopram 10mg',
  'Mental Health',
  180,
  'bottles',
  35.00,
  27.00,
  'HealthWholesale LLC',
  '2025-11-20',
  CURRENT_DATE,
  'active',
  '65862-0373-01',
  'Lexapro generic'
),

-- Some sold deals for variety
(
  'Hydrochlorothiazide 25mg',
  'Cardiovascular',
  100,
  'bottles',
  14.00,
  10.00,
  'MediSupply Corp',
  '2025-04-15',
  CURRENT_DATE - INTERVAL '14 days',
  'sold',
  '65862-0163-01',
  'Diuretic - SOLD OUT'
),
(
  'Gabapentin 300mg',
  'Pain Relief',
  150,
  'bottles',
  38.00,
  30.00,
  'PharmaDistribute Inc',
  '2025-05-10',
  CURRENT_DATE - INTERVAL '10 days',
  'sold',
  '65862-0057-01',
  'Nerve pain medication - SOLD OUT'
);

-- Verify the data
SELECT 
  category,
  COUNT(*) as deal_count,
  SUM(quantity) as total_items
FROM public.marketplace_deals
GROUP BY category
ORDER BY deal_count DESC;

