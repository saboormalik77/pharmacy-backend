import { supabase, supabaseAdmin } from '../config/supabase';
import { AppError } from '../utils/appError';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';

// Use admin client for backend operations (bypasses RLS)
// Fallback to regular client if admin is not configured
const db = supabaseAdmin || supabase;

// JWT configuration (uses same secret as admin for consistency)
const JWT_SECRET = process.env.JWT_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || 'your-secret-key-change-in-production';

// Constants for token configuration
const REFRESH_TOKEN_EXPIRY_DAYS = 30; // Custom refresh tokens last 30 days
const ACCESS_TOKEN_EXPIRY_SECONDS = 3600; // Access tokens expire in 1 hour
const JWT_EXPIRES_IN = '1h'; // JWT expiry string for jsonwebtoken

export interface PhysicalAddress {
  street?: string;
  city?: string;
  state?: string;
  zip?: string;
}

export interface SignupData {
  email: string;
  password: string;
  name: string;
  pharmacyName: string;
  phone?: string;
  physicalAddress?: PhysicalAddress;
  npiNumber?: string;
  deaNumber?: string;
}

export interface SigninData {
  email: string;
  password: string;
  fcmToken?: string;
}

export interface AuthResponse {
  user: any;
  token: string;
  refreshToken: string;
  expiresIn: number;
  expiresAt: number;
}

export interface RefreshTokenData {
  refreshToken: string;
}

/**
 * Generate a secure random refresh token
 */
const generateRefreshToken = (): string => {
  // Generate a cryptographically secure random token
  const randomBytes = crypto.randomBytes(64);
  const token = randomBytes.toString('base64url');
  return `prt_${token}`; // prefix to identify our custom tokens (pharmacy refresh token)
};

/**
 * Hash a refresh token for secure storage
 * We never store raw tokens in the database
 */
const hashToken = (token: string): string => {
  return crypto.createHash('sha256').update(token).digest('hex');
};

/**
 * Store a refresh token in the database
 */
const storeRefreshToken = async (
  pharmacyId: string,
  token: string,
  userAgent?: string,
  ipAddress?: string
): Promise<void> => {
  const tokenHash = hashToken(token);
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + REFRESH_TOKEN_EXPIRY_DAYS);

  const { error } = await db
    .from('refresh_tokens')
    .insert({
      pharmacy_id: pharmacyId,
      token_hash: tokenHash,
      expires_at: expiresAt.toISOString(),
      user_agent: userAgent || null,
      ip_address: ipAddress || null,
    });

  if (error) {
    console.error('Failed to store refresh token:', error);
    throw new AppError('Failed to create session', 500);
  }
};

/**
 * Validate and retrieve refresh token data from database
 */
const validateRefreshToken = async (token: string): Promise<{ pharmacyId: string; tokenId: string } | null> => {
  const tokenHash = hashToken(token);

  const { data, error } = await db
    .from('refresh_tokens')
    .select('id, pharmacy_id, expires_at, revoked_at')
    .eq('token_hash', tokenHash)
    .single();

  if (error || !data) {
    return null;
  }

  // Check if token is revoked
  if (data.revoked_at) {
    return null;
  }

  // Check if token is expired
  const expiresAt = new Date(data.expires_at);
  if (expiresAt < new Date()) {
    return null;
  }

  // Update last_used_at
  await db
    .from('refresh_tokens')
    .update({ last_used_at: new Date().toISOString() })
    .eq('id', data.id);

  return {
    pharmacyId: data.pharmacy_id,
    tokenId: data.id,
  };
};

/**
 * Revoke a specific refresh token
 */
const revokeRefreshToken = async (tokenId: string): Promise<void> => {
  await db
    .from('refresh_tokens')
    .update({ revoked_at: new Date().toISOString() })
    .eq('id', tokenId);
};

/**
 * Revoke all refresh tokens for a pharmacy (useful for logout all devices)
 * This actually deletes the tokens from the database
 */
