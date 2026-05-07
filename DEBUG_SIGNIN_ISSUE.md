# DEBUG: Signin "Failed to create session" Error

## Problem Summary
The signin endpoint at `/api/auth/signin` is returning a 500 error with the message "Failed to create session". This error occurs in the `storeRefreshToken` function when trying to insert into the `refresh_tokens` table.

## Root Cause Analysis

### 1. RLS Policy Issue (Most Likely)
The `refresh_tokens` table has Row Level Security (RLS) enabled but **no policies defined**. This blocks ALL operations, even for the service role.

**Evidence:**
- Table has `ALTER TABLE public.refresh_tokens ENABLE ROW LEVEL SECURITY;`
- No `CREATE POLICY` statements found for this table
- Error occurs at line 97 in authService.ts: `throw new AppError('Failed to create session', 500);`

### 2. Environment Configuration Issue (Secondary)
The service role key might not be properly configured, causing the admin client to fall back to the regular client which is subject to RLS.

## Immediate Fix Steps

### STEP 1: Fix RLS Policies (CRITICAL)
Run the SQL in `SIGNIN_FIX_RLS_POLICIES.sql` in your Supabase Dashboard:

1. Go to your Supabase project dashboard
2. Navigate to SQL Editor  
3. Copy and paste the contents of `SIGNIN_FIX_RLS_POLICIES.sql`
4. Click "Run"

### STEP 2: Verify Environment Variables
Check your `.env.local` file contains:
```
SUPABASE_URL=your_supabase_project_url
SUPABASE_ANON_KEY=your_anon_key  
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

**Important:** The `SUPABASE_SERVICE_ROLE_KEY` is critical - it should be the "service_role" key from your Supabase project settings, NOT the anon key.

### STEP 3: Restart the Backend
After applying the SQL fix:
```bash
# Kill the current backend process
pkill -f "ts-node src/server.ts"

# Restart it
npm run dev
```

## Verification

After applying the fix, test signin again:
```bash
curl -X POST http://localhost:3000/api/auth/signin \
  -H "Content-Type: application/json" \
  -H "x-tenant-domain: localhost" \
  -d '{"email":"saboor.malik772222@gmail.com","password":"Saboor@1"}'
```

## Additional Debugging

If the issue persists, add this temporary logging to `src/services/authService.ts` line 85:

```typescript
console.log('=== DEBUG REFRESH TOKEN STORAGE ===');
console.log('Using supabaseAdmin:', !!supabaseAdmin);
console.log('Service key configured:', !!process.env.SUPABASE_SERVICE_ROLE_KEY);
console.log('Inserting token for pharmacy:', pharmacyId);

const { error } = await db
  .from('refresh_tokens')
  .insert({
    pharmacy_id: pharmacyId,
    token_hash: tokenHash,
    expires_at: expiresAt.toISOString(),
    user_agent: userAgent || null,
    ip_address: ipAddress || null,
  });

console.log('Insert result - error:', error);
console.log('=====================================');
```

## Other Tables to Check

If this doesn't fix it, these tables might have similar RLS issues:
- `pharmacy` table
- Any other tables used during signin

Run this query in Supabase to check all tables with RLS but no policies:
```sql
SELECT t.schemaname, t.tablename, t.rowsecurity,
       COUNT(p.policyname) as policy_count
FROM pg_tables t
LEFT JOIN pg_policies p ON t.tablename = p.tablename
WHERE t.schemaname = 'public' 
  AND t.rowsecurity = true
GROUP BY t.schemaname, t.tablename, t.rowsecurity
HAVING COUNT(p.policyname) = 0;
```