import { Request, Response, NextFunction } from 'express';
import { signup, signin, googleSignin, refreshToken, logout, logoutAll, forgotPassword, resetPassword, verifyResetToken } from '../services/authService';
import { catchAsync } from '../utils/catchAsync';
import { AppError } from '../utils/appError';
import { supabaseAdmin } from '../config/supabase';

const db = supabaseAdmin!;

export const signupHandler = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const { email, password, name, pharmacyName, phone, physicalAddress, npiNumber, deaNumber } = req.body;

    if (!email || !password || !name || !pharmacyName) {
      throw new AppError('Please provide email, password, name, and pharmacyName', 400);
    }

    const result = await signup({
      email,
      password,
      name,
      pharmacyName,
      phone,
      physicalAddress,
      npiNumber,
      deaNumber,
    });

    res.status(201).json({
      status: 'success',
      data: result,
    });
  }
);

export const signinHandler = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const { email, password, fcmToken } = req.body;

    if (!email || !password) {
      throw new AppError('Please provide email and password', 400);
    }

    console.log('📱 Signin request - FCM Token:', fcmToken ? `${fcmToken.substring(0, 20)}...` : 'not provided');

    // Tenant enforcement:
    // - req.tenant === null   -> localhost / dev (no enforcement)
    // - req.tenant !== null   -> production domain; portal type must be 'pharmacy'
    if (req.tenant && req.tenant.portalType !== 'pharmacy') {
      throw new AppError('This domain is not configured for pharmacy access', 403);
    }
    const tenantBuyingGroupId = req.tenant?.buyingGroupId ?? null;
    const result = await signin({ email, password, fcmToken }, tenantBuyingGroupId);

    res.status(200).json({
      status: 'success',
      data: result,
    });
  }
);

export const googleSigninHandler = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const { email } = req.body;

    if (!email) {
      throw new AppError('Email is required', 400);
    }

    const result = await googleSignin(email);

    res.status(200).json({
      status: 'success',
      data: result,
    });
  }
);

export const refreshTokenHandler = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const { refreshToken: refreshTokenValue } = req.body;

    if (!refreshTokenValue) {
      throw new AppError('Refresh token is required', 400);
    }

    const result = await refreshToken({ refreshToken: refreshTokenValue });

    res.status(200).json({
      status: 'success',
      data: result,
    });
  }
);

export const logoutHandler = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const { refreshToken: refreshTokenValue } = req.body;

    // Logout - revoke the provided refresh token
    if (refreshTokenValue) {
      await logout(refreshTokenValue);
    }

    res.status(200).json({
      status: 'success',
      message: 'Logged out successfully',
    });
  }
);

export const logoutAllHandler = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    // This requires authentication to know which user to log out
    const pharmacyId = req.pharmacyId;

    if (!pharmacyId) {
      throw new AppError('Authentication required', 401);
    }

    await logoutAll(pharmacyId);

    res.status(200).json({
      status: 'success',
      message: 'Logged out from all devices successfully',
    });
  }
);

export const forgotPasswordHandler = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const { email, redirectTo } = req.body;

    if (!email) {
      throw new AppError('Email is required', 400);
    }

    const buyingGroupId = req.tenant?.buyingGroupId || null;
    const result = await forgotPassword(email, redirectTo, buyingGroupId);

    res.status(200).json({
      status: 'success',
      message: result.message,
    });
  }
);

export const resetPasswordHandler = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const { accessToken, newPassword } = req.body;

    if (!accessToken) {
      throw new AppError('Access token is required', 400);
    }

    if (!newPassword) {
      throw new AppError('New password is required', 400);
    }

    const result = await resetPassword(accessToken, newPassword);

    res.status(200).json({
      status: 'success',
      message: result.message,
    });
  }
);

export const verifyResetTokenHandler = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const { accessToken } = req.body;

    const result = await verifyResetToken(accessToken);

    res.status(200).json({
      status: 'success',
      data: result,
    });
  }
);

/**
 * Verify a pharmacy invite token
 * POST /api/auth/verify-invite
 */
export const verifyInviteHandler = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const { token } = req.body;

    if (!token) {
      throw new AppError('Invite token is required', 400);
    }

    const { data, error } = await db.rpc('verify_pharmacy_invite', {
      p_token: token,
    });

    if (error) {
      throw new AppError(error.message || 'Failed to verify invite', 500);
    }

    if (data?.error) {
      throw new AppError(data.message, data.code || 400);
    }

    res.status(200).json({
      status: 'success',
      data: data.data,
    });
  }
);

/**
 * Complete pharmacy account setup (set password + activate)
 * POST /api/auth/complete-setup
 */
