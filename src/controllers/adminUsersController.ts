import { Request, Response, NextFunction } from 'express';
import { catchAsync } from '../utils/catchAsync';
import { AppError } from '../utils/appError';
import * as adminUsersService from '../services/adminUsersService';

// ============================================================
// Extended Request interface for admin authentication
// ============================================================
interface AdminRequest extends Request {
  adminId?: string;
  adminEmail?: string;
  adminName?: string;
  adminRole?: string;
}

// ============================================================
// GET /api/admin/users - Get list of admin users with stats
// ============================================================
export const getAdminUsersHandler = catchAsync(
  async (req: Request, res: Response, _next: NextFunction) => {
    const {
      page = '1',
      limit = '10',
      search,
      role,
      status,
      sortBy = 'created_at',
      sortOrder = 'desc',
    } = req.query;

    const result = await adminUsersService.getAdminUsers(
      parseInt(page as string, 10),
      parseInt(limit as string, 10),
      search as string,
      role as string,
      status as string,
      sortBy as string,
      sortOrder as string
    );

    res.status(200).json({
      status: 'success',
      data: result,
    });
  }
);

// ============================================================
// GET /api/admin/users/roles - Get all available admin roles
// ============================================================
export const getAdminRolesHandler = catchAsync(
  async (_req: Request, res: Response, _next: NextFunction) => {
    const roles = await adminUsersService.getAdminRoles();

    res.status(200).json({
      status: 'success',
      data: {
        roles,
      },
    });
  }
);

// ============================================================
// GET /api/admin/users/:id - Get admin user by ID
// ============================================================
export const getAdminByIdHandler = catchAsync(
  async (req: Request, res: Response, _next: NextFunction) => {
    const { id } = req.params;

    if (!id) {
      throw new AppError('Admin ID is required', 400);
    }

    const admin = await adminUsersService.getAdminById(id);

    res.status(200).json({
      status: 'success',
      data: {
        admin,
      },
    });
  }
);

// ============================================================
// POST /api/admin/users - Create new admin user
// ============================================================
export const createAdminHandler = catchAsync(
  async (req: Request, res: Response, _next: NextFunction) => {
    const { email, password, name, role, permissions } = req.body;

    if (!email || !password || !name) {
      throw new AppError('Email, password, and name are required', 400);
    }

    const admin = await adminUsersService.createAdmin({
      email,
      password,
      name,
      role,
      permissions,
    });

    res.status(201).json({
      status: 'success',
      message: 'Admin user created successfully',
      data: {
        admin,
      },
    });
  }
);

// ============================================================
// PATCH /api/admin/users/:id - Update admin user
// ============================================================
export const updateAdminHandler = catchAsync(
  async (req: Request, res: Response, _next: NextFunction) => {
    const { id } = req.params;
    const { name, email, role, isActive, permissions } = req.body;

    if (!id) {
      throw new AppError('Admin ID is required', 400);
    }

    const admin = await adminUsersService.updateAdmin(id, {
      name,
      email,
      role,
      isActive,
      permissions,
    });

    res.status(200).json({
      status: 'success',
      message: 'Admin user updated successfully',
      data: {
        admin,
      },
    });
  }
);

// ============================================================
// PATCH /api/admin/users/:id/password - Update admin password
// ============================================================
export const updateAdminPasswordHandler = catchAsync(
  async (req: Request, res: Response, _next: NextFunction) => {
    const { id } = req.params;
    const { newPassword } = req.body;

    if (!id) {
      throw new AppError('Admin ID is required', 400);
    }

    if (!newPassword) {
      throw new AppError('New password is required', 400);
    }

    await adminUsersService.updateAdminPassword(id, newPassword);

    res.status(200).json({
      status: 'success',
      message: 'Password updated successfully',
    });
  }
);

// ============================================================
// DELETE /api/admin/users/:id - Delete admin user
// ============================================================
export const deleteAdminHandler = catchAsync(
  async (req: AdminRequest, res: Response, _next: NextFunction) => {
    const { id } = req.params;

    if (!id) {
      throw new AppError('Admin ID is required', 400);
    }

    // Get requesting admin's ID from auth middleware
    const requestingAdminId = req.adminId;

    if (!requestingAdminId) {
      throw new AppError('Authentication required', 401);
    }

    await adminUsersService.deleteAdmin(id, requestingAdminId);

    res.status(200).json({
      status: 'success',
      message: 'Admin user deleted successfully',
    });
  }
);

