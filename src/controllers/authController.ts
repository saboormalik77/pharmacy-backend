import { Request, Response, NextFunction } from 'express';
import { signup, signin, refreshToken, logout, logoutAll, forgotPassword, resetPassword, verifyResetToken } from '../services/authService';
import { catchAsync } from '../utils/catchAsync';
import { AppError } from '../utils/appError';

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

    const result = await signin({ email, password, fcmToken });

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

    const result = await forgotPassword(email, redirectTo);

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
