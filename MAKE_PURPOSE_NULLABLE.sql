-- ============================================================================
-- SERVICE REQUESTS: Make Purpose Field Optional (Nullable)
-- ============================================================================
-- This migration only changes the service_requests table (nullable purpose +
-- check constraint). It does NOT define create_service_request: a second
-- overload would make GRANT / COMMENT fail with "function name is not unique"
-- if scripts/dedupe_create_service_request_overloads.sql is already applied.
--
-- After this, ensure a single RPC exists — run:
--   scripts/dedupe_create_service_request_overloads.sql
-- (matches src/services/serviceRequestService.ts: optional purpose + 6th arg user id.)
--
-- Execute with: npx supabase db query --linked < MAKE_PURPOSE_NULLABLE.sql
-- ============================================================================

-- Make purpose field nullable by removing NOT NULL constraint
ALTER TABLE service_requests
ALTER COLUMN purpose DROP NOT NULL;

-- Update the check constraint to allow null values
ALTER TABLE service_requests
DROP CONSTRAINT IF EXISTS service_requests_purpose_check;

ALTER TABLE service_requests
ADD CONSTRAINT service_requests_purpose_check
CHECK (
    purpose IS NULL
    OR purpose IN (
        'return_pickup',
        'training',
        'inventory_review',
        'destruction_pickup',
        'other'
    )
);

COMMENT ON COLUMN service_requests.purpose IS 'Purpose of the service request — optional when nullable';
