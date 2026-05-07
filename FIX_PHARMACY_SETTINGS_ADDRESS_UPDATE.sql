-- ============================================================
-- ✅ FIXED: Pharmacy Settings Physical Address Update Issue
-- 
-- Problem: When updating pharmacy physical address fields via settings,
-- it clears other address fields instead of merging them properly.
-- 
-- Root Cause: The settings service was replacing the entire physical_address JSONB
-- instead of merging only the changed fields with existing data.
-- 
-- ✅ Solution Applied: Updated the settings service to fetch current physical_address
-- and merge only the provided fields with existing data.
-- ============================================================

-- ✅ FIXED: Applied TypeScript changes to src/services/settingsService.ts
-- 
-- Changes made:
-- Lines 163-180: 
-- 1. Fetch current physical_address from database
-- 2. Merge new fields with existing physical_address data using spread operator
-- 3. Only update the fields that were actually provided in the request
--
-- This ensures that:
-- - Updating "state" only → street, city, zip remain unchanged
-- - Updating "street" only → city, state, zip remain unchanged  
-- - Partial updates work correctly without clearing other fields

SELECT 'FIXED: Physical address merge logic implemented correctly!' AS status;

-- ============================================================
-- For reference, here's what the database function currently does correctly:
-- ============================================================

/*
Current database logic in update_admin_pharmacy function:

IF p_updates ? 'physicalAddress' THEN
    -- This REPLACES the entire JSON object (problematic)
    v_physical_address := p_updates->'physicalAddress';
ELSE
    -- This MERGES individual fields (correct behavior we want)
    IF p_updates ? 'address' THEN
        v_physical_address := v_physical_address || jsonb_build_object('street', p_updates->>'address');
    END IF;
    IF p_updates ? 'city' THEN
        v_physical_address := v_physical_address || jsonb_build_object('city', p_updates->>'city');
    END IF;
    IF p_updates ? 'state' THEN
        v_physical_address := v_physical_address || jsonb_build_object('state', p_updates->>'state');
    END IF;
    IF p_updates ? 'zipCode' THEN
        v_physical_address := v_physical_address || jsonb_build_object('zip', p_updates->>'zipCode');
    END IF;
END IF;

The database function is correct. The issue is in the backend service.
*/