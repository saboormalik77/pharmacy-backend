-- Cleanup script to remove all versions of admin pharmacy functions
-- Run this BEFORE running the admin_pharmacies_functions.sql file

-- Drop all variations of get_admin_pharmacies_list
DROP FUNCTION IF EXISTS get_admin_pharmacies_list(TEXT, TEXT, INTEGER, INTEGER) CASCADE;
DROP FUNCTION IF EXISTS get_admin_pharmacies_list(TEXT, TEXT, INTEGER, INTEGER, UUID) CASCADE;
DROP FUNCTION IF EXISTS get_admin_pharmacies_list(UUID, INTEGER, INTEGER, TEXT, TEXT) CASCADE;
DROP FUNCTION IF EXISTS get_admin_pharmacies_list() CASCADE;

-- Drop all variations of get_admin_pharmacy_by_id
DROP FUNCTION IF EXISTS get_admin_pharmacy_by_id(UUID) CASCADE;
DROP FUNCTION IF EXISTS get_admin_pharmacy_by_id(UUID, UUID) CASCADE;

-- Drop all variations of update_admin_pharmacy
DROP FUNCTION IF EXISTS update_admin_pharmacy(UUID, JSONB) CASCADE;
DROP FUNCTION IF EXISTS update_admin_pharmacy(UUID, JSONB, UUID) CASCADE;

-- Drop all variations of update_admin_pharmacy_status
DROP FUNCTION IF EXISTS update_admin_pharmacy_status(UUID, TEXT) CASCADE;
DROP FUNCTION IF EXISTS update_admin_pharmacy_status(UUID, TEXT, UUID) CASCADE;

-- Show remaining functions (for verification)
SELECT 
  routine_name, 
  string_agg(parameter_name || ' ' || p.data_type, ', ' ORDER BY ordinal_position) as parameters
FROM information_schema.routines r
LEFT JOIN information_schema.parameters p ON r.specific_name = p.specific_name
WHERE routine_name LIKE '%admin_pharmac%'
  AND r.routine_schema = 'public'
GROUP BY routine_name, r.specific_name
ORDER BY routine_name;