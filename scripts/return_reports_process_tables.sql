-- ============================================================================
-- Return Reports Process API - Required Tables Schema
-- ============================================================================
-- This script creates all tables required for the /api/return-reports/process endpoint
-- Run this in your Supabase SQL Editor
-- ============================================================================

-- ============================================================================
-- 1. PHARMACY TABLE
-- ============================================================================
-- Required: Referenced by uploaded_documents and return_reports
CREATE TABLE IF NOT EXISTS pharmacy (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  pharmacy_name VARCHAR(255) NOT NULL,
  npi_number VARCHAR(50),
  dea_number VARCHAR(50),
  contact_phone VARCHAR(20),
  physical_address JSONB,
  billing_address JSONB,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'suspended')),
  subscription_tier VARCHAR(20) DEFAULT 'free' CHECK (subscription_tier IN ('free', 'basic', 'premium', 'enterprise')),
  subscription_status VARCHAR(20) DEFAULT 'trial' CHECK (subscription_status IN ('active', 'trial', 'expired', 'cancelled', 'past_due')),
  trial_ends_at TIMESTAMP WITH TIME ZONE,
  phone VARCHAR(20),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for pharmacy email lookups
CREATE INDEX IF NOT EXISTS idx_pharmacy_email ON pharmacy(email);

-- ============================================================================
-- 2. REVERSE DISTRIBUTORS TABLE
-- ============================================================================
-- Required: Stores distributor information (created/found during PDF processing)
CREATE TABLE IF NOT EXISTS reverse_distributors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  code VARCHAR(50) UNIQUE NOT NULL,
  contact_email VARCHAR(255),
  contact_phone VARCHAR(20),
  address JSONB,
  portal_url TEXT,
  supported_formats TEXT[],
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for reverse distributor lookups
CREATE INDEX IF NOT EXISTS idx_reverse_distributors_name ON reverse_distributors(name);
CREATE INDEX IF NOT EXISTS idx_reverse_distributors_code ON reverse_distributors(code);
CREATE INDEX IF NOT EXISTS idx_reverse_distributors_active ON reverse_distributors(is_active);

-- ============================================================================
-- 3. UPLOADED DOCUMENTS TABLE
-- ============================================================================
-- Required: Stores document metadata from uploaded PDF files
-- Updated: Includes report_date column for storing extracted report date
CREATE TABLE IF NOT EXISTS uploaded_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pharmacy_id UUID NOT NULL REFERENCES pharmacy(id) ON DELETE CASCADE,
  file_name VARCHAR(500) NOT NULL,
  file_size BIGINT NOT NULL,
  file_type VARCHAR(100),
  file_url TEXT,
  reverse_distributor_id UUID REFERENCES reverse_distributors(id),
  source VARCHAR(50) DEFAULT 'manual_upload' CHECK (source IN ('manual_upload', 'email_forward', 'portal_fetch', 'api')),
  status VARCHAR(50) DEFAULT 'uploading' CHECK (status IN ('uploading', 'processing', 'completed', 'failed', 'needs_review')),
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  processed_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  extracted_items INTEGER DEFAULT 0,
  total_credit_amount DECIMAL(10, 2),
  processing_progress INTEGER DEFAULT 0,
  report_date DATE -- Date of the return report extracted from PDF (YYYY-MM-DD format)
);

-- Indexes for uploaded_documents
CREATE INDEX IF NOT EXISTS idx_uploaded_documents_pharmacy_id ON uploaded_documents(pharmacy_id);
CREATE INDEX IF NOT EXISTS idx_uploaded_documents_reverse_distributor_id ON uploaded_documents(reverse_distributor_id);
CREATE INDEX IF NOT EXISTS idx_uploaded_documents_status ON uploaded_documents(status);
CREATE INDEX IF NOT EXISTS idx_uploaded_documents_report_date ON uploaded_documents(report_date);
CREATE INDEX IF NOT EXISTS idx_uploaded_documents_uploaded_at ON uploaded_documents(uploaded_at);

-- Comment on report_date column
COMMENT ON COLUMN uploaded_documents.report_date IS 'Date of the return report extracted from the PDF (YYYY-MM-DD format)';

-- ============================================================================
-- 4. RETURN REPORTS TABLE
-- ============================================================================
-- Required: Stores individual return report items (one record per item from PDF)
CREATE TABLE IF NOT EXISTS return_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES uploaded_documents(id) ON DELETE CASCADE,
  pharmacy_id UUID NOT NULL REFERENCES pharmacy(id) ON DELETE CASCADE,
  data JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for return_reports
CREATE INDEX IF NOT EXISTS idx_return_reports_document_id ON return_reports(document_id);
CREATE INDEX IF NOT EXISTS idx_return_reports_pharmacy_id ON return_reports(pharmacy_id);
CREATE INDEX IF NOT EXISTS idx_return_reports_created_at ON return_reports(created_at);

-- GIN index for JSONB data queries (for NDC searches)
CREATE INDEX IF NOT EXISTS idx_return_reports_data_gin ON return_reports USING GIN (data);

-- ============================================================================
-- TABLE COMMENTS
-- ============================================================================
COMMENT ON TABLE pharmacy IS 'Stores pharmacy user information linked to Supabase Auth users';
COMMENT ON TABLE reverse_distributors IS 'Stores reverse distributor company information';
COMMENT ON TABLE uploaded_documents IS 'Stores metadata for uploaded return report PDF documents';
COMMENT ON TABLE return_reports IS 'Stores individual return report items extracted from PDFs (one record per item)';

-- ============================================================================
-- VERIFICATION QUERIES (Optional - run to verify tables were created)
-- ============================================================================
-- SELECT table_name, column_name, data_type 
-- FROM information_schema.columns 
-- WHERE table_schema = 'public' 
--   AND table_name IN ('pharmacy', 'reverse_distributors', 'uploaded_documents', 'return_reports')
-- ORDER BY table_name, ordinal_position;