export const completeSetupHandler = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const { token, password } = req.body;

    if (!token) {
      throw new AppError('Invite token is required', 400);
    }

    if (!password || password.length < 8) {
      throw new AppError('Password must be at least 8 characters', 400);
    }

    // First verify the invite is still valid
    const { data: verifyResult, error: verifyError } = await db.rpc('verify_pharmacy_invite', {
      p_token: token,
    });

    if (verifyError) {
      throw new AppError(verifyError.message || 'Failed to verify invite', 500);
    }

    if (verifyResult?.error) {
      throw new AppError(verifyResult.message, verifyResult.code || 400);
    }

    const { email } = verifyResult.data;

    // Create a Supabase Auth user for this pharmacy
    const { data: authData, error: authError } = await db.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (authError) {
      if (authError.message?.includes('already registered') || authError.message?.includes('already exists')) {
        // User already exists in auth — update their password instead
        const { data: existingUsers } = await db.auth.admin.listUsers();
        const existingUser = existingUsers?.users?.find((u: any) => u.email === email);
        if (existingUser) {
          await db.auth.admin.updateUserById(existingUser.id, { password });
          // Complete setup with existing user ID
          const { data: setupResult, error: setupError } = await db.rpc('complete_pharmacy_setup', {
            p_token: token,
            p_auth_user_id: existingUser.id,
          });

          if (setupError) {
            throw new AppError(setupError.message || 'Failed to complete setup', 500);
          }

          if (setupResult?.error) {
            throw new AppError(setupResult.message, setupResult.code || 500);
          }
        } else {
          throw new AppError('Failed to set up account. Please contact support.', 500);
        }
      } else {
        throw new AppError(authError.message || 'Failed to create account', 500);
      }
    } else if (authData?.user) {
      // New auth user created — complete setup with new user ID
      const { data: setupResult, error: setupError } = await db.rpc('complete_pharmacy_setup', {
        p_token: token,
        p_auth_user_id: authData.user.id,
      });

      if (setupError) {
        throw new AppError(setupError.message || 'Failed to complete setup', 500);
      }

      if (setupResult?.error) {
        throw new AppError(setupResult.message, setupResult.code || 500);
      }
    }

    res.status(200).json({
      status: 'success',
      message: 'Account setup completed successfully. You can now log in.',
      data: { email },
    });
  }
);

/**
 * Verify a branch invite token
 * POST /api/auth/verify-branch-invite
 */
export const verifyBranchInviteHandler = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const { token } = req.body;

    if (!token) {
      throw new AppError('Invite token is required', 400);
    }

    const { data, error } = await db.rpc('verify_branch_invite', {
      p_token: token,
    });

    if (error) {
      throw new AppError(error.message || 'Failed to verify invite', 500);
    }

    if (data?.error) {
      throw new AppError(data.message, data.code || 400);
    }

    res.status(200).json({
      status: 'success',
      data: data.data,
    });
  }
);

/**
 * Complete branch pharmacy account setup (set password + activate)
 * POST /api/auth/complete-branch-setup
 */
export const completeBranchSetupHandler = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const { token, password } = req.body;

    if (!token) {
      throw new AppError('Invite token is required', 400);
    }

    if (!password || password.length < 8) {
      throw new AppError('Password must be at least 8 characters', 400);
    }

    const { data: verifyResult, error: verifyError } = await db.rpc('verify_branch_invite', {
      p_token: token,
    });

    if (verifyError) {
      throw new AppError(verifyError.message || 'Failed to verify invite', 500);
    }

    if (verifyResult?.error) {
      throw new AppError(verifyResult.message, verifyResult.code || 400);
    }

    const { email } = verifyResult.data;

    const { data: authData, error: authError } = await db.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (authError) {
      if (authError.message?.includes('already registered') || authError.message?.includes('already exists')) {
        const { data: existingUsers } = await db.auth.admin.listUsers();
        const existingUser = existingUsers?.users?.find((u: any) => u.email === email);
        if (existingUser) {
          await db.auth.admin.updateUserById(existingUser.id, { password });
          const { data: setupResult, error: setupError } = await db.rpc('complete_branch_setup', {
            p_token: token,
            p_auth_user_id: existingUser.id,
          });

          if (setupError) throw new AppError(setupError.message || 'Failed to complete setup', 500);
          if (setupResult?.error) throw new AppError(setupResult.message, setupResult.code || 500);
        } else {
          throw new AppError('Failed to set up account. Please contact support.', 500);
        }
      } else {
        throw new AppError(authError.message || 'Failed to create account', 500);
      }
    } else if (authData?.user) {
      const { data: setupResult, error: setupError } = await db.rpc('complete_branch_setup', {
        p_token: token,
        p_auth_user_id: authData.user.id,
      });

      if (setupError) throw new AppError(setupError.message || 'Failed to complete setup', 500);
      if (setupResult?.error) throw new AppError(setupResult.message, setupResult.code || 500);
    }

    res.status(200).json({
      status: 'success',
      message: 'Branch account setup completed successfully. You can now log in.',
      data: { email },
    });
  }
);
