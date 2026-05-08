-- ============================================================================
-- FIX: pharmacy_notifications has BOTH 'notification_type' AND 'type' columns
-- The RPC inserts into 'type' but 'notification_type' has NOT NULL constraint,
-- causing the insert to fail.
--
-- Strategy:
--   1. If both columns exist → drop 'notification_type' (code uses 'type')
--   2. If only 'notification_type' exists → rename it to 'type'
--   3. If only 'type' exists → do nothing
--   4. If neither exists → add 'type' column
-- ============================================================================

DO $$
DECLARE
    has_notification_type BOOLEAN;
    has_type              BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name   = 'pharmacy_notifications'
          AND column_name  = 'notification_type'
    ) INTO has_notification_type;

    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name   = 'pharmacy_notifications'
          AND column_name  = 'type'
    ) INTO has_type;

    IF has_notification_type AND has_type THEN
        -- Both columns exist. Backfill 'type' from 'notification_type'
        -- where needed, then drop 'notification_type' so it stops blocking inserts.
        UPDATE pharmacy_notifications
           SET type = notification_type
         WHERE (type IS NULL OR type = '')
           AND notification_type IS NOT NULL;

        ALTER TABLE pharmacy_notifications
            DROP COLUMN notification_type;

        RAISE NOTICE 'Dropped redundant notification_type column; kept type column';

    ELSIF has_notification_type AND NOT has_type THEN
        ALTER TABLE pharmacy_notifications
            RENAME COLUMN notification_type TO type;

        RAISE NOTICE 'Renamed notification_type to type';

    ELSIF has_type THEN
        RAISE NOTICE 'type column already exists; nothing to do';

    ELSE
        ALTER TABLE pharmacy_notifications
            ADD COLUMN type TEXT NOT NULL DEFAULT 'general';

        RAISE NOTICE 'Added missing type column';
    END IF;
END $$;

-- Sanity check: show the final column list
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name   = 'pharmacy_notifications'
ORDER BY ordinal_position;
