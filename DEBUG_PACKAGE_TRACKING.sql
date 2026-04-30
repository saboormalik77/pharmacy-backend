-- Debug script to check what happened with package tracking data
-- Run this in your Supabase SQL Editor to see the actual database state

-- Check the current state of the return transaction
SELECT 
    id,
    license_plate,
    status,
    fedex_tracking,
    fedex_shipment_id,
    package_tracking,
    fedex_labels,
    box_count,
    prp_number
FROM return_transactions 
WHERE id = 'a17d087d-134a-4f32-ad97-e895f04bdd7c';

-- Check what the _rt_to_json function returns
SELECT _rt_to_json(rt.*) 
FROM return_transactions rt 
WHERE id = 'a17d087d-134a-4f32-ad97-e895f04bdd7c';

-- Manually add package tracking data if it's missing
-- (This will help test if the display logic works)
DO $$ 
BEGIN
    UPDATE return_transactions 
    SET 
        package_tracking = '{"package1": "794810562865"}'::jsonb,
        fedex_labels = '{"package1": "label_data_placeholder"}'::jsonb
    WHERE id = 'a17d087d-134a-4f32-ad97-e895f04bdd7c'
    AND (package_tracking IS NULL OR jsonb_typeof(package_tracking) = 'null');
    
    RAISE NOTICE 'Updated package tracking data for testing';
END $$;

-- Verify the update
SELECT 
    id,
    license_plate,
    package_tracking,
    fedex_labels
FROM return_transactions 
WHERE id = 'a17d087d-134a-4f32-ad97-e895f04bdd7c';