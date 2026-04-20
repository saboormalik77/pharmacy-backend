import { Request, Response, NextFunction } from 'express';
import { adminLogin, adminForgotPassword, adminVerifyResetToken, adminResetPassword } from '../services/adminService';
import { catchAsync } from '../utils/catchAsync';
import { AppError } from '../utils/appError';

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Admin login endpoint
 *     description: Authenticates admin user with email and password. Returns JWT token and user data.
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: admin@pharmadmin.com
 *               password:
 *                 type: string
 *                 format: password
 *                 example: your_password_here
 *     responses:
 *       200:
 *         description: Admin successfully authenticated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 token:
 *                   type: string
 *                   example: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
 *                 accessToken:
 *                   type: string
 *                   example: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
 *                 access_token:
 *                   type: string
 *                   example: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
 *                 user:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       example: user_id_here
 *                     email:
 *                       type: string
 *                       example: admin@pharmadmin.com
 *                     name:
 *                       type: string
 *                       example: Admin User
 *                     role:
 *                       type: string
 *                       example: admin
 *       401:
 *         description: Unauthorized - invalid credentials
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Invalid email or password
 *       400:
 *         description: Bad request - validation error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Please provide email and password
 */
export const loginHandler = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const { email, password } = req.body;

    if (!email || !password) {
      throw new AppError('Please provide email and password', 400);
    }

    // Tenant enforcement:
    // - req.tenant === null   -> localhost / dev (no enforcement)
    // - req.tenant !== null   -> production domain; portal type must be 'admin'
    if (req.tenant && req.tenant.portalType !== 'admin') {
      throw new AppError('This domain is not configured for admin access', 403);
    }
    const tenantBuyingGroupId = req.tenant?.buyingGroupId ?? null;
    const result = await adminLogin({ email, password }, tenantBuyingGroupId);

    // Return response in the format expected by frontend
    // Frontend will look for token, accessToken, or access_token
    res.status(200).json({
      token: result.token,
      accessToken: result.accessToken,
      access_token: result.access_token,
      user: result.user,
    });
  }
);

/**
 * Admin forgot password handler
 * POST /api/auth/admin/forgot-password
 * Uses Supabase's built-in email service (same as pharmacy)
 */
export const adminForgotPasswordHandler = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const { email, redirectTo } = req.body;

    if (!email) {
      throw new AppError('Email is required', 400);
    }

    // Uses Supabase's built-in email service (same as pharmacy)
    const result = await adminForgotPassword(email, redirectTo);

    res.status(200).json({
      status: 'success',
      message: result.message,
    });
  }
);

/**
 * Admin verify reset token handler
 * POST /api/auth/admin/verify-reset-token
 * Uses Supabase Auth (same as pharmacy)
 */
export const adminVerifyResetTokenHandler = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const { token, accessToken } = req.body;
    const tokenToVerify = accessToken || token;

    if (!tokenToVerify) {
      throw new AppError('Reset token is required', 400);
    }

    const result = await adminVerifyResetToken(tokenToVerify);

    res.status(200).json({
      status: 'success',
      data: result,
    });
  }
);

/**
 * Admin reset password handler
 * POST /api/auth/admin/reset-password
 * Uses Supabase Auth (same as pharmacy)
 */
export const adminResetPasswordHandler = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const { token, accessToken, newPassword } = req.body;
    const tokenToUse = accessToken || token;

    if (!tokenToUse) {
      throw new AppError('Reset token is required', 400);
    }

    if (!newPassword) {
      throw new AppError('New password is required', 400);
    }

    if (newPassword.length < 8) {
      throw new AppError('Password must be at least 8 characters long', 400);
    }

    const result = await adminResetPassword(tokenToUse, newPassword);

    res.status(200).json({
      status: 'success',
      message: result.message,
    });
  }
);
