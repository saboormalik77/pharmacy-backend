-- Add the missing 'type' column to pharmacy_notifications
ALTER TABLE pharmacy_notifications 
ADD COLUMN IF NOT EXISTS type TEXT NOT NULL DEFAULT 'general';

-- Update any existing records to have a default type
UPDATE pharmacy_notifications 
SET type = 'service_request' 
WHERE type IS NULL OR type = '';