export const revokeAllRefreshTokens = async (pharmacyId: string): Promise<void> => {
  const { error } = await db
    .from('refresh_tokens')
    .delete()
    .eq('pharmacy_id', pharmacyId);

  if (error) {
    console.error('Failed to revoke all refresh tokens:', error);
    // Don't throw error - allow login to continue even if cleanup fails
  }
};

/**
 * Clean up expired tokens (can be called periodically)
 */
export const cleanupExpiredTokens = async (): Promise<number> => {
  const { data, error } = await db
    .from('refresh_tokens')
    .delete()
    .or(`expires_at.lt.${new Date().toISOString()},revoked_at.not.is.null`)
    .select('id');

  if (error) {
    console.error('Failed to cleanup expired tokens:', error);
    return 0;
  }

  return data?.length || 0;
};

/**
 * Generate access token using jsonwebtoken
 * Creates a signed JWT with pharmacy user information
 */
const generateJwtAccessToken = (
  pharmacyId: string, 
  email: string,
  buyingGroupId: string | null = null
): { accessToken: string; expiresIn: number; expiresAt: number } => {
  const now = Math.floor(Date.now() / 1000);
  const expiresAt = now + ACCESS_TOKEN_EXPIRY_SECONDS;

  const tokenPayload = {
    sub: pharmacyId,
    email: email,
    role: 'authenticated',
    aud: 'authenticated',
    type: 'pharmacy',
    buying_group_id: buyingGroupId,
  };

  const accessToken = jwt.sign(tokenPayload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
  } as jwt.SignOptions);

  return {
    accessToken,
    expiresIn: ACCESS_TOKEN_EXPIRY_SECONDS,
    expiresAt,
  };
};

/**
 * Calculate expiration times for the response
 */
const calculateExpiry = (): { expiresIn: number; expiresAt: number } => {
  const now = Math.floor(Date.now() / 1000);
  return {
    expiresIn: ACCESS_TOKEN_EXPIRY_SECONDS,
    expiresAt: now + ACCESS_TOKEN_EXPIRY_SECONDS,
  };
};

/**
 * Generate a full login-style response for a branch pharmacy.
 * Called when a parent-pharmacy admin switches into one of their branches.
 * Returns the exact same shape as signin() so the frontend can treat it
 * identically to a normal login.
 */
export const loginAsBranch = async (
  parentPharmacyId: string,
  branchPharmacyId: string
): Promise<AuthResponse> => {
  if (!supabaseAdmin) {
    throw new AppError('Supabase admin client not configured', 500);
  }

  // 1. Verify the caller actually owns this branch
  const { data: verifyData, error: verifyError } = await supabaseAdmin.rpc('verify_pharmacy_switch_access', {
    p_parent_pharmacy_id: parentPharmacyId,
    p_branch_pharmacy_id: branchPharmacyId,
  });

  if (verifyError) throw new AppError('Failed to verify branch access: ' + verifyError.message, 500);
  if (verifyData?.error) throw new AppError(verifyData.message, verifyData.code || 403);

  // 2. Fetch the full branch pharmacy row (same as signin does)
  const { data: pharmacyData, error: pharmacyError } = await supabaseAdmin
    .from('pharmacy')
    .select('*')
    .eq('id', branchPharmacyId)
    .single();

  if (pharmacyError || !pharmacyData) throw new AppError('Branch pharmacy profile not found', 404);
  if (pharmacyData.status !== 'active') throw new AppError('Branch pharmacy is not active', 403);

  // 3. Generate a standard JWT for the branch pharmacy
  const { accessToken, expiresIn, expiresAt } = generateJwtAccessToken(branchPharmacyId, pharmacyData.email);

  // 4. Generate a refresh token just like a real login
  const customRefreshToken = generateRefreshToken();
  await storeRefreshToken(branchPharmacyId, customRefreshToken);

  // 5. Return exact same shape as signin()
  return {
    user: pharmacyData,
    token: accessToken,
    refreshToken: customRefreshToken,
    expiresIn,
    expiresAt,
  };
};

