-- ============================================================
-- FIX: Update admin_recent_activity constraint
-- ============================================================
-- This script fixes the check constraint to include 'pharmacy_registered'
-- Run this if you get the constraint violation error
-- ============================================================

-- Drop the existing constraint
ALTER TABLE public.admin_recent_activity 
DROP CONSTRAINT IF EXISTS admin_recent_activity_activity_type_check;

-- Recreate the constraint with all three activity types
ALTER TABLE public.admin_recent_activity 
ADD CONSTRAINT admin_recent_activity_activity_type_check CHECK (
  activity_type::text = ANY (
    ARRAY[
      'document_uploaded'::character varying,
      'product_added'::character varying,
      'pharmacy_registered'::character varying
    ]::text[]
  )
);

-- Verify the constraint was updated
SELECT 
  conname AS constraint_name,
  pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'public.admin_recent_activity'::regclass
AND conname = 'admin_recent_activity_activity_type_check';

