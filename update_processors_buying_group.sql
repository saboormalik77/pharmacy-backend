-- Update all processors to be owned by the specified buying group
-- This sets both the processors.buying_group_id and the corresponding admin.buying_group_id

-- First, update the processors table
UPDATE processors 
SET buying_group_id = '0e2964f2-6765-4671-838a-ebdd08642776';

-- Then, update the corresponding admin login rows for these processors
-- This ensures the processor logins are properly scoped to the buying group
UPDATE admin 
SET buying_group_id = '0e2964f2-6765-4671-838a-ebdd08642776'
WHERE role = 'processor' 
  AND id IN (
    SELECT admin_user_id 
    FROM processors 
    WHERE admin_user_id IS NOT NULL
      AND buying_group_id = '0e2964f2-6765-4671-838a-ebdd08642776'
  );

-- Verification query to check the updates
SELECT 
  p.id as processor_id,
  p.name as processor_name,
  p.email as processor_email,
  p.buying_group_id as processor_bg_id,
  a.id as admin_id,
  a.buying_group_id as admin_bg_id
FROM processors p
LEFT JOIN admin a ON p.admin_user_id = a.id
WHERE p.buying_group_id = '0e2964f2-6765-4671-838a-ebdd08642776'
ORDER BY p.name;