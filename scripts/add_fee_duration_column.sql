-- ============================================================
-- Add fee_duration column to custom_packages table
-- Stores the fee duration in days (e.g., 30, 60, 90)
-- ============================================================

-- Add fee_duration column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'custom_packages' AND column_name = 'fee_duration'
    ) THEN
        ALTER TABLE custom_packages ADD COLUMN fee_duration INTEGER;
        COMMENT ON COLUMN custom_packages.fee_duration IS 'Fee duration in days (e.g., 30, 60, 90 days)';
    END IF;
END $$;