export const signup = async (data: SignupData): Promise<AuthResponse> => {
  const { email, password, name, pharmacyName, phone, physicalAddress, npiNumber, deaNumber } = data;

  if (!supabaseAdmin) {
    throw new AppError('Supabase admin client not configured. SUPABASE_SERVICE_ROLE_KEY is required.', 500);
  }

  // Step 1: Create user in Supabase Auth using admin client
  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true, // Auto-confirm email (set to false if you want email verification)
  });

  if (authError || !authData?.user) {
    // Check if user already exists
    if (authError?.message?.includes('already registered') || 
        authError?.message?.includes('already exists') ||
        authError?.message?.includes('User already registered')) {
      throw new AppError('User with this email already exists', 400);
    }
    throw new AppError(authError?.message || 'Failed to create user', 400);
  }

  const authUserId = authData.user.id;

  // Step 2: Create pharmacy profile linked to auth user
  const { data: pharmacyData, error: pharmacyError } = await db
    .from('pharmacy')
    .insert([
      {
        id: authUserId, // Link pharmacy record to auth user ID
        email,
        name,
        pharmacy_name: pharmacyName,
        phone: phone || null,
        physical_address: physicalAddress || null,
        npi_number: npiNumber || null,
        dea_number: deaNumber || null,
        status: 'active', // Set to 'active' by default, or 'pending' if you want manual approval
      },
    ])
    .select()
    .single();

  if (pharmacyError) {
    // If pharmacy insert fails, try to delete the auth user (cleanup)
    await supabaseAdmin.auth.admin.deleteUser(authUserId);
    throw new AppError(pharmacyError.message || 'Failed to create pharmacy profile', 400);
  }

  // Step 3: Generate JWT access token using jsonwebtoken
  const { accessToken, expiresIn, expiresAt } = generateJwtAccessToken(authUserId, email);

  // Step 4: Generate and store our custom long-lived refresh token
  const customRefreshToken = generateRefreshToken();
  await storeRefreshToken(authUserId, customRefreshToken);

  return {
    user: pharmacyData,
    token: accessToken,
    refreshToken: customRefreshToken, // Return our custom refresh token
    expiresIn,
    expiresAt,
  };
};

export const googleSignin = async (email: string): Promise<AuthResponse> => {
  if (!email) {
    throw new AppError('Email is required', 400);
  }

  const normalizedEmail = email.toLowerCase().trim();

  const { data: pharmacyData, error: pharmacyError } = await db
    .from('pharmacy')
    .select('*')
    .eq('email', normalizedEmail)
    .single();

  if (pharmacyError || !pharmacyData) {
    throw new AppError('No pharmacy account found with this email. Please register first or sign in with a different email.', 404);
  }

  const pharmacyStatus = pharmacyData.status?.toLowerCase() || 'pending';

  if (pharmacyStatus === 'blacklisted') {
    throw new AppError('Your pharmacy account has been permanently blocked. Access to the platform is denied. Please contact support for more information.', 403);
  } else if (pharmacyStatus === 'suspended') {
    throw new AppError('Your pharmacy account has been suspended. Please contact support to reactivate your account.', 403);
  } else if (pharmacyStatus === 'pending') {
    throw new AppError('Your pharmacy account is pending approval. Please wait for account activation or contact support.', 403);
  } else if (pharmacyStatus !== 'active') {
    throw new AppError('Your pharmacy account status is invalid. Please contact support.', 403);
  }

  const authUserId = pharmacyData.id;

  await revokeAllRefreshTokens(authUserId);

  const { accessToken, expiresIn, expiresAt } = generateJwtAccessToken(authUserId, normalizedEmail);

  const customRefreshToken = generateRefreshToken();
  await storeRefreshToken(authUserId, customRefreshToken);

  return {
    user: pharmacyData,
    token: accessToken,
    refreshToken: customRefreshToken,
    expiresIn,
    expiresAt,
  };
};

