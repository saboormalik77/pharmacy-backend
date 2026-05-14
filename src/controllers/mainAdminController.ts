import { Request, Response, NextFunction } from 'express';
import {
  mainAdminLogin,
  getBuyingGroups,
  getBuyingGroupById,
  createBuyingGroup,
  updateBuyingGroup,
  deleteBuyingGroup,
  listBuyingGroupDomains,
  upsertBuyingGroupDomain,
  deleteBuyingGroupDomain,
} from '../services/mainAdminService';
import { catchAsync } from '../utils/catchAsync';
import { AppError } from '../utils/appError';

export const mainAdminLoginHandler = catchAsync(
  async (req: Request, res: Response, _next: NextFunction) => {
    const { email, password } = req.body;

    if (!email || !password) {
      throw new AppError('Please provide email and password', 400);
    }

    const result = await mainAdminLogin({ email, password });

    res.status(200).json({
      token: result.token,
      accessToken: result.accessToken,
      access_token: result.access_token,
      user: result.user,
    });

  }
);

export const getBuyingGroupsHandler = catchAsync(
  async (req: Request, res: Response, _next: NextFunction) => {
    const { page, limit, search, status, sortBy, sortOrder } = req.query;

    const result = await getBuyingGroups({
      page: page ? parseInt(page as string, 10) : 1,
      limit: limit ? parseInt(limit as string, 10) : 10,
      search: search as string,
      status: status as string,
      sortBy: sortBy as string,
      sortOrder: sortOrder as string,
    });

    res.status(200).json(result);
  }
);

export const getBuyingGroupByIdHandler = catchAsync(
  async (req: Request, res: Response, _next: NextFunction) => {
    const { id } = req.params;

    if (!id) {
      throw new AppError('Buying group ID is required', 400);
    }

    const result = await getBuyingGroupById(id);

    res.status(200).json(result);
  }
);

export const createBuyingGroupHandler = catchAsync(
  async (req: Request, res: Response, _next: NextFunction) => {
    const {
      name,
      contactEmail,
      contactPhone,
      address,
      notes,
      adminEmail,
      adminPassword,
      adminName,
      supabaseUrl,
      supabaseAnonKey,
      supabaseServiceRoleKey,
      supabaseEnabled,
    } = req.body;

    if (!name) {
      throw new AppError('Buying group name is required', 400);
    }

    if (adminEmail && !adminPassword) {
      throw new AppError('Admin password is required when providing admin email', 400);
    }

    const result = await createBuyingGroup({
      name,
      contactEmail,
      contactPhone,
      address,
      notes,
      adminEmail,
      adminPassword,
      adminName,
      supabaseUrl,
      supabaseAnonKey,
      supabaseServiceRoleKey,
      supabaseEnabled: typeof supabaseEnabled === 'boolean' ? supabaseEnabled : Boolean(supabaseEnabled),
    });

    res.status(201).json(result);
  }
);

export const updateBuyingGroupHandler = catchAsync(
  async (req: Request, res: Response, _next: NextFunction) => {
    const { id } = req.params;
    const {
      name,
      contactEmail,
      contactPhone,
      address,
      status,
      notes,
      supabaseUrl,
      supabaseAnonKey,
      supabaseServiceRoleKey,
      supabaseEnabled,
    } = req.body;

    if (!id) {
      throw new AppError('Buying group ID is required', 400);
    }

    const result = await updateBuyingGroup(id, {
      name,
      contactEmail,
      contactPhone,
      address,
      status,
      notes,
      supabaseUrl,
      supabaseAnonKey,
      supabaseServiceRoleKey,
      supabaseEnabled:
        typeof supabaseEnabled === 'boolean' ? supabaseEnabled : supabaseEnabled === undefined ? undefined : Boolean(supabaseEnabled),
    });

    res.status(200).json(result);
  }
);

export const deleteBuyingGroupHandler = catchAsync(
  async (req: Request, res: Response, _next: NextFunction) => {
    const { id } = req.params;

    if (!id) {
      throw new AppError('Buying group ID is required', 400);
    }

    const result = await deleteBuyingGroup(id);

    res.status(200).json(result);
  }
);

// ============================================================
// Buying Group Domain Management (MainAdmin)
// ============================================================

export const getBuyingGroupDomainsHandler = catchAsync(
  async (req: Request, res: Response, _next: NextFunction) => {
    const { id } = req.params;
    if (!id) throw new AppError('Buying group ID is required', 400);

    const data = await listBuyingGroupDomains(id);
    res.status(200).json({ status: 'success', data });
  }
);

export const upsertBuyingGroupDomainHandler = catchAsync(
  async (req: Request, res: Response, _next: NextFunction) => {
    const { id } = req.params;
    const { domain, adminHostname, pharmacyHostname } = req.body;

    if (!id) throw new AppError('Buying group ID is required', 400);
    if (!domain) throw new AppError('Domain is required', 400);

    const result = await upsertBuyingGroupDomain(id, {
      domain,
      adminHostname,
      pharmacyHostname,
    });
    res.status(200).json(result);
  }
);

export const deleteBuyingGroupDomainHandler = catchAsync(
  async (req: Request, res: Response, _next: NextFunction) => {
    const { domainId } = req.params;
    if (!domainId) throw new AppError('Domain ID is required', 400);

    const result = await deleteBuyingGroupDomain(domainId);
    res.status(200).json(result);
  }
);
