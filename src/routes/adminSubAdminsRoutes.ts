import { Router, Request, Response } from 'express';
import { authenticateAdmin, requirePermission } from '../middleware/adminAuth';
import { catchAsync } from '../utils/catchAsync';
import { AppError } from '../utils/appError';
import { supabaseAdmin } from '../config/supabase';
import * as adminUsersService from '../services/adminUsersService';

interface AdminRequest extends Request {
  adminId?: string;
  adminBuyingGroupId?: string | null;
}

const router = Router();

router.use(authenticateAdmin);
router.use(requirePermission('sub_admins'));

// GET /api/admin/sub-admins — list sub-admins for the caller's buying group
router.get('/', catchAsync(async (req: AdminRequest, res: Response) => {
  if (!supabaseAdmin) throw new AppError('Supabase admin client not configured', 500);

  const buyingGroupId = req.adminBuyingGroupId;
  if (!buyingGroupId) throw new AppError('This endpoint is only available to buying group admins', 403);

  const { page = '1', limit = '20', search, role, status } = req.query;

  const { data, error } = await supabaseAdmin.rpc('get_buying_group_sub_admins', {
    p_buying_group_id: buyingGroupId,
    p_page: parseInt(page as string, 10),
    p_limit: parseInt(limit as string, 10),
    p_search: search || null,
    p_role: role || null,
    p_status: status || null,
  });

  if (error) throw new AppError(`Failed to fetch sub-admins: ${error.message}`, 400);
  if (data.error) throw new AppError(data.message, 400);

  res.json({ status: 'success', data });
}));

// GET /api/admin/sub-admins/roles — available roles for sub-admins
router.get('/roles', catchAsync(async (_req: Request, res: Response) => {
  res.json({
    status: 'success',
    data: {
      roles: [
        { value: 'manager', label: 'Manager', description: 'Manage pharmacies, approve documents, process payments, view analytics', color: 'warning' },
        { value: 'reviewer', label: 'Reviewer', description: 'Review documents, approve/reject returns, view shipments', color: 'info' },
        { value: 'support', label: 'Support', description: 'View-only access, customer support, generate reports', color: 'default' },
      ],
    },
  });
}));

// GET /api/admin/sub-admins/permissions — available permissions for sub-admins
router.get('/permissions', (_req: Request, res: Response) => {
  res.json({
    status: 'success',
    data: {
      permissions: [
        { key: 'dashboard', label: 'Dashboard', description: 'View the main dashboard' },
        { key: 'pharmacies', label: 'Pharmacies', description: 'View and manage pharmacies' },
        { key: 'analytics', label: 'Analytics', description: 'View analytics and reports' },
        { key: 'settings', label: 'Settings', description: 'View and update settings' },
        { key: 'processors', label: 'Processors', description: 'Manage field processors' },
        { key: 'service_requests', label: 'Service Requests', description: 'View and manage service requests' },
        { key: 'sub_admins', label: 'Sub-Admins', description: 'Manage sub-admins (this permission)' },
      ],
    },
  });
});

// POST /api/admin/sub-admins — create sub-admin in caller's buying group
router.post('/', catchAsync(async (req: AdminRequest, res: Response) => {
  const buyingGroupId = req.adminBuyingGroupId;
  if (!buyingGroupId) throw new AppError('This endpoint is only available to buying group admins', 403);

  const { email, password, name, role, permissions } = req.body;

  if (!email || !password || !name) throw new AppError('Email, password, and name are required', 400);
  if (!role || !['manager', 'reviewer', 'support'].includes(role)) {
    throw new AppError('Role must be one of: manager, reviewer, support', 400);
  }

  const admin = await adminUsersService.createAdmin({
    email,
    password,
    name,
    role,
    permissions: permissions || [],
    buyingGroupId,
  });

  res.status(201).json({ status: 'success', message: 'Sub-admin created successfully', data: { admin } });
}));

// PATCH /api/admin/sub-admins/:id — update sub-admin
router.patch('/:id', catchAsync(async (req: AdminRequest, res: Response) => {
  if (!supabaseAdmin) throw new AppError('Supabase admin client not configured', 500);

  const buyingGroupId = req.adminBuyingGroupId;
  if (!buyingGroupId) throw new AppError('This endpoint is only available to buying group admins', 403);

  const { id } = req.params;

  // Verify this sub-admin belongs to the caller's buying group and is not a super_admin
  const { data: target } = await supabaseAdmin
    .from('admin')
    .select('id, role, buying_group_id')
    .eq('id', id)
    .single();

  if (!target) throw new AppError('Sub-admin not found', 404);
  if (target.buying_group_id !== buyingGroupId) throw new AppError('Access denied', 403);
  if (target.role === 'super_admin') throw new AppError('Cannot modify the buying group owner', 403);

  const { name, email, role, isActive, permissions } = req.body;

  if (role && !['manager', 'reviewer', 'support'].includes(role)) {
    throw new AppError('Role must be one of: manager, reviewer, support', 400);
  }

  const admin = await adminUsersService.updateAdmin(id, { name, email, role, isActive, permissions });

  res.json({ status: 'success', message: 'Sub-admin updated successfully', data: { admin } });
}));

// DELETE /api/admin/sub-admins/:id — delete sub-admin
router.delete('/:id', catchAsync(async (req: AdminRequest, res: Response) => {
  if (!supabaseAdmin) throw new AppError('Supabase admin client not configured', 500);

  const buyingGroupId = req.adminBuyingGroupId;
  if (!buyingGroupId) throw new AppError('This endpoint is only available to buying group admins', 403);

  const requestingAdminId = req.adminId;
  if (!requestingAdminId) throw new AppError('Authentication required', 401);

  const { id } = req.params;

  if (id === requestingAdminId) throw new AppError('Cannot delete your own account', 400);

  // Verify this sub-admin belongs to the caller's buying group and is not a super_admin
  const { data: target } = await supabaseAdmin
    .from('admin')
    .select('id, role, buying_group_id')
    .eq('id', id)
    .single();

  if (!target) throw new AppError('Sub-admin not found', 404);
  if (target.buying_group_id !== buyingGroupId) throw new AppError('Access denied', 403);
  if (target.role === 'super_admin') throw new AppError('Cannot delete the buying group owner', 403);

  await adminUsersService.deleteAdmin(id, requestingAdminId);

  res.json({ status: 'success', message: 'Sub-admin deleted successfully' });
}));

export default router;
