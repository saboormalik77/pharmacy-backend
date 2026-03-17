# Pharmacy Signup System - Deployment Guide

## Overview
This system allows admins to create pharmacy accounts via an invite-based flow. The pharmacy receives an email with a setup link to complete their account.

## Key Changes Made
- **Fixed Foreign Key Issue**: Instead of creating pharmacy records immediately, we store all data in `pharmacy_invites` table until setup completion
- **Invite-Based Flow**: Admin creates invite → Email sent → Pharmacy completes setup → Account activated

## Deployment Steps

### 1. Run SQL Migration
Execute the updated SQL script in your Supabase SQL editor:
```sql
-- Run this file: scripts/fcr_23_admin_create_pharmacy.sql
```

### 2. Deploy Edge Function
```bash
# Deploy the email function
npx supabase functions deploy send-pharmacy-invite --no-verify-jwt

# Set required secrets (same as your existing send-email function)
npx supabase secrets set \
  SMTP_HOST=smtp.gmail.com \
  SMTP_PORT=587 \
  SMTP_USER=saboor@hivve.org \
  SMTP_PASS=your-app-password \
  SMTP_FROM_EMAIL=saboor@hivve.org \
  SMTP_FROM_NAME=PharmAdmin \
  PHARMACY_PORTAL_URL=http://localhost:3002
```

### 3. Environment Variables
Ensure `.env.local` has:
```env
PHARMACY_PORTAL_URL=http://localhost:3002
```

## Testing the Flow

### 1. Admin Creates Pharmacy
1. Go to **Admin Panel** → **Pharmacies**
2. Click **"Add Pharmacy"**
3. Fill in the form with all required fields:
   - Store Name (required)
   - Email (required)
   - Contact info, address, wholesaler details, etc.
4. Click **"Create & Send Invite"**

### 2. Email Invitation
- Check the email inbox for the invitation
- Email contains a "Complete Account Setup" button
- Link format: `http://localhost:3002/setup-account?token=<invite_token>`

### 3. Pharmacy Setup
1. Click the link in the email
2. Pharmacy sees their pre-filled details (read-only)
3. They set a secure password (8+ chars, uppercase, lowercase, number)
4. Click **"Complete Setup & Activate Account"**
5. Redirected to login page

### 4. Login & Verify
1. Pharmacy logs in with their email and new password
2. Go to **Settings** → **Store Settings** to verify all fields populated correctly

## Database Schema Changes

### pharmacy_invites Table
```sql
CREATE TABLE pharmacy_invites (
  id UUID PRIMARY KEY,
  invite_token TEXT UNIQUE,
  email TEXT,
  status TEXT CHECK (status IN ('pending', 'completed', 'expired')),
  expires_at TIMESTAMPTZ,
  
  -- Pharmacy data stored here until setup completion
  pharmacy_name TEXT,
  contact_name TEXT,
  phone TEXT,
  fax TEXT,
  street TEXT,
  city TEXT, 
  state TEXT,
  zip TEXT,
  wholesaler TEXT,
  wholesaler_account TEXT,
  dea_number TEXT,
  dea_expiration DATE,
  service_type TEXT,
  days_between_visits INTEGER,
  -- ... other fields
);
```

### Key RPC Functions
1. **`admin_create_pharmacy`** - Creates invite record with pharmacy data
2. **`verify_pharmacy_invite`** - Validates token, returns pharmacy details
3. **`complete_pharmacy_setup`** - Creates auth user + pharmacy record, activates account

## Error Resolution
The original error was:
```
insert or update on table "pharmacy" violates foreign key constraint "pharmacy_id_fkey"
```

**Root Cause**: Trying to create pharmacy record with UUID that doesn't exist in `auth.users` table.

**Solution**: Store pharmacy data in `pharmacy_invites` table until setup completion, then create both auth user and pharmacy record together.

## API Endpoints

### Admin Endpoints (Authenticated)
- `POST /api/admin/pharmacies` - Create pharmacy invite

### Public Endpoints
- `POST /api/auth/verify-invite` - Validate invite token
- `POST /api/auth/complete-setup` - Complete account setup

## Security Notes
- Invite tokens expire after 7 days
- Tokens are cryptographically secure (32 random bytes, hex-encoded)
- Email validation prevents duplicate invites
- Password requirements enforced on frontend and backend