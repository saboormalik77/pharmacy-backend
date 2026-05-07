import { Request, Response, NextFunction } from 'express';
import { supabaseAdmin } from '../config/supabase';
import { AppError } from '../utils/appError';

const db = supabaseAdmin!;

export const createRoleHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { roleName, description, permissionKeys } = req.body;
    if (!roleName) throw new AppError('Role name is required', 400);

    const { data, error } = await db.rpc('create_pharmacy_role', {
      p_parent_pharmacy_id: req.pharmacyId,
      p_role_name: roleName,
      p_description: description || null,
      p_permission_keys: permissionKeys || [],
    });

    if (error) throw new AppError(error.message, 500);
    if (data?.error) throw new AppError(data.message, data.code || 400);

    res.status(201).json({ status: 'success', message: 'Role created successfully', data: data.data });
  } catch (error) {
    next(error);
  }
};

export const listRolesHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { data, error } = await db.rpc('list_pharmacy_roles', {
      p_parent_pharmacy_id: req.pharmacyId,
    });

    if (error) throw new AppError(error.message, 500);
    if (data?.error) throw new AppError(data.message, data.code || 400);

    res.status(200).json({ status: 'success', data: data.data });
  } catch (error) {
    next(error);
  }
};

export const getRoleDetailHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    if (!id) throw new AppError('Role ID is required', 400);

    const { data, error } = await db.rpc('get_pharmacy_role_detail', {
      p_parent_pharmacy_id: req.pharmacyId,
      p_role_id: id,
    });

    if (error) throw new AppError(error.message, 500);
    if (data?.error) throw new AppError(data.message, data.code || 400);

    res.status(200).json({ status: 'success', data: data.data });
  } catch (error) {
    next(error);
  }
};

export const updateRoleHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    if (!id) throw new AppError('Role ID is required', 400);

    const { roleName, description, permissionKeys } = req.body;

    const { data, error } = await db.rpc('update_pharmacy_role', {
      p_parent_pharmacy_id: req.pharmacyId,
      p_role_id: id,
      p_role_name: roleName || null,
      p_description: description !== undefined ? description : null,
      p_permission_keys: permissionKeys !== undefined ? permissionKeys : null,
    });

    if (error) throw new AppError(error.message, 500);
    if (data?.error) throw new AppError(data.message, data.code || 400);

    res.status(200).json({ status: 'success', message: 'Role updated successfully', data: data.data });
  } catch (error) {
    next(error);
  }
};

export const deleteRoleHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    if (!id) throw new AppError('Role ID is required', 400);

    const { data, error } = await db.rpc('delete_pharmacy_role', {
      p_parent_pharmacy_id: req.pharmacyId,
      p_role_id: id,
    });

    if (error) throw new AppError(error.message, 500);
    if (data?.error) throw new AppError(data.message, data.code || 400);

    res.status(200).json({ status: 'success', message: 'Role deleted successfully' });
  } catch (error) {
    next(error);
  }
};

export const assignRoleToBranchHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { roleId, branchId } = req.params;
    if (!roleId || !branchId) throw new AppError('Role ID and Branch ID are required', 400);

    const { data, error } = await db.rpc('assign_role_to_branch', {
      p_parent_pharmacy_id: req.pharmacyId,
      p_branch_pharmacy_id: branchId,
      p_role_id: roleId,
    });

    if (error) throw new AppError(error.message, 500);
    if (data?.error) throw new AppError(data.message, data.code || 400);

    res.status(200).json({ status: 'success', message: 'Role assigned to branch successfully' });
  } catch (error) {
    next(error);
  }
};

export const removeRoleFromBranchHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { roleId, branchId } = req.params;
    if (!roleId || !branchId) throw new AppError('Role ID and Branch ID are required', 400);

    const { data, error } = await db.rpc('remove_role_from_branch', {
      p_parent_pharmacy_id: req.pharmacyId,
      p_branch_pharmacy_id: branchId,
      p_role_id: roleId,
    });

    if (error) throw new AppError(error.message, 500);
    if (data?.error) throw new AppError(data.message, data.code || 400);

    res.status(200).json({ status: 'success', message: 'Role removed from branch successfully' });
  } catch (error) {
    next(error);
  }
};

export const listAllPermissionsHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { data, error } = await db.rpc('list_all_pharmacy_permissions');

    if (error) throw new AppError(error.message, 500);
    if (data?.error) throw new AppError(data.message, data.code || 400);

    res.status(200).json({ status: 'success', data: data.data });
  } catch (error) {
    next(error);
  }
};

export const getBranchPermissionsHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { branchId } = req.params;
    if (!branchId) throw new AppError('Branch ID is required', 400);

    const { data, error } = await db.rpc('get_branch_effective_permissions', {
      p_pharmacy_id: branchId,
    });

    if (error) throw new AppError(error.message, 500);
    if (data?.error) throw new AppError(data.message, data.code || 400);

    res.status(200).json({ status: 'success', data: data.data });
  } catch (error) {
    next(error);
  }
};