export const signin = async (
  data: SigninData,
  tenantBuyingGroupId?: string | null
): Promise<AuthResponse> => {
  const { email, password } = data;

  // Step 1: Sign in with Supabase Auth
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (authError || !authData?.session || !authData?.user) {
    throw new AppError('Invalid email or password', 401);
  }

  const authUserId = authData.user.id;

  // Step 2: Fetch pharmacy profile
  const { data: pharmacyData, error: pharmacyError } = await db
    .from('pharmacy')
    .select('*')
    .eq('id', authUserId)
    .single();

  if (pharmacyError || !pharmacyData) {
    throw new AppError('Pharmacy profile not found', 404);
  }

  // Step 2.5: Check pharmacy status - BLOCK suspended/blacklisted pharmacies from login
  const pharmacyStatus = pharmacyData.status?.toLowerCase() || 'pending';
  
  if (pharmacyStatus === 'blacklisted') {
    throw new AppError('Your pharmacy account has been permanently blocked. Access to the platform is denied. Please contact support for more information.', 403);
  } else if (pharmacyStatus === 'suspended') {
    throw new AppError('Your pharmacy account has been suspended. Please contact support to reactivate your account.', 403);
  } else if (pharmacyStatus === 'pending') {
    throw new AppError('Your pharmacy account is pending approval. Please wait for account activation or contact support.', 403);
  } else if (pharmacyStatus !== 'active') {
    throw new AppError('Your pharmacy account status is invalid. Please contact support.', 403);
  }

  // Step 2.6: Tenant-based access control (via RPC).
  // The RPC enforces the domain -> buying-group mapping and returns
  // the pharmacy's owning buying_group_id for JWT embedding.
  let resolvedBuyingGroupId: string | null = null;
  const { data: tenantData, error: tenantError } = await db.rpc(
    'validate_pharmacy_tenant_access',
    {
      p_pharmacy_id: authUserId,
      p_tenant_buying_group_id: tenantBuyingGroupId ?? null,
    }
  );

  if (tenantError) {
    throw new AppError('Failed to validate tenant access', 500);
  }

  const tenantResult = tenantData as any;
  if (tenantResult?.error) {
    throw new AppError(tenantResult.message || 'Access denied', tenantResult.code || 403);
  }
  resolvedBuyingGroupId = tenantResult?.buying_group_id ?? null;

  // Step 3: Revoke all existing refresh tokens (logout from all devices)
  // This ensures that when a user logs in, all previous sessions are invalidated
  await revokeAllRefreshTokens(authUserId);

  // Step 4: Generate JWT access token using jsonwebtoken
  const { accessToken, expiresIn, expiresAt } = generateJwtAccessToken(
    authUserId,
    email,
    resolvedBuyingGroupId
  );

  // Step 5: Generate and store our custom long-lived refresh token
  const customRefreshToken = generateRefreshToken();
  await storeRefreshToken(authUserId, customRefreshToken);

  // Step 6: Store FCM token if provided (for push notifications)
  // Only update if fcmToken is a valid non-empty string (don't overwrite with null/empty)
  if (data.fcmToken && typeof data.fcmToken === 'string' && data.fcmToken.trim().length > 0) {
    try {
      console.log(`📱 Storing FCM token for pharmacy ${authUserId}: ${data.fcmToken.substring(0, 20)}...`);
      const { error: fcmUpdateError, data: updateData } = await db
        .from('pharmacy')
        .update({ fcm_token: data.fcmToken })
        .eq('id', authUserId)
        .select('fcm_token');
      
      if (fcmUpdateError) {
        console.error('❌ Failed to update FCM token during login:', fcmUpdateError);
        console.error('Error details:', JSON.stringify(fcmUpdateError, null, 2));
      } else {
        console.log('✅ FCM token stored successfully');
        if (updateData && updateData.length > 0) {
          console.log('✅ Verified FCM token in database:', updateData[0].fcm_token ? `${updateData[0].fcm_token.substring(0, 20)}...` : 'null');
        }
      }
    } catch (fcmError: any) {
      // Log error but don't fail login if FCM token update fails
      console.error('❌ Exception while updating FCM token during login:', fcmError);
      console.error('Exception details:', fcmError?.message || JSON.stringify(fcmError, null, 2));
    }
  } else {
    console.log('⚠️ No valid FCM token provided during login (token:', data.fcmToken ? 'empty/invalid' : 'null', ')');
  }

  return {
    user: pharmacyData,
    token: accessToken,
    refreshToken: customRefreshToken, // Return our custom refresh token
    expiresIn,
    expiresAt,
  };
};

