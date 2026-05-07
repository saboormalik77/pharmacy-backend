# Service Requests Schema Fix

## Issue
The on-site service requests API was failing with:
```
{"status":"fail","message":"column b.business_name does not exist"}
```

## Root Cause
The RPC functions in `sqlTable/service_requests.sql` were trying to access `pharmacy.business_name` and `pharmacy.address` columns that don't exist in the base pharmacy table schema. The actual pharmacy table only has:

- `id`, `email`, `name`, `pharmacy_name`, `npi_number`, `dea_number`, `phone`, `created_at`, `updated_at`

## Fix Applied

### 1. Updated SQL RPC Functions
**File:** `sqlTable/service_requests.sql`

Changed all references from:
- `p.business_name` → `p.name` 
- `b.business_name` → `b.name`
- Removed `p.address` and `b.address` references

**Affected RPC Functions:**
- `list_pharmacy_service_requests`
- `list_processor_service_requests` 
- `list_admin_service_requests`
- `get_service_request_detail`

### 2. Updated Backend Service
**File:** `src/services/serviceRequestService.ts`

Changed pharmacy data queries from:
- `.select('email, business_name, pharmacy_name')` → `.select('email, name, pharmacy_name')`
- `data.business_name || data.pharmacy_name` → `data.name || data.pharmacy_name`

## Deployment Steps

### Option 1: Apply the Patch File
Run this SQL in Supabase SQL Editor:
```bash
# Copy contents of PATCH_SERVICE_REQUESTS_SCHEMA.sql and run in Supabase
```

### Option 2: Re-run the Complete Schema
```bash
# Run the updated sqlTable/service_requests.sql in Supabase SQL Editor
```

## Testing
After applying the fix, the following API endpoint should work:
```
GET /api/on-site-service?page=1&limit=20&pharmacy_id=9c543898-b656-42f6-963a-f82a90d21adc
```

## Column Mapping
The RPC functions now use these pharmacy table columns:

| RPC Field | Actual Column | Description |
|-----------|---------------|-------------|
| `pharmacy_business_name` | `name` | Business/owner name |
| `pharmacy_name` | `pharmacy_name` | Pharmacy display name |
| `pharmacy_email` | `email` | Contact email |
| `pharmacy_phone` | `phone` | Contact phone |

## Impact
- ✅ Pharmacy portal "On-Site Service" page will load correctly
- ✅ Processor portal "Service Requests" will display pharmacy names correctly  
- ✅ Admin portal "Service Requests" will show proper pharmacy information
- ✅ Email notifications will use correct pharmacy names

## Notes
This fix aligns the service request feature with the actual database schema. If `business_name` and `address` columns are added to the pharmacy table in the future, the RPC functions can be updated to use those instead of `name` for better business context.