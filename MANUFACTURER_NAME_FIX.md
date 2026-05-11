# Manufacturer Name Fix - Always Use Correct API Data

## Problem Statement

Manufacturer names in the `manufacturer_policies` table were incorrect, leading to wrong labeler names in debit memos. The system needs to always use correct manufacturer names from the OpenFDA API instead of manual user input.

## Solution Overview

This fix ensures that:
1. **New manufacturer policies** always get correct names from OpenFDA API
2. **Existing manufacturer policies** can be bulk-updated with correct names
3. **Auto-creation** of policies with correct names when they don't exist
4. **Debit memo creation** uses accurate manufacturer names

## Changes Made

### 1. Service Layer Updates (`src/services/policiesService.ts`)

#### New Helper Function
- `getCorrectManufacturerName(labelerId)` - Fetches real manufacturer name from OpenFDA API

#### Updated Functions
- `createPolicy()` - Always fetches correct name from API before creating
- `bulkImport()` - Uses API names during bulk import
- `ensureManufacturerPolicy()` - Auto-creates policies with correct API names
- `updateAllPoliciesWithApiNames()` - Bulk updates existing policies

### 2. API Routes (`src/routes/policiesRoutes.ts` & `src/controllers/policiesController.ts`)

#### New Endpoints
- `POST /api/admin/policies/update-api-names` - Bulk update existing policies with API names
- `POST /api/admin/policies/ensure` - Ensure policy exists for a labeler_id (auto-create if needed)

### 3. Scripts

#### Database Fix Script
- `scripts/fix_manufacturer_policies_names.sql` - Updates existing data with correct names from scanned items

#### Automation Script  
- `scripts/update_all_manufacturer_names_with_api.js` - Node.js script to bulk update all policies via API

## How It Works

### For New Manufacturer Policies

When creating a new manufacturer policy:

1. **User provides `labelerId`** (required) and optionally `manufacturerName`
2. **System calls OpenFDA API** using the labelerId to get the real manufacturer name
3. **Real name is used** regardless of what the user entered
4. **Policy is created** with the correct manufacturer name from API
5. **Console logging** shows when names are corrected

Example:
```javascript
// User input
{ labelerId: '12345', manufacturerName: 'Wrong Name Inc.' }

// API lookup finds correct name: 'Pfizer Inc.'
// System creates policy with 'Pfizer Inc.' and logs the correction
```

### For Existing Manufacturer Policies

#### Via API Endpoint
```bash
curl -X POST /api/admin/policies/update-api-names \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"limit": 50}'
```

#### Via Script
```bash
# Dry run first
ADMIN_TOKEN=your_token node scripts/update_all_manufacturer_names_with_api.js --dry-run

# Actually update
ADMIN_TOKEN=your_token node scripts/update_all_manufacturer_names_with_api.js --limit=50
```

### For Auto-Creation During Processing

When the system encounters a new labeler_id without a policy:

```javascript
// Automatically called during verification/debit memo creation
const policyId = await ensureManufacturerPolicy('12345');
// Creates policy with correct API name if it doesn't exist
```

## Usage Examples

### 1. Create New Policy (Frontend/API)
```javascript
// Old way - might use wrong name
POST /api/admin/policies
{
  "labelerId": "12345",
  "manufacturerName": "User Entered Wrong Name"
}

// New way - automatically corrected
POST /api/admin/policies  
{
  "labelerId": "12345",
  "manufacturerName": "User Input" // System will override with API name
}
// Result: Policy created with correct "Pfizer Inc." from API
```

### 2. Bulk Import with Corrections
```javascript
POST /api/admin/policies/bulk-import
{
  "rows": [
    { "labelerId": "12345", "manufacturerName": "Wrong Name" },
    { "labelerId": "67890", "manufacturerName": "Also Wrong" }
  ]
}
// System fetches correct names for both from API
```

### 3. Fix Existing Data
```bash
# Update 50 policies at a time with correct API names
curl -X POST /api/admin/policies/update-api-names \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"limit": 50}'
```

### 4. Auto-Create Missing Policies
```javascript
POST /api/admin/policies/ensure
{
  "labelerId": "99999"  
}
// Creates new policy with correct API name if it doesn't exist
```

## Database Schema

No schema changes required. The existing `manufacturer_policies` table is used:

```sql
-- manufacturer_policies table
labeler_id VARCHAR(10)      -- First 5 digits of NDC  
manufacturer_name TEXT      -- Now always correct from API
created_at TIMESTAMPTZ
updated_at TIMESTAMPTZ      -- Updated when API name is corrected
```

## Logging & Monitoring

The system provides detailed logging:

```javascript
// When creating policies
console.log(`Creating policy for labeler ${labelerId} - fetching correct manufacturer name from API...`);
console.log(`Corrected manufacturer name for ${labelerId}: "${userInput}" → "${apiName}"`);

// When bulk updating
console.log(`Updating manufacturer name for ${labelerId}: "${oldName}" → "${newName}"`);

// When auto-creating
console.log(`Auto-creating manufacturer policy for ${labelerId} with name: "${apiName}"`);
```

## Error Handling

- **API lookup fails**: Falls back to user input, logs error
- **No API data found**: Uses user input or `"Unknown Manufacturer (labelerId)"`
- **Batch processing**: Continues with other records if one fails
- **Rate limiting**: Built-in delays between API calls

## Benefits

1. **Data Accuracy**: All manufacturer names come from authoritative OpenFDA API
2. **Automatic Correction**: User input mistakes are automatically fixed
3. **Consistency**: Same manufacturer always has the same name across all records
4. **Debit Memo Accuracy**: PDFs show correct manufacturer names
5. **Future-Proof**: All new policies automatically get correct names
6. **Retroactive Fixes**: Existing data can be bulk-corrected

## Implementation Steps

1. **Deploy the code changes** (service, controller, routes)
2. **Run the database fix script** to correct existing data from scanned items
3. **Run the API update script** to correct all policies with OpenFDA data
4. **Monitor logs** for any issues during normal operation
5. **Set up periodic updates** if needed (optional)

## Maintenance

### Periodic Updates (Optional)
You can set up a cron job to periodically update manufacturer names:

```bash
# Daily at 2 AM
0 2 * * * ADMIN_TOKEN=token node /path/to/scripts/update_all_manufacturer_names_with_api.js --limit=100
```

### Manual Updates
Admins can trigger updates via the API endpoint at any time.

### Monitoring
Watch the application logs for manufacturer name corrections and API lookup failures.

## Testing

### Test New Policy Creation
1. Create a policy with a known labeler_id
2. Verify the manufacturer name matches OpenFDA data
3. Check logs for correction messages

### Test Bulk Update
1. Run the update endpoint with a small limit
2. Verify policies are updated with correct names
3. Check the response for success/error counts

### Test Auto-Creation
1. Trigger processing for a labeler_id without a policy
2. Verify policy is auto-created with correct API name
3. Check that debit memos use the correct name

This comprehensive fix ensures that all manufacturer names in the system are accurate and come from the authoritative OpenFDA API source.