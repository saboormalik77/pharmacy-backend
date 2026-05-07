-- Test data for cron job testing
-- Run this in your Supabase SQL editor to create test data

-- Insert a test pharmacy (if not exists)
INSERT INTO pharmacy (id, name, email, status) 
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Test Pharmacy',
  'test@example.com',
  'active'
) ON CONFLICT (id) DO NOTHING;

-- Insert test inventory upload
INSERT INTO pharmacy_inventory_uploads (
  id,
  pharmacy_id,
  file_name,
  file_type,
  file_size,
  total_items,
  items_to_return,
  items_to_keep,
  status
) VALUES (
  '00000000-0000-0000-0000-000000000002',
  '00000000-0000-0000-0000-000000000001',
  'test_inventory.csv',
  'csv',
  1024,
  3,
  2,
  1,
  'completed'
) ON CONFLICT (id) DO NOTHING;

-- Insert test inventory items with expiring dates
INSERT INTO pharmacy_inventory_items (
  id,
  pharmacy_id,
  upload_id,
  ndc_code,
  ndc_normalized,
  product_name,
  quantity,
  full_units,
  partial_units,
  expiration_date,
  recommendation_type,
  estimated_return_value,
  best_full_price,
  best_partial_price,
  status
) VALUES 
-- Item that expired 5 days ago (should trigger notification)
(
  '00000000-0000-0000-0000-000000000003',
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000002',
  '60219-1748-02',
  '60219174802',
  'Atropine Sulfate 1% Ophthalmic Solution',
  5,
  5,
  0,
  CURRENT_DATE - INTERVAL '5 days',
  'return_now',
  41.83,
  41.83,
  0,
  'active'
),
-- Item expiring in 15 days (should trigger notification)
(
  '00000000-0000-0000-0000-000000000004',
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000002',
  '12345-6789-01',
  '12345678901',
  'Test Medicine A',
  10,
  8,
  2,
  CURRENT_DATE + INTERVAL '15 days',
  'return_now',
  125.50,
  15.50,
  5.25,
  'active'
),
-- Item expiring in 25 days (should trigger notification)
(
  '00000000-0000-0000-0000-000000000006',
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000002',
  '11111-2222-03',
  '11111222203',
  'Test Medicine C',
  7,
  7,
  0,
  CURRENT_DATE + INTERVAL '25 days',
  'return_now',
  89.75,
  89.75,
  0,
  'active'
),
-- Item expiring in 35 days (should NOT trigger notification - outside 30 day window)
(
  '00000000-0000-0000-0000-000000000005',
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000002',
  '98765-4321-01',
  '98765432101',
  'Test Medicine B',
  3,
  3,
  0,
  CURRENT_DATE + INTERVAL '35 days',
  'keep',
  25.00,
  25.00,
  0,
  'active'
)
ON CONFLICT (id) DO NOTHING;

-- Check the data
SELECT 
  ndc_code,
  product_name,
  expiration_date,
  CASE 
    WHEN expiration_date < CURRENT_DATE THEN CURRENT_DATE - expiration_date
    ELSE expiration_date - CURRENT_DATE
  END as days_difference,
  CASE 
    WHEN expiration_date < CURRENT_DATE THEN 'EXPIRED'
    WHEN expiration_date = CURRENT_DATE THEN 'EXPIRES TODAY'
    ELSE 'EXPIRES IN FUTURE'
  END as status,
  estimated_return_value,
  -- Check if matches new cron job logic: expired OR expiring within next 30 days
  CASE 
    WHEN expiration_date < CURRENT_DATE 
      OR expiration_date <= CURRENT_DATE + INTERVAL '30 days'
    THEN 'WILL TRIGGER NOTIFICATION'
    ELSE 'WILL NOT TRIGGER'
  END as cron_action
FROM pharmacy_inventory_items 
WHERE pharmacy_id = '00000000-0000-0000-0000-000000000001'
ORDER BY expiration_date;
