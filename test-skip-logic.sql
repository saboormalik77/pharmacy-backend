-- Test query to see how skip logic works
-- Run this in Supabase SQL Editor to see which items will be processed vs skipped

-- Step 1: Show all inventory items that match expiration criteria
SELECT 
  'INVENTORY ITEMS' as source,
  id,
  ndc_code,
  product_name,
  expiration_date,
  CASE 
    WHEN expiration_date < CURRENT_DATE THEN 'EXPIRED'
    WHEN expiration_date <= CURRENT_DATE + INTERVAL '30 days' THEN 'EXPIRING SOON'
    ELSE 'NOT MATCHING'
  END as match_status,
  status
FROM pharmacy_inventory_items
WHERE status = 'active'
  AND (
    expiration_date < CURRENT_DATE 
    OR expiration_date <= CURRENT_DATE + INTERVAL '30 days'
  )
ORDER BY expiration_date;

-- Step 2: Show which items already have notifications (will be skipped)
SELECT 
  'ALREADY PROCESSED (WILL SKIP)' as source,
  pn.inventory_item_id as id,
  pii.ndc_code,
  pii.product_name,
  pii.expiration_date,
  pn.created_at as notification_created_at,
  pn.status as notification_status
FROM pharmacy_notifications pn
JOIN pharmacy_inventory_items pii ON pii.id = pn.inventory_item_id
WHERE pn.notification_type = 'expiring_product'
  AND pn.inventory_item_id IS NOT NULL
ORDER BY pn.created_at DESC;

-- Step 3: Show which items will be processed (NEW items only)
SELECT 
  'WILL BE PROCESSED (NEW ITEMS)' as source,
  pii.id,
  pii.ndc_code,
  pii.product_name,
  pii.expiration_date,
  CASE 
    WHEN pii.expiration_date < CURRENT_DATE THEN 
      'EXPIRED ' || (CURRENT_DATE - pii.expiration_date) || ' days ago'
    ELSE 
      'EXPIRES IN ' || (pii.expiration_date - CURRENT_DATE) || ' days'
  END as expiration_status
FROM pharmacy_inventory_items pii
WHERE pii.status = 'active'
  AND (
    pii.expiration_date < CURRENT_DATE 
    OR pii.expiration_date <= CURRENT_DATE + INTERVAL '30 days'
  )
  AND pii.id NOT IN (
    SELECT inventory_item_id 
    FROM pharmacy_notifications 
    WHERE notification_type = 'expiring_product'
      AND inventory_item_id IS NOT NULL
  )
ORDER BY pii.expiration_date;

-- Summary
SELECT 
  COUNT(*) FILTER (WHERE pii.status = 'active' 
    AND (pii.expiration_date < CURRENT_DATE 
         OR pii.expiration_date <= CURRENT_DATE + INTERVAL '30 days')) as total_matching_items,
  COUNT(DISTINCT pn.inventory_item_id) FILTER (
    WHERE pn.notification_type = 'expiring_product' 
      AND pn.inventory_item_id IS NOT NULL
  ) as already_processed_items,
  COUNT(*) FILTER (
    WHERE pii.status = 'active' 
      AND (pii.expiration_date < CURRENT_DATE 
           OR pii.expiration_date <= CURRENT_DATE + INTERVAL '30 days')
      AND pii.id NOT IN (
        SELECT inventory_item_id 
        FROM pharmacy_notifications 
        WHERE notification_type = 'expiring_product'
          AND inventory_item_id IS NOT NULL
      )
  ) as new_items_to_process
FROM pharmacy_inventory_items pii
LEFT JOIN pharmacy_notifications pn ON pn.inventory_item_id = pii.id;
