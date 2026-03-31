-- Migration: Ensure all existing return policies have partials_accepted = false
-- This makes existing policies apply only to full (non-partial) returns.
-- Partial-specific policies will be added separately via the admin UI.

UPDATE manufacturer_return_policies
SET partials_accepted = false
WHERE partials_accepted = true;