/**
 * Refresh access token using our custom refresh token
 * 
 * This function:
 * 1. Validates the custom refresh token against our database
 * 2. Generates a new JWT access token using jsonwebtoken
 * 3. Rotates the refresh token for added security
 */
export const refreshToken = async (data: RefreshTokenData): Promise<AuthResponse> => {
  const { refreshToken: refreshTokenValue } = data;

  if (!refreshTokenValue) {
    throw new AppError('Refresh token is required', 400);
  }

  // Validate our custom refresh token
  const tokenData = await validateRefreshToken(refreshTokenValue);

  if (!tokenData) {
    throw new AppError('Invalid or expired refresh token. Please sign in again.', 401);
  }

  const { pharmacyId, tokenId } = tokenData;

  // Fetch the pharmacy user to get their email
  const { data: pharmacyData, error: pharmacyError } = await db
    .from('pharmacy')
    .select('*')
    .eq('id', pharmacyId)
    .single();

  if (pharmacyError || !pharmacyData) {
    // Revoke the token since the user no longer exists
    await revokeRefreshToken(tokenId);
    throw new AppError('Pharmacy profile not found', 404);
  }

  // Check pharmacy status - BLOCK suspended/blacklisted pharmacies from refreshing tokens
  const pharmacyStatus = pharmacyData.status?.toLowerCase() || 'pending';
  
  if (pharmacyStatus === 'blacklisted') {
    await revokeRefreshToken(tokenId);
    throw new AppError('Your pharmacy account has been permanently blocked. Access to the platform is denied. Please contact support for more information.', 403);
  } else if (pharmacyStatus === 'suspended') {
    await revokeRefreshToken(tokenId);
    throw new AppError('Your pharmacy account has been suspended. Please contact support to reactivate your account.', 403);
  } else if (pharmacyStatus === 'pending') {
    await revokeRefreshToken(tokenId);
    throw new AppError('Your pharmacy account is pending approval. Please wait for account activation or contact support.', 403);
  } else if (pharmacyStatus !== 'active') {
    await revokeRefreshToken(tokenId);
    throw new AppError('Your pharmacy account status is invalid. Please contact support.', 403);
  }

  // Generate a new JWT access token using jsonwebtoken
  const { accessToken, expiresIn, expiresAt } = generateJwtAccessToken(pharmacyId, pharmacyData.email);

  // Token rotation: Generate a new refresh token and revoke the old one
  // This provides better security as each refresh token can only be used once
  const newRefreshToken = generateRefreshToken();
  await storeRefreshToken(pharmacyId, newRefreshToken);
  await revokeRefreshToken(tokenId);

  return {
    user: pharmacyData,
    token: accessToken,
    refreshToken: newRefreshToken, // Return the new rotated refresh token
    expiresIn,
    expiresAt,
  };
};

/**
 * Logout - revoke the current refresh token
 */
export const logout = async (refreshTokenValue: string): Promise<void> => {
  if (!refreshTokenValue) {
    return; // No token to revoke
  }

  const tokenData = await validateRefreshToken(refreshTokenValue);
  if (tokenData) {
    await revokeRefreshToken(tokenData.tokenId);
  }
};

/**
 * Logout from all devices - revoke all refresh tokens for a user
 */
export const logoutAll = async (pharmacyId: string): Promise<void> => {
  await revokeAllRefreshTokens(pharmacyId);
};

/**
 * Request password reset - sends password reset email via Supabase
 * @param email - User's email address
 * @param redirectTo - URL to redirect to after password reset (frontend reset page)
 */
