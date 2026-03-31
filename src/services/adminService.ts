import { supabase, supabaseAdmin } from '../config/supabase';
import { AppError } from '../utils/appError';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const db = supabaseAdmin || null;

// Get the admin client for auth operations
const authAdmin = supabaseAdmin?.auth?.admin;

// All available admin permissions (mirrors sidebar sections)
export const ALL_ADMIN_PERMISSIONS = [
  'dashboard', 'pharmacies', 'distributors', 'marketplace', 'documents',
  'payments', 'payout_hub', 'analytics', 'settings', 'admins',
  'processors', 'policies', 'ndc_pricing', 'tbd_items', 'destruction', 'warehouse',
] as const;

export type AdminPermission = typeof ALL_ADMIN_PERMISSIONS[number];

// JWT configuration
const JWT_SECRET = process.env.JWT_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || 'your-secret-key-change-in-production';
// Admin tokens expire after 24 hours (configurable via env var)
const JWT_EXPIRES_IN: string = process.env.ADMIN_JWT_EXPIRES_IN || '24h'; // Default 24 hours
const JWT_EXPIRES_IN_SECONDS: number = process.env.ADMIN_JWT_EXPIRES_IN_SECONDS 
  ? parseInt(process.env.ADMIN_JWT_EXPIRES_IN_SECONDS, 10)
  : 86400; // 24 hours in seconds (24 * 60 * 60)

export interface AdminLoginData {
  email: string;
  password: string;
}

export interface AdminAuthResponse {
  user: {
    id: string;
    email: string;
    name: string;
    role: string;
    permissions: string[];
  };
  token: string;
  accessToken?: string;
  access_token?: string;
  expiresIn: number;
  expiresAt: number;
}

/**
 * Login admin user
 * 
 * This function:
 * 1. Validates email and password
 * 2. Checks if admin exists and is active
 * 3. Verifies password using bcrypt
 * 4. Generates JWT token
 * 5. Updates last_login_at
 * 6. Returns token and user data
 */
export const adminLogin = async (data: AdminLoginData): Promise<AdminAuthResponse> => {
  const { email, password } = data;

  if (!db) {
    throw new AppError('Database connection not configured', 500);
  }

  // Step 1: Fetch admin from database
  let { data: adminData, error: adminError } = await db
    .from('admin')
    .select('id, email, password_hash, name, role, is_active, permissions')
    .eq('email', email)
    .single();

  // Fallback if `permissions` column hasn't been added yet
  if (adminError?.message?.includes('permissions')) {
    const fallback = await db
      .from('admin')
      .select('id, email, password_hash, name, role, is_active')
      .eq('email', email)
      .single();
    adminData = fallback.data ? { ...fallback.data, permissions: [] } : null;
    adminError = fallback.error;
  }

  if (adminError || !adminData) {
    throw new AppError('Invalid email or password', 401);
  }

  // Step 2: Check if admin is active
  if (!adminData.is_active) {
    throw new AppError('Admin account is inactive', 403);
  }

  // Step 3: Verify password
  const isPasswordValid = await bcrypt.compare(password, adminData.password_hash);

  if (!isPasswordValid) {
    throw new AppError('Invalid email or password', 401);
  }

  // Step 4: Generate JWT token
  const now = Math.floor(Date.now() / 1000);
  const expiresAt = now + JWT_EXPIRES_IN_SECONDS;

  // Resolve permissions: super_admin always gets full access
  const permissions: string[] = adminData.role === 'super_admin'
    ? [...ALL_ADMIN_PERMISSIONS]
    : Array.isArray(adminData.permissions) ? adminData.permissions : [];

  const tokenPayload = {
    id: adminData.id,
    email: adminData.email,
    name: adminData.name,
    role: adminData.role,
    permissions,
    type: 'admin',
  };

  const token = jwt.sign(tokenPayload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
  } as jwt.SignOptions);

  // Step 5: Update last_login_at
  await db
    .from('admin')
    .update({ last_login_at: new Date().toISOString() })
    .eq('id', adminData.id);

  // Step 6: Return response
  const user = {
    id: adminData.id,
    email: adminData.email,
    name: adminData.name,
    role: adminData.role,
    permissions,
  };

  return {
    user,
    token,
    accessToken: token, // Alias for frontend compatibility
    access_token: token, // Alias for frontend compatibility
    expiresIn: JWT_EXPIRES_IN_SECONDS,
    expiresAt,
  };
};

