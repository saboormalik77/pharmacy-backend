# Admin Panel Setup Guide

This guide explains how to set up the admin panel authentication system for PharmAdmin.

## Overview

The admin panel uses a separate authentication system from the pharmacy users:
- **Pharmacy users**: Use Supabase Auth (`/api/auth/signin`)
- **Admin users**: Use custom JWT authentication (`/api/auth/login`)

## Database Setup

### 1. Create Admin Table

Run the SQL script to create the admin table:

```sql
-- Run this in your Supabase SQL Editor
\i sqlTable/admin.sql
```

Or copy and paste the contents of `sqlTable/admin.sql` into your Supabase SQL Editor.

### 2. Create Admin Account

Use the provided script to create an admin account:

```bash
# Using npm script (recommended)
npm run create-admin admin@pharmadmin.com "SecurePassword123" "Admin User"

# Or using npx directly
npx ts-node scripts/create_admin_account.ts admin@pharmadmin.com "SecurePassword123" "Admin User"

# Or using yarn
yarn create-admin admin@pharmadmin.com "SecurePassword123" "Admin User"

# Or using environment variables
export ADMIN_EMAIL=admin@pharmadmin.com
export ADMIN_PASSWORD=SecurePassword123
export ADMIN_NAME="Admin User"
npx ts-node scripts/create_admin_account.ts
```

**Note**: Make sure to use a strong password (minimum 8 characters).

## API Endpoint

### Login Endpoint

**Endpoint:** `POST /api/auth/login`

**Full URL:** `http://localhost:3000/api/auth/login`

**Headers:**
```
Content-Type: application/json
```

**Request Payload:**
```json
{
  "email": "admin@pharmadmin.com",
  "password": "your_password_here"
}
```

**Success Response (200 OK):**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "user_id_here",
    "email": "admin@pharmadmin.com",
    "name": "Admin User",
    "role": "admin"
  }
}
```

**Error Response (401 Unauthorized):**
```json
{
  "message": "Invalid email or password"
}
```

**Error Response (400 Bad Request):**
```json
{
  "message": "Please provide email and password"
}
```

## Response Field Mapping

The frontend will look for the token in the following order:
1. `token`
2. `accessToken`
3. `access_token`

The frontend will look for user data in:
- `user` object (contains `id`, `email`, `name`, `role`)

## Token Details

- **Token Type**: JWT (JSON Web Token)
- **Expiration**: 1 hour
- **Secret**: Uses `JWT_SECRET` environment variable (falls back to `SUPABASE_SERVICE_ROLE_KEY` if not set)
- **Token Payload**: Contains `id`, `email`, `name`, `role`, and `type: 'admin'`

## Environment Variables

Make sure to set the following environment variable in your `.env.local` file:

```env
JWT_SECRET=your-secret-key-change-in-production
```

**Important**: Use a strong, random secret key in production. You can generate one using:

```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

## Admin Table Structure

The `admin` table has the following structure:

- `id` (UUID, Primary Key)
- `email` (VARCHAR, Unique, Not Null)
- `password_hash` (TEXT, Not Null) - bcrypt hashed password
- `name` (VARCHAR, Not Null)
- `role` (VARCHAR, Default: 'admin') - Can be 'admin' or 'super_admin'
- `is_active` (BOOLEAN, Default: true)
- `last_login_at` (TIMESTAMP)
- `created_at` (TIMESTAMP)
- `updated_at` (TIMESTAMP)

## Security Notes

1. **Password Hashing**: Passwords are hashed using bcrypt with 10 salt rounds
2. **Token Expiration**: Tokens expire after 1 hour for security
3. **Account Status**: Only active admin accounts can log in
4. **JWT Secret**: Never commit the JWT secret to version control

## Troubleshooting

### Admin account already exists

If you try to create an admin account that already exists, the script will inform you. To update the password, you'll need to:

1. Hash a new password using bcrypt
2. Update the `password_hash` field in the `admin` table directly

### Invalid credentials

- Verify the email and password are correct
- Check that the admin account exists in the database
- Ensure the admin account is active (`is_active = true`)

### Database connection error

- Verify that `SUPABASE_SERVICE_ROLE_KEY` is set in your environment variables
- Check that the Supabase admin client is properly configured

## Next Steps

After setting up the admin account:

1. Test the login endpoint using Postman or curl
2. Integrate the login endpoint with your frontend admin panel
3. Store the token securely (e.g., in localStorage or httpOnly cookies)
4. Include the token in the `Authorization` header for authenticated requests: `Bearer <token>`
