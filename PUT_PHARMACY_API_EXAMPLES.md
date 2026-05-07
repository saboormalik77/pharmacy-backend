# PUT /api/admin/pharmacies/{id} - Updated API Examples

## Overview
The PUT endpoint now accepts payload in the required format based on our Supabase schema. It supports all pharmacy fields including license information, addresses, and subscription details.

---

## 🎯 Supported Fields

### Basic Information
- `businessName` → `pharmacy_name`
- `owner` → `name`
- `email` → `email`
- `phone` → `phone`

### License Information
- `licenseNumber` → `state_license_number` (legacy field)
- `stateLicenseNumber` → `state_license_number` (preferred)
- `licenseExpiryDate` → `license_expiry_date` (YYYY-MM-DD format)
- `npiNumber` → `npi_number`
- `deaNumber` → `dea_number`

### Address Information (Two Formats Supported)

#### Format 1: Individual Fields (Backward Compatible)
- `address` → `physical_address.street`
- `city` → `physical_address.city`
- `state` → `physical_address.state`
- `zipCode` → `physical_address.zip`

#### Format 2: JSONB Objects (Preferred)
- `physicalAddress` → `physical_address` (JSONB)
- `billingAddress` → `billing_address` (JSONB)

### Subscription Information
- `subscriptionTier` → `subscription_tier`
- `subscriptionStatus` → `subscription_status`

---

## 📝 Example Payloads

### Example 1: Basic Update (Legacy Format)
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
  "licenseNumber": "IL-24680"
}
```

### Example 2: Complete Update with New Fields
```json
{
  "businessName": "HealthFirst Pharmacy Plus",
  "owner": "Dr. John Smith",
  "email": "john@healthfirstplus.com",
  "phone": "(555) 123-4567",
  "stateLicenseNumber": "NY-12345",
  "licenseExpiryDate": "2025-12-31",
  "npiNumber": "1234567890",
  "deaNumber": "AB1234567",
  "physicalAddress": {
    "street": "123 Main St, Suite 100",
    "city": "New York",
    "state": "NY",
    "zip": "10001"
  },
  "billingAddress": {
    "street": "456 Billing Ave",
    "city": "New York",
    "state": "NY",
    "zip": "10002"
  },
  "subscriptionTier": "premium",
  "subscriptionStatus": "active"
}
```

### Example 3: License Information Only
```json
{
  "stateLicenseNumber": "CA-67890",
  "licenseExpiryDate": "2026-06-30",
  "npiNumber": "9876543210",
  "deaNumber": "CD9876543"
}
```

### Example 4: Address Update Only (JSONB Format)
```json
{
  "physicalAddress": {
    "street": "999 New Location Blvd",
    "city": "Los Angeles",
    "state": "CA",
    "zip": "90210"
  },
  "billingAddress": {
    "street": "888 Billing Center Dr",
    "city": "Los Angeles",
    "state": "CA",
    "zip": "90211"
  }
}
```

### Example 5: Subscription Update Only
```json
{
  "subscriptionTier": "enterprise",
  "subscriptionStatus": "active"
}
```

---

## 🧪 Test Commands

### Test 1: Complete Update
```bash
curl -X PUT 'http://localhost:3000/api/admin/pharmacies/PHARMACY_ID' \
  -H 'Authorization: Bearer ADMIN_TOKEN' \
  -H 'Content-Type: application/json' \
  -d '{
    "businessName": "HealthFirst Pharmacy Plus",
    "owner": "Dr. John Smith",
    "email": "john@healthfirstplus.com",
    "phone": "(555) 123-4567",
    "stateLicenseNumber": "NY-12345",
    "licenseExpiryDate": "2025-12-31",
    "npiNumber": "1234567890",
    "deaNumber": "AB1234567",
    "physicalAddress": {
      "street": "123 Main St, Suite 100",
      "city": "New York",
      "state": "NY",
      "zip": "10001"
    },
    "billingAddress": {
      "street": "456 Billing Ave",
      "city": "New York",
      "state": "NY",
      "zip": "10002"
    },
    "subscriptionTier": "premium",
    "subscriptionStatus": "active"
  }'
```

### Test 2: License Update Only
```bash
curl -X PUT 'http://localhost:3000/api/admin/pharmacies/PHARMACY_ID' \
  -H 'Authorization: Bearer ADMIN_TOKEN' \
  -H 'Content-Type: application/json' \
  -d '{
    "stateLicenseNumber": "TX-98765",
    "licenseExpiryDate": "2026-03-15",
    "npiNumber": "5555666677",
    "deaNumber": "EF5555666"
  }'
