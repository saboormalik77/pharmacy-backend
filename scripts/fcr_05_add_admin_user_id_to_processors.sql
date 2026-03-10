-- ============================================================
-- FCR Module 2 — Link processors to admin login accounts
-- Run this in Supabase SQL Editor AFTER fcr_04
-- ============================================================

-- Add admin_user_id column to processors table to link to their admin login
ALTER TABLE processors ADD COLUMN IF NOT EXISTS admin_user_id UUID REFERENCES admin(id) ON DELETE SET NULL;

-- Index for lookup
CREATE INDEX IF NOT EXISTS idx_processors_admin_user_id ON processors(admin_user_id);
