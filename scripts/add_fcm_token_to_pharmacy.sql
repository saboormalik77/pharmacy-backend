-- Migration: Add FCM token support for push notifications
-- Created: 2026-02-11
-- Description: Adds FCM token column to pharmacy table for push notification support

-- Add FCM token column to pharmacy table
ALTER TABLE pharmacy ADD COLUMN IF NOT EXISTS fcm_token TEXT;

-- Create index for FCM token lookups
CREATE INDEX IF NOT EXISTS idx_pharmacy_fcm_token ON pharmacy(fcm_token) WHERE fcm_token IS NOT NULL;

