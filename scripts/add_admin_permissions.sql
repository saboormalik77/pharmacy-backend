-- Add granular permissions column to admin table
-- Stores a JSON array of permission keys, e.g. ["pharmacies","warehouse","destruction"]
-- For super_admin role this column is ignored (they always have full access).

ALTER TABLE public.admin
  ADD COLUMN IF NOT EXISTS permissions JSONB DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.admin.permissions IS 'JSON array of permission keys granted to this admin. Ignored for super_admin role (full access).';
