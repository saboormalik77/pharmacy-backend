-- Add new profile fields to pharmacy table for settings page redesign
-- These columns support: Corporate Name, Mailing Address, Store Hours, Document uploads

ALTER TABLE pharmacy ADD COLUMN IF NOT EXISTS corporate_name TEXT;
ALTER TABLE pharmacy ADD COLUMN IF NOT EXISTS mailing_address TEXT;
ALTER TABLE pharmacy ADD COLUMN IF NOT EXISTS store_hours TEXT;
ALTER TABLE pharmacy ADD COLUMN IF NOT EXISTS dea_file_url TEXT;
ALTER TABLE pharmacy ADD COLUMN IF NOT EXISTS license_file_url TEXT;

-- Add comments for documentation
COMMENT ON COLUMN pharmacy.corporate_name IS 'Corporate name if different from pharmacy/facility name';
COMMENT ON COLUMN pharmacy.mailing_address IS 'Mailing address if different from pharmacy physical address';
COMMENT ON COLUMN pharmacy.store_hours IS 'Store operating hours (e.g. M-F 9-7 Sat 10-3)';
COMMENT ON COLUMN pharmacy.dea_file_url IS 'URL to uploaded DEA document in Supabase Storage';
COMMENT ON COLUMN pharmacy.license_file_url IS 'URL to uploaded State Pharmacy License in Supabase Storage';
