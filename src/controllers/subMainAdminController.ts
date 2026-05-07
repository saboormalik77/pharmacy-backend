import { Request, Response, NextFunction } from 'express';
import {
  createSubMainAdmin,
  getSubMainAdmins,
  getSubMainAdminById,
  updateSubMainAdmin,
  deleteSubMainAdmin,
  resendSubAdminInvite,
  validateInviteToken,
  acceptInvite,
  ALL_MAIN_ADMIN_PERMISSIONS,
} from '../services/subMainAdminService';
import { catchAsync } from '../utils/catchAsync';
import { AppError } from '../utils/appError';

export const getPermissionsListHandler = catchAsync(
  async (_req: Request, res: Response, _next: NextFunction) => {
    res.status(200).json({ permissions: ALL_MAIN_ADMIN_PERMISSIONS });
  }
);

export const createSubMainAdminHandler = catchAsync(
  async (req: Request, res: Response, _next: NextFunction) => {
    const { email, name, role, permissions } = req.body;

    if (!email || !name) {
      throw new AppError('Email and name are required', 400);
    }

    if (!permissions || !Array.isArray(permissions) || permissions.length === 0) {
      throw new AppError('At least one permission is required', 400);
    }

    const result = await createSubMainAdmin({
      email,
      name,
      role: role || 'sub_admin',
      permissions,
      createdBy: req.mainAdminId!,
    });

    res.status(201).json(result);
  }
);

export const getSubMainAdminsHandler = catchAsync(
  async (req: Request, res: Response, _next: NextFunction) => {
    const { page, limit, search, status } = req.query;

    const result = await getSubMainAdmins({
      page: page ? parseInt(page as string, 10) : 1,
      limit: limit ? parseInt(limit as string, 10) : 10,
      search: search as string,
      status: status as string,
    });

    res.status(200).json(result);
  }
);

export const getSubMainAdminByIdHandler = catchAsync(
  async (req: Request, res: Response, _next: NextFunction) => {
    const { id } = req.params;

    if (!id) {
      throw new AppError('Sub admin ID is required', 400);
    }

    const result = await getSubMainAdminById(id);
    res.status(200).json(result);
  }
);

export const updateSubMainAdminHandler = catchAsync(
  async (req: Request, res: Response, _next: NextFunction) => {
    const { id } = req.params;
    const { name, email, role, permissions, isActive } = req.body;

    if (!id) {
      throw new AppError('Sub admin ID is required', 400);
    }

    const result = await updateSubMainAdmin(id, {
      name,
      email,
      role,
      permissions,
      isActive,
    });

    res.status(200).json(result);
  }
);

export const deleteSubMainAdminHandler = catchAsync(
  async (req: Request, res: Response, _next: NextFunction) => {
    const { id } = req.params;

    if (!id) {
      throw new AppError('Sub admin ID is required', 400);
    }

    const result = await deleteSubMainAdmin(id);
    res.status(200).json(result);
  }
);

export const resendInviteHandler = catchAsync(
  async (req: Request, res: Response, _next: NextFunction) => {
    const { id } = req.params;

    if (!id) {
      throw new AppError('Sub admin ID is required', 400);
    }

    const result = await resendSubAdminInvite(id);
    res.status(200).json(result);
  }
);

export const validateInviteTokenHandler = catchAsync(
  async (req: Request, res: Response, _next: NextFunction) => {
    const { token } = req.query;

    if (!token) {
      throw new AppError('Invite token is required', 400);
    }

    const result = await validateInviteToken(token as string);
    res.status(200).json(result);
  }
);

export const acceptInviteHandler = catchAsync(
  async (req: Request, res: Response, _next: NextFunction) => {
    const { token, password } = req.body;

    if (!token || !password) {
      throw new AppError('Token and password are required', 400);
    }

    if (password.length < 8) {
      throw new AppError('Password must be at least 8 characters', 400);
    }

    const result = await acceptInvite(token, password);
    res.status(200).json(result);
  }
);
