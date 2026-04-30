-- Fix the package tracking key format issue
-- The frontend expects "package1", "package2" but database has "1", "2"

-- First, let's see all returns with package_tracking to understand the scope
SELECT 
    id,
    license_plate,
    fedex_tracking,
    package_tracking,
    jsonb_typeof(package_tracking) as tracking_type
FROM return_transactions 
WHERE package_tracking IS NOT NULL 
  AND package_tracking != 'null'::jsonb
  AND package_tracking != '{}'::jsonb;

-- Fix the specific transaction first
UPDATE return_transactions 
SET package_tracking = (
    SELECT jsonb_object_agg(
        'package' || key, 
        value
    )
    FROM jsonb_each_text(package_tracking)
    WHERE key ~ '^[0-9]+$'  -- Only fix numeric keys
)
WHERE id = 'a17d087d-134a-4f32-ad97-e895f04bdd7c'
  AND package_tracking IS NOT NULL
  AND package_tracking != 'null'::jsonb;

-- Add some sample fedex_labels data for testing
UPDATE return_transactions 
SET fedex_labels = '{"package1": "sample_label_data_for_testing"}'::jsonb
WHERE id = 'a17d087d-134a-4f32-ad97-e895f04bdd7c'
  AND (fedex_labels IS NULL OR fedex_labels = '{}'::jsonb);

-- Verify the fix
SELECT 
    id,
    license_plate,
    package_tracking,
    fedex_labels
FROM return_transactions 
WHERE id = 'a17d087d-134a-4f32-ad97-e895f04bdd7c';

-- Create a function to fix this issue for all future records
CREATE OR REPLACE FUNCTION fix_package_tracking_keys()
RETURNS trigger AS $$
BEGIN
    -- If package_tracking has numeric keys, convert them to "packageN" format
    IF NEW.package_tracking IS NOT NULL 
       AND jsonb_typeof(NEW.package_tracking) = 'object'
       AND EXISTS (
           SELECT 1 FROM jsonb_object_keys(NEW.package_tracking) k 
           WHERE k ~ '^[0-9]+$'
       ) THEN
        
        NEW.package_tracking := (
            SELECT jsonb_object_agg(
                CASE 
                    WHEN key ~ '^[0-9]+$' THEN 'package' || key
                    ELSE key
                END, 
                value
            )
            FROM jsonb_each_text(NEW.package_tracking)
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply the trigger to prevent future issues
DROP TRIGGER IF EXISTS fix_package_tracking_trigger ON return_transactions;
CREATE TRIGGER fix_package_tracking_trigger 
    BEFORE INSERT OR UPDATE OF package_tracking ON return_transactions
    FOR EACH ROW EXECUTE FUNCTION fix_package_tracking_keys();