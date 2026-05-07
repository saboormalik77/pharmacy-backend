-- ============================================================
-- Add created_by column to pharmacy table
-- This tracks which admin created each pharmacy, enabling
-- pharmacies to display their creating admin's branding
-- (logo and business name)
-- ============================================================

-- Add created_by column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'pharmacy' AND column_name = 'created_by'
  ) THEN
    ALTER TABLE pharmacy 
    ADD COLUMN created_by UUID REFERENCES admin(id) ON DELETE SET NULL;
    
    COMMENT ON COLUMN pharmacy.created_by IS 'References the admin who created this pharmacy account';
  END IF;
END $$;

-- Create index for better performance when looking up pharmacies by creating admin
CREATE INDEX IF NOT EXISTS idx_pharmacy_created_by ON pharmacy(created_by);

-- Grant permissions
GRANT SELECT ON pharmacy TO service_role;

-- ============================================================
-- IMPORTANT: After running this script, you need to set the
-- created_by value for your existing pharmacies.
--
-- Example:
-- 1. Find your admin ID:
--    SELECT id, email, name FROM admin LIMIT 5;
--
-- 2. Update pharmacy with the admin who created it:
--    UPDATE pharmacy 
--    SET created_by = 'YOUR_ADMIN_ID_HERE'
--    WHERE id = 'YOUR_PHARMACY_ID_HERE';
--
-- 3. Verify:
--    SELECT id, pharmacy_name, email, created_by 
--    FROM pharmacy 
--    WHERE id = 'YOUR_PHARMACY_ID_HERE';
-- ============================================================