/**
 * Request password reset for admin
 * Uses Supabase's built-in email service (same as pharmacy)
 */
export const adminForgotPassword = async (email: string, redirectTo?: string): Promise<{
  message: string;
}> => {
  if (!db || !supabase) {
    throw new AppError('Database connection not configured', 500);
  }

  const normalizedEmail = email.toLowerCase().trim();

  // Step 1: Check if admin exists with this email
  const { data: adminData, error: adminError } = await db
    .from('admin')
    .select('id, email, name, is_active')
    .eq('email', normalizedEmail)
    .single();

  if (adminError || !adminData) {
    // Don't reveal if email exists or not for security
    return {
      message: 'If an account with this email exists, a password reset link has been sent.',
    };
  }

  // Check if admin is active
  if (!adminData.is_active) {
    throw new AppError('This account has been deactivated. Please contact support.', 403);
  }

  // Step 2: Check if there's already an auth user for this email
  // If not, create one so we can use Supabase's password reset email
  if (authAdmin) {
    const { data: authUsers } = await authAdmin.listUsers();
    const existingAuthUser = authUsers?.users?.find(u => u.email === normalizedEmail);

    if (!existingAuthUser) {
      // Create a shadow auth user for this admin
      // This allows us to use Supabase's built-in email service
      const tempPassword = `temp_${Date.now()}_${Math.random().toString(36).substring(7)}`;
      const { error: createError } = await authAdmin.createUser({
        email: normalizedEmail,
        password: tempPassword,
        email_confirm: true,
        user_metadata: {
          name: adminData.name,
          is_admin: true,
          admin_id: adminData.id,
        },
      });

      if (createError) {
        console.error('Failed to create shadow auth user:', createError);
        // Continue anyway - might already exist
      }
    }
  }

  // Step 3: Send password reset email via Supabase (same as pharmacy)
  const { error: resetError } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
    redirectTo: redirectTo || process.env.ADMIN_PASSWORD_RESET_REDIRECT_URL || 'http://localhost:3002/reset-password',
  });

  if (resetError) {
    console.error('Supabase password reset error:', resetError);
    throw new AppError('Failed to send password reset email. Please try again later.', 500);
  }

  return {
    message: 'If an account with this email exists, a password reset link has been sent.',
  };
};

/**
 * Verify admin reset token (using Supabase Auth - same as pharmacy)
 */
export const adminVerifyResetToken = async (accessToken: string): Promise<{
  valid: boolean;
  email?: string;
  name?: string;
  message?: string;
}> => {
  if (!supabase) {
    throw new AppError('Supabase client not configured', 500);
  }

  try {
    // Verify the token using Supabase
    const { data: userData, error: userError } = await supabase.auth.getUser(accessToken);

    if (userError || !userData?.user) {
      return {
        valid: false,
        message: 'Invalid or expired reset token',
      };
    }

    // Check if this user is an admin
    if (!db) {
      throw new AppError('Database connection not configured', 500);
    }

    const { data: adminData, error: adminError } = await db
      .from('admin')
      .select('id, email, name, is_active')
      .eq('email', userData.user.email)
      .single();

    if (adminError || !adminData) {
      return {
        valid: false,
        message: 'No admin account found with this email',
      };
    }

    if (!adminData.is_active) {
      return {
        valid: false,
        message: 'This admin account has been deactivated',
      };
    }

    return {
      valid: true,
      email: adminData.email,
      name: adminData.name,
    };
  } catch (error: any) {
    console.error('Admin verify token error:', error);
    return {
      valid: false,
      message: 'Failed to verify reset token',
    };
  }
};

/**
 * Reset admin password using Supabase Auth (same as pharmacy)
 */
