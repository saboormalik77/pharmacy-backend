# Pharmacy Schema and Settings API Update Summary

## Overview
This document summarizes the updates made to the pharmacy table schema and the pharmacy settings API to include missing fields required by the admin pharmacies page.

---

## 🗄️ Updated Pharmacy Table Schema

### New Columns Added

| Column Name | Type | Description | Default |
|------------|------|-------------|---------|
| `state_license_number` | VARCHAR(100) | State pharmacy license number (e.g., NY-12345, CA-67890) | NULL |
| `license_expiry_date` | DATE | Expiration date of the pharmacy license | NULL |
| `contact_phone` | VARCHAR(20) | Alternative contact phone number | NULL |
| `physical_address` | JSONB | Physical address `{street, city, state, zip}` | NULL |
| `billing_address` | JSONB | Billing address `{street, city, state, zip}` | NULL |
| `status` | VARCHAR(20) | Account status | `'pending'` |
| `subscription_tier` | VARCHAR(20) | Subscription plan | `'free'` |
| `subscription_status` | VARCHAR(20) | Subscription status | `'trial'` |
| `trial_ends_at` | TIMESTAMP WITH TIME ZONE | Trial expiration date | NULL |

### Status Values
- `pending` - Awaiting approval
- `active` - Fully active and can access all features
- `suspended` - Temporarily blocked from access
- `blacklisted` - Permanently blocked from access

### Subscription Tier Values
- `free` - Free tier
- `basic` - Basic subscription
- `premium` - Premium subscription
- `enterprise` - Enterprise subscription

### Subscription Status Values
- `active` - Subscription is active
- `trial` - In trial period
- `expired` - Subscription expired
- `cancelled` - Subscription cancelled
- `past_due` - Payment overdue

---

## 📝 Complete Pharmacy Table Structure

```sql
CREATE TABLE IF NOT EXISTS pharmacy (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  pharmacy_name VARCHAR(255) NOT NULL,
  npi_number VARCHAR(50),
  dea_number VARCHAR(50),
  phone VARCHAR(20),
  contact_phone VARCHAR(20),
  physical_address JSONB,
  billing_address JSONB,
  state_license_number VARCHAR(100),
  license_expiry_date DATE,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'suspended', 'blacklisted')),
  subscription_tier VARCHAR(20) DEFAULT 'free' CHECK (subscription_tier IN ('free', 'basic', 'premium', 'enterprise')),
  subscription_status VARCHAR(20) DEFAULT 'trial' CHECK (subscription_status IN ('active', 'trial', 'expired', 'cancelled', 'past_due')),
  trial_ends_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

---

## 🔄 Updated APIs

### 1. Pharmacy Settings API (GET/PATCH `/api/settings`)

**New Fields in Response:**
```json
{
  "id": "uuid",
  "email": "pharmacy@example.com",
  "name": "John Doe",
  "pharmacy_name": "ABC Pharmacy",
  "npi_number": "1234567890",
  "dea_number": "AB1234567",
  "phone": "(555) 123-4567",
  "contact_phone": "(555) 987-6543",
  "state_license_number": "NY-12345",
  "license_expiry_date": "2025-12-31",
  "physical_address": {
    "street": "123 Main St",
    "city": "New York",
    "state": "NY",
    "zip": "10001"
  },
  "billing_address": {
    "street": "123 Main St",
    "city": "New York",
    "state": "NY",
    "zip": "10001"
  },
  "status": "active",
  "subscription_tier": "premium",
  "subscription_status": "active",
  "trial_ends_at": "2025-01-15T00:00:00Z",
  "created_at": "2024-12-01T00:00:00Z",
  "updated_at": "2024-12-19T00:00:00Z"
}
```

**New Fields You Can Update:**
```json
{
  "state_license_number": "CA-67890",
  "license_expiry_date": "2026-06-30",
  "physical_address": {
    "street": "456 Oak Ave",
    "city": "Los Angeles",
    "state": "CA",
    "zip": "90001"
  },
  "billing_address": {
    "street": "456 Oak Ave",
    "city": "Los Angeles",
    "state": "CA",
    "zip": "90001"
  }
}
```

### 2. Admin Pharmacies API

**Updated RPC Functions:**

#### `get_admin_pharmacies_list`
- Now uses `state_license_number` as primary license identifier
- Falls back to `npi_number` or `dea_number` if state license is not set

#### `get_admin_pharmacy_by_id`
- Returns `stateLicenseNumber` (the new dedicated field)
- Returns `licenseExpiryDate`
- Returns `licenseNumber` (computed from state_license_number, npi_number, or dea_number)
- Returns `npiNumber` separately
- Returns `deaNumber` separately

#### `update_admin_pharmacy`
- Can update `licenseNumber` → maps to `state_license_number`
- Can update `stateLicenseNumber` directly
- Can update `licenseExpiryDate`
- Can update `npiNumber` separately
- Can update `deaNumber` separately

**Example Update Request:**
```json
{
  "businessName": "Updated Pharmacy Name",
  "owner": "Jane Smith",
  "email": "jane@pharmacy.com",
  "phone": "(555) 111-2222",
  "address": "789 Elm St",
  "city": "Chicago",
  "state": "IL",
  "zipCode": "60601",
  "stateLicenseNumber": "IL-24680",
  "licenseExpiryDate": "2026-12-31",
  "npiNumber": "9876543210",
  "deaNumber": "CD9876543"
}
```

---

## 📋 SQL Scripts to Run

### 1. Update Pharmacy Schema (Primary Script)
**File:** `scripts/update_pharmacy_schema.sql`

Run this script in Supabase SQL Editor to add all missing columns:

```bash
# This script safely adds all missing columns using DO blocks
# It checks if columns exist before adding them
# Safe to run multiple times
```

### 2. Update Admin Pharmacies RPC Functions
**File:** `scripts/rpcFunctions/admin_pharmacies_functions.sql`

This script has been updated to:
- Add license columns (included in DDL section)
- Return license fields in queries
- Support updating license fields

Run this script to update the RPC functions:

```bash
# This will recreate all admin pharmacy RPC functions
# With support for the new license fields
```

---

## 🧪 Testing the Updates

### Test 1: Update Pharmacy Settings (as Pharmacy User)

```bash
curl -X PATCH 'http://localhost:3000/api/settings' \
  -H 'Authorization: Bearer PHARMACY_TOKEN' \
  -H 'Content-Type: application/json' \
  -d '{
    "state_license_number": "NY-12345",
    "license_expiry_date": "2025-12-31",
    "physical_address": {
      "street": "123 Main St",
      "city": "New York",
      "state": "NY",
      "zip": "10001"
    }
  }'