```

### Test 3: Address Update (Legacy Format)
```bash
curl -X PUT 'http://localhost:3000/api/admin/pharmacies/PHARMACY_ID' \
  -H 'Authorization: Bearer ADMIN_TOKEN' \
  -H 'Content-Type: application/json' \
  -d '{
    "address": "789 New Street",
    "city": "Houston",
    "state": "TX",
    "zipCode": "77001"
  }'
```

### Test 4: Subscription Update
```bash
curl -X PUT 'http://localhost:3000/api/admin/pharmacies/PHARMACY_ID' \
  -H 'Authorization: Bearer ADMIN_TOKEN' \
  -H 'Content-Type: application/json' \
  -d '{
    "subscriptionTier": "enterprise",
    "subscriptionStatus": "active"
  }'
```

---

## ✅ Validation Rules

### License Expiry Date
- **Format**: `YYYY-MM-DD`
- **Example**: `"2025-12-31"`
- **Invalid**: `"12/31/2025"`, `"2025-13-01"`

### Subscription Tier
- **Valid Values**: `free`, `basic`, `premium`, `enterprise`
- **Case Sensitive**: Must be lowercase

### Subscription Status
- **Valid Values**: `active`, `trial`, `expired`, `cancelled`, `past_due`
- **Case Sensitive**: Must be lowercase

### Address Objects (JSONB)
```json
{
  "street": "string (required)",
  "city": "string (required)", 
  "state": "string (required)",
  "zip": "string (required)"
}
```

---

## 📊 Response Format

### Success Response (200)
```json
{
  "status": "success",
  "message": "Pharmacy updated successfully",
  "data": {
    "pharmacy": {
      "id": "uuid",
      "businessName": "Updated Name",
      "owner": "Updated Owner",
      "email": "updated@email.com",
      "phone": "(555) 123-4567",
      "city": "New York",
      "state": "NY",
      "status": "active",
      "address": "123 Main St",
      "zipCode": "10001",
      "licenseNumber": "NY-12345",
      "stateLicenseNumber": "NY-12345",
      "licenseExpiryDate": "2025-12-31",
      "npiNumber": "1234567890",
      "deaNumber": "AB1234567",
      "totalReturns": 45,
      "totalReturnsValue": 12500.00,
      "physicalAddress": {
        "street": "123 Main St, Suite 100",
        "city": "New York",
        "state": "NY",
        "zip": "10001"
      },
      "billingAddress": {
        "street": "456 Billing Ave",
        "city": "New York",
        "state": "NY",
        "zip": "10002"
      },
      "subscriptionTier": "premium",
      "subscriptionStatus": "active",
      "createdAt": "2024-12-01T00:00:00Z",
      "updatedAt": "2024-12-19T12:00:00Z"
    },
    "generatedAt": "2024-12-19T12:00:00Z"
  }
}
```

### Error Responses

#### 400 - Invalid Fields
```json
{
  "status": "fail",
  "message": "No valid fields to update. Allowed fields: businessName, owner, email, phone, address, city, state, zipCode, licenseNumber, stateLicenseNumber, licenseExpiryDate, npiNumber, deaNumber, physicalAddress, billingAddress, subscriptionTier, subscriptionStatus"
}
```

#### 400 - Invalid Subscription Tier
```json
{
  "status": "fail",
  "message": "Invalid subscription tier. Must be one of: free, basic, premium, enterprise"
}
```

#### 400 - Invalid Date Format
```json
{
  "status": "fail",
  "message": "Invalid license expiry date format. Must be YYYY-MM-DD"
}
```

#### 404 - Pharmacy Not Found
```json
{
  "status": "fail",
  "message": "Pharmacy not found"
}
```

---

## 🔄 Backward Compatibility

The API maintains backward compatibility:

1. **Legacy `licenseNumber`** still works and maps to `state_license_number`
2. **Individual address fields** (`address`, `city`, `state`, `zipCode`) still work
3. **New JSONB format** takes precedence over individual fields when both are provided

---

## 🎯 Key Features

✅ **Complete Schema Support** - All Supabase pharmacy fields supported  
✅ **Flexible Address Formats** - Both individual fields and JSONB objects  
✅ **License Management** - Separate fields for state license, NPI, and DEA  
✅ **Subscription Control** - Full subscription tier and status management  
✅ **Validation** - Comprehensive validation for all fields  
✅ **Backward Compatible** - Legacy field names still work  
✅ **Partial Updates** - Only provided fields are updated  

---

*Updated: December 19, 2024*  
*API Version: 1.0.0*