export const forgotPassword = async (email: string, redirectTo?: string): Promise<{ message: string }> => {
  if (!email) {
    throw new AppError('Email is required', 400);
  }

  // Check if pharmacy exists with this email
  const { data: pharmacyData, error: pharmacyError } = await db
    .from('pharmacy')
    .select('id, email, status')
    .eq('email', email.toLowerCase().trim())
    .single();

  if (pharmacyError || !pharmacyData) {
    // Don't reveal if email exists or not for security
    // Always return success message
    return {
      message: 'If an account with this email exists, a password reset link has been sent.',
    };
  }

  // Check pharmacy status - don't send reset email to blocked/suspended accounts
  const pharmacyStatus = pharmacyData.status?.toLowerCase() || 'pending';
  if (pharmacyStatus === 'blacklisted') {
    throw new AppError('This account has been permanently blocked. Please contact support.', 403);
  } else if (pharmacyStatus === 'suspended') {
    throw new AppError('This account has been suspended. Please contact support to reactivate.', 403);
  }

  // Send password reset email via Supabase
  const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.toLowerCase().trim(), {
    redirectTo: redirectTo || process.env.PASSWORD_RESET_REDIRECT_URL || 'http://localhost:3001/reset-password',
  });

  if (resetError) {
    console.error('Supabase password reset error:', resetError);
    // Don't reveal the actual error for security
    throw new AppError('Failed to send password reset email. Please try again later.', 500);
  }

  return {
    message: 'If an account with this email exists, a password reset link has been sent.',
  };
};

/**
 * Reset password using the access token received from Supabase redirect
 * @param accessToken - The access token from Supabase password reset redirect
 * @param newPassword - The new password to set
 */
export const resetPassword = async (accessToken: string, newPassword: string): Promise<{ message: string }> => {
  if (!accessToken) {
    throw new AppError('Access token is required', 400);
  }

  if (!newPassword) {
    throw new AppError('New password is required', 400);
  }

  // Validate password strength
  if (newPassword.length < 8) {
    throw new AppError('Password must be at least 8 characters long', 400);
  }

  if (!supabaseAdmin) {
    throw new AppError('Supabase admin client not configured', 500);
  }

  // Create a Supabase client to verify the recovery token
  const { createClient } = await import('@supabase/supabase-js');
  const supabaseUrl = process.env.SUPABASE_URL!;
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY!;

  // Create a client with the access token in the header to verify it
  const userSupabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  });

  // Verify the token by getting user info - this validates the JWT
  const { data: userData, error: userError } = await userSupabase.auth.getUser();

  if (userError || !userData?.user) {
    console.error('Token verification error:', userError);
    throw new AppError('Invalid or expired reset token. Please request a new password reset.', 401);
  }

  // Use admin client to update the password (bypasses session requirement)
  const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
    userData.user.id,
    { password: newPassword }
  );

  if (updateError) {
    console.error('Password update error:', updateError);
    throw new AppError('Failed to update password. Please try again or request a new reset link.', 500);
  }

  // Revoke all existing refresh tokens for this user for security
  await revokeAllRefreshTokens(userData.user.id);

  return {
    message: 'Password has been reset successfully. Please login with your new password.',
  };
};

/**
 * Verify password reset token (optional - for frontend to check if token is still valid)
 * @param accessToken - The access token from Supabase password reset redirect
 */
export const verifyResetToken = async (accessToken: string): Promise<{ valid: boolean; email?: string }> => {
  if (!accessToken) {
    return { valid: false };
  }

  try {
    const { createClient } = await import('@supabase/supabase-js');
    const supabaseUrl = process.env.SUPABASE_URL!;
    const supabaseAnonKey = process.env.SUPABASE_ANON_KEY!;

    // Create a client with the access token in the header to verify it
    const userSupabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
      global: {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    });

    // Verify token by getting user info - this validates the JWT
    const { data: userData, error } = await userSupabase.auth.getUser();

    if (error || !userData?.user) {
      console.error('Token verification error:', error);
      return { valid: false };
    }

    return {
      valid: true,
      email: userData.user.email,
    };
  } catch (error) {
    console.error('Token verification exception:', error);
    return { valid: false };
  }
};