```

### Test 2: Get Pharmacy Settings (as Pharmacy User)

```bash
curl -X GET 'http://localhost:3000/api/settings' \
  -H 'Authorization: Bearer PHARMACY_TOKEN'
```

### Test 3: Update Pharmacy (as Admin)

```bash
curl -X PUT 'http://localhost:3000/api/admin/pharmacies/PHARMACY_ID' \
  -H 'Authorization: Bearer ADMIN_TOKEN' \
  -H 'Content-Type: application/json' \
  -d '{
    "businessName": "Updated Pharmacy",
    "stateLicenseNumber": "CA-67890",
    "licenseExpiryDate": "2026-06-30",
    "npiNumber": "1234567890",
    "deaNumber": "AB1234567"
  }'
```

### Test 4: Get Pharmacy Details (as Admin)

```bash
curl -X GET 'http://localhost:3000/api/admin/pharmacies/PHARMACY_ID' \
  -H 'Authorization: Bearer ADMIN_TOKEN'
```

---

## 📊 Field Mapping Summary

### Frontend → Database Mapping

| Frontend Field | Database Column | Notes |
|---------------|-----------------|-------|
| `businessName` | `pharmacy_name` | Business/pharmacy name |
| `owner` | `name` | Owner/contact person name |
| `licenseNumber` | `state_license_number` | Primary license field (NEW) |
| `licenseExpiryDate` | `license_expiry_date` | License expiration (NEW) |
| `npiNumber` | `npi_number` | National Provider Identifier |
| `deaNumber` | `dea_number` | DEA registration number |
| `address` | `physical_address->>'street'` | Extracted from JSONB |
| `city` | `physical_address->>'city'` | Extracted from JSONB |
| `state` | `physical_address->>'state'` | Extracted from JSONB |
| `zipCode` | `physical_address->>'zip'` | Extracted from JSONB |

### Address Structure (JSONB)

Both `physical_address` and `billing_address` use this structure:

```json
{
  "street": "123 Main St, Suite 100",
  "city": "New York",
  "state": "NY",
  "zip": "10001"
}
```

---

## ✅ Implementation Checklist

- [x] Created `update_pharmacy_schema.sql` with DDL for all missing columns
- [x] Updated `settingsService.ts` to include new license fields
- [x] Updated `settingsController.ts` Swagger docs
- [x] Updated `admin_pharmacies_functions.sql` to add columns and handle license fields
- [x] Updated `adminPharmaciesService.ts` TypeScript interfaces
- [x] Updated all RPC functions to return license fields
- [x] Updated all RPC functions to support updating license fields
- [x] Tested server restart - no errors

---

## 🚀 Next Steps

1. **Run the SQL scripts in Supabase:**
   - Run `scripts/update_pharmacy_schema.sql`
   - Run `scripts/rpcFunctions/admin_pharmacies_functions.sql`

2. **Test the updated APIs:**
   - Test pharmacy settings GET/PATCH endpoints
   - Test admin pharmacies endpoints with license fields
   - Verify data persistence in Supabase

3. **Update Frontend (if needed):**
   - Ensure frontend forms include license fields
   - Update validation for license expiry dates
   - Test the complete flow from frontend to backend

---

## 📝 Notes

- All schema updates are **safe to run multiple times** (idempotent)
- Missing columns are checked before being added
- Existing data will not be affected
- Default values are set for new columns
- All changes are backward compatible

---

## 🔒 Security Considerations

1. **License Numbers:** Store state license numbers separately from NPI/DEA for clarity
2. **Date Validation:** License expiry dates should be validated on the frontend
3. **Status Checks:** Pharmacy status is checked at login, middleware, and RPC level
4. **Admin Access:** Only admins can view/update other pharmacies' license information
5. **Pharmacy Access:** Pharmacies can only view/update their own license information

---

*Generated: December 19, 2024*
*Backend Version: 1.0.0*

