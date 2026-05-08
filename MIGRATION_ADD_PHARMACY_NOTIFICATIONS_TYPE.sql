-- ============================================================================
-- MIGRATION: Add missing 'type' column to pharmacy_notifications table
-- ============================================================================
-- This migration adds the missing 'type' column that is causing errors
-- when service requests are being scheduled by processors.

-- Check if the column already exists before adding it
DO $$ 
BEGIN
    -- Check if the 'type' column exists
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'pharmacy_notifications' 
        AND column_name = 'type'
        AND table_schema = 'public'
    ) THEN
        -- Add the missing 'type' column
        ALTER TABLE pharmacy_notifications 
        ADD COLUMN type TEXT NOT NULL DEFAULT 'general';
        
        RAISE NOTICE 'Added type column to pharmacy_notifications table';
    ELSE
        RAISE NOTICE 'Column type already exists in pharmacy_notifications table';
    END IF;
    
    -- Update any existing records that might have NULL type (if they exist)
    UPDATE pharmacy_notifications 
    SET type = 'general' 
    WHERE type IS NULL OR type = '';
    
    RAISE NOTICE 'Migration completed successfully';
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Migration failed: %', SQLERRM;
        -- Don't re-raise the exception, just log it
END $$;