export const adminResetPassword = async (accessToken: string, newPassword: string): Promise<{
  success: boolean;
  message: string;
}> => {
  if (!supabase || !db) {
    throw new AppError('Database connection not configured', 500);
  }

  // Validate password
  if (!newPassword || newPassword.length < 8) {
    throw new AppError('Password must be at least 8 characters long', 400);
  }

  try {
    // Step 1: Verify the token and get user info
    const { data: userData, error: userError } = await supabase.auth.getUser(accessToken);

    if (userError || !userData?.user) {
      throw new AppError('Invalid or expired reset link. Please request a new password reset.', 400);
    }

    const userEmail = userData.user.email;

    if (!userEmail) {
      throw new AppError('Unable to verify user email', 400);
    }

    // Step 2: Check if this is an admin
    const { data: adminData, error: adminError } = await db
      .from('admin')
      .select('id, email, is_active')
      .eq('email', userEmail)
      .single();

    if (adminError || !adminData) {
      throw new AppError('No admin account found with this email', 404);
    }

    if (!adminData.is_active) {
      throw new AppError('This admin account has been deactivated', 403);
    }

    // Step 3: Update password in Supabase Auth
    if (supabaseAdmin?.auth?.admin) {
      const { error: updateAuthError } = await supabaseAdmin.auth.admin.updateUserById(
        userData.user.id,
        { password: newPassword }
      );

      if (updateAuthError) {
        console.error('Failed to update Supabase Auth password:', updateAuthError);
        // Continue to update admin table anyway
      }
    }

    // Step 4: Update password in admin table
    const passwordHash = await bcrypt.hash(newPassword, 10);

    const { error: updateError } = await db
      .from('admin')
      .update({
        password_hash: passwordHash,
        updated_at: new Date().toISOString(),
      })
      .eq('id', adminData.id);

    if (updateError) {
      console.error('Failed to update admin password:', updateError);
      throw new AppError('Failed to update password. Please try again.', 500);
    }

    return {
      success: true,
      message: 'Password has been reset successfully. You can now log in with your new password.',
    };
  } catch (error: any) {
    if (error instanceof AppError) {
      throw error;
    }
    console.error('Admin reset password error:', error);
    throw new AppError('Failed to reset password. Please try again or request a new reset link.', 500);
  }
};

/**
 * Verify admin JWT token
 * Used for authentication middleware
 */
export const verifyAdminToken = async (token: string): Promise<{
  id: string;
  email: string;
  name: string;
  role: string;
  type: string;
  permissions: string[];
}> => {
  try {
    // Step 1: Verify JWT signature and expiration
    let decoded: any;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (jwtError: any) {
      console.error('[AdminAuth] JWT verification failed:', jwtError.message);
      throw new AppError(`Token verification failed: ${jwtError.message}`, 401);
    }

    // Check if token is for admin
    if (decoded.type !== 'admin') {
      console.error('[AdminAuth] Token type mismatch:', decoded.type);
      throw new AppError('Invalid token type', 401);
    }

    // Verify admin still exists and is active
    if (!db) {
      throw new AppError('Database connection not configured', 500);
    }

    let { data: adminData, error: adminError } = await db
      .from('admin')
      .select('id, email, name, role, is_active, permissions')
      .eq('id', decoded.id)
      .single();

    // Fallback if `permissions` column hasn't been added yet
    if (adminError?.message?.includes('permissions')) {
      const fallback = await db
        .from('admin')
        .select('id, email, name, role, is_active')
        .eq('id', decoded.id)
        .single();
      adminData = fallback.data ? { ...fallback.data, permissions: [] } : null;
      adminError = fallback.error;
    }

    if (adminError) {
      console.error('[AdminAuth] Database error:', adminError.message, adminError.code);
      throw new AppError(`Database error: ${adminError.message}`, 500);
    }

    if (!adminData) {
      console.error('[AdminAuth] Admin not found for ID:', decoded.id);
      throw new AppError('Admin not found', 404);
    }

    if (!adminData.is_active) {
      throw new AppError('Admin account is inactive', 403);
    }

    const permissions: string[] = adminData.role === 'super_admin'
      ? [...ALL_ADMIN_PERMISSIONS]
      : Array.isArray(adminData.permissions) ? adminData.permissions : [];

    return {
      id: adminData.id,
      email: adminData.email,
      name: adminData.name,
      role: adminData.role,
      type: 'admin',
      permissions,
    };
  } catch (error: any) {
    if (error instanceof AppError) {
      throw error;
    }
    console.error('[AdminAuth] Unexpected error:', error.message);
    throw new AppError('Invalid or expired token', 401);
  }
};
