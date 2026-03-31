import { supabaseAdmin } from '../config/supabase';
import { AppError } from '../utils/appError';
import bcrypt from 'bcryptjs';

// ============================================================
// Interfaces
// ============================================================

export interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: string;
  roleDisplay: string;
  isActive: boolean;
  status: string;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AdminStats {
  totalAdmins: number;
  activeAdmins: number;
  inactiveAdmins: number;
  superAdmins: number;
  managers: number;
  reviewers: number;
  support: number;
  byRole: {
    super_admin: number;
    manager: number;
    reviewer: number;
    support: number;
  };
}

export interface AdminRole {
  value: string;
  label: string;
  description: string;
  color: string;
}

export interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface AdminListResponse {
  admins: AdminUser[];
  stats: AdminStats;
  pagination: PaginationInfo;
}

export interface CreateAdminData {
  email: string;
  password: string;
  name: string;
  role?: string;
  permissions?: string[];
}

export interface UpdateAdminData {
  name?: string;
  email?: string;
  role?: string;
  isActive?: boolean;
  permissions?: string[];
}

// ============================================================
// Service Functions
// ============================================================

/**
 * Get list of admin users with stats, pagination, and filters
 * Uses PostgreSQL RPC function - no custom JS logic
 */
export const getAdminUsers = async (
  page: number = 1,
  limit: number = 10,
  search?: string,
  role?: string,
  status?: string,
  sortBy: string = 'created_at',
  sortOrder: string = 'desc'
): Promise<AdminListResponse> => {
  if (!supabaseAdmin) {
    throw new AppError('Supabase admin client not configured', 500);
  }

  let { data, error } = await supabaseAdmin.rpc('get_admin_users_list', {
    p_page: page,
    p_limit: limit,
    p_search: search || null,
    p_role: role || null,
    p_status: status || null,
    p_sort_by: sortBy,
    p_sort_order: sortOrder,
  });

  // Backward-compatible fallback while DB migration is pending
  if (error?.message?.includes('permissions')) {
    const { data: fallbackRows, error: fallbackError, count } = await supabaseAdmin
      .from('admin')
      .select('id, email, name, role, is_active, last_login_at, created_at, updated_at', { count: 'exact' })
      .order(sortBy === 'last_login_at' ? 'last_login_at' : sortBy, { ascending: sortOrder === 'asc' })
      .range((page - 1) * limit, (page * limit) - 1);

    if (fallbackError) {
      throw new AppError(`Failed to fetch admin users: ${fallbackError.message}`, 400);
    }

    const rows = (fallbackRows || []).filter((a: any) => {
      const matchesSearch = !search || [a.name, a.email, a.id].some((v) =>
        String(v || '').toLowerCase().includes(search.toLowerCase())
      );
      const matchesRole = !role || role === 'all' || a.role === role;
      const matchesStatus = !status || status === 'all'
        || (status === 'active' && a.is_active)
        || (status === 'inactive' && !a.is_active);
      return matchesSearch && matchesRole && matchesStatus;
    });

    const admins = rows.map((a: any) => ({
      id: a.id,
      email: a.email,
      name: a.name,
      role: a.role,
      roleDisplay: a.role === 'super_admin' ? 'Super Admin' : a.role === 'manager' ? 'Manager' : a.role === 'reviewer' ? 'Reviewer' : 'Support',
      isActive: a.is_active,
      status: a.is_active ? 'active' : 'inactive',
      permissions: [],
      lastLoginAt: a.last_login_at,
      createdAt: a.created_at,
      updatedAt: a.updated_at,
    }));

    const roleCounts = (fallbackRows || []).reduce((acc: any, a: any) => {
      acc[a.role] = (acc[a.role] || 0) + 1;
      return acc;
    }, { super_admin: 0, manager: 0, reviewer: 0, support: 0 });

    return {
      admins,
      stats: {
        totalAdmins: count || 0,
        activeAdmins: (fallbackRows || []).filter((a: any) => a.is_active).length,
        inactiveAdmins: (fallbackRows || []).filter((a: any) => !a.is_active).length,
        superAdmins: roleCounts.super_admin || 0,
        managers: roleCounts.manager || 0,
        reviewers: roleCounts.reviewer || 0,
        support: roleCounts.support || 0,
        byRole: roleCounts,
      },
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.max(1, Math.ceil((count || 0) / limit)),
      },
    };
  }

  if (error) {
    throw new AppError(`Failed to fetch admin users: ${error.message}`, 400);
  }

  // The RPC may not return permissions yet; fetch them directly
  let admins = data.admins || [];
  if (admins.length > 0 && admins[0].permissions === undefined) {
    try {
      const ids = admins.map((a: any) => a.id);
      const { data: permRows } = await supabaseAdmin
        .from('admin')
        .select('id, permissions')
        .in('id', ids);
      if (permRows) {
        const permMap = new Map(permRows.map((r: any) => [r.id, r.permissions || []]));
        admins = admins.map((a: any) => ({ ...a, permissions: permMap.get(a.id) || [] }));
      }
    } catch {
      // Column may not exist yet; default to empty
      admins = admins.map((a: any) => ({ ...a, permissions: [] }));
    }
  }

  return {
    admins,
    stats: data.stats,
    pagination: data.pagination,
  };
};

/**
 * Get admin user by ID
 * Uses PostgreSQL RPC function
 */
export const getAdminById = async (adminId: string): Promise<AdminUser> => {
  if (!supabaseAdmin) {
    throw new AppError('Supabase admin client not configured', 500);
  }

  let { data, error } = await supabaseAdmin.rpc('get_admin_user_by_id', {
    p_admin_id: adminId,
  });

  // Backward-compatible fallback while DB migration is pending
  if (error?.message?.includes('permissions')) {
    const { data: row, error: fallbackError } = await supabaseAdmin
      .from('admin')
      .select('id, email, name, role, is_active, last_login_at, created_at, updated_at')
      .eq('id', adminId)
      .single();

    if (fallbackError || !row) {
      throw new AppError('Admin user not found', 404);
    }

    return {
      id: row.id,
      email: row.email,
      name: row.name,
      role: row.role,
      roleDisplay: row.role === 'super_admin' ? 'Super Admin' : row.role === 'manager' ? 'Manager' : row.role === 'reviewer' ? 'Reviewer' : 'Support',
      isActive: row.is_active,
      status: row.is_active ? 'active' : 'inactive',
      permissions: [],
      lastLoginAt: row.last_login_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    } as AdminUser;
  }

  if (error) {
    throw new AppError(`Failed to fetch admin user: ${error.message}`, 400);
  }

  if (data.error) {
    throw new AppError(data.message, 404);
  }

  let admin = data.admin;
  // Fetch permissions directly if the RPC doesn't return them
  if (admin && admin.permissions === undefined) {
    try {
      const { data: row } = await supabaseAdmin
        .from('admin')
        .select('permissions')
        .eq('id', adminId)
        .single();
      admin = { ...admin, permissions: row?.permissions || [] };
    } catch {
      admin = { ...admin, permissions: [] };
    }
  }

  return admin;
};

/**
 * Create new admin user
 * Password is hashed in application layer, then passed to RPC function
 */
export const createAdmin = async (adminData: CreateAdminData): Promise<AdminUser> => {
  if (!supabaseAdmin) {
    throw new AppError('Supabase admin client not configured', 500);
  }

  // Validate required fields
  if (!adminData.email || !adminData.password || !adminData.name) {
    throw new AppError('Email, password, and name are required', 400);
  }

  // Validate password strength
  if (adminData.password.length < 8) {
    throw new AppError('Password must be at least 8 characters long', 400);
  }

  // Hash password
  const passwordHash = await bcrypt.hash(adminData.password, 10);

  const { data, error } = await supabaseAdmin.rpc('create_admin_user', {
    p_email: adminData.email.toLowerCase().trim(),
    p_password_hash: passwordHash,
    p_name: adminData.name.trim(),
    p_role: adminData.role || 'support',
  });

  if (error) {
    throw new AppError(`Failed to create admin user: ${error.message}`, 400);
  }

  if (data.error) {
    throw new AppError(data.message, 400);
  }

  // Store permissions directly (RPC may not support the column yet)
  if (adminData.permissions && data.admin?.id) {
    try {
      await supabaseAdmin
        .from('admin')
        .update({ permissions: adminData.permissions })
        .eq('id', data.admin.id);
    } catch { /* column may not exist yet */ }
  }

  return { ...data.admin, permissions: adminData.permissions || [] };
};

/**
 * Update admin user
 * Uses PostgreSQL RPC function
 */
export const updateAdmin = async (
  adminId: string,
  updateData: UpdateAdminData
): Promise<AdminUser> => {
  if (!supabaseAdmin) {
    throw new AppError('Supabase admin client not configured', 500);
  }

  const { data, error } = await supabaseAdmin.rpc('update_admin_user', {
    p_admin_id: adminId,
    p_name: updateData.name || null,
    p_email: updateData.email?.toLowerCase().trim() || null,
    p_role: updateData.role || null,
    p_is_active: updateData.isActive !== undefined ? updateData.isActive : null,
  });

  if (error) {
    throw new AppError(`Failed to update admin user: ${error.message}`, 400);
  }

  if (data.error) {
    throw new AppError(data.message, 400);
  }

  // Store permissions directly (RPC may not support the column yet)
  if (updateData.permissions !== undefined) {
    try {
      await supabaseAdmin
        .from('admin')
        .update({ permissions: updateData.permissions })
        .eq('id', adminId);
    } catch { /* column may not exist yet */ }
  }

  return { ...data.admin, permissions: updateData.permissions ?? data.admin?.permissions ?? [] };
};

/**
 * Update admin password
 * Password is hashed in application layer, then passed to RPC function
 */
export const updateAdminPassword = async (
  adminId: string,
  newPassword: string
): Promise<void> => {
  if (!supabaseAdmin) {
    throw new AppError('Supabase admin client not configured', 500);
  }

  // Validate password strength
  if (newPassword.length < 8) {
    throw new AppError('Password must be at least 8 characters long', 400);
  }

  // Hash password
  const passwordHash = await bcrypt.hash(newPassword, 10);

  const { data, error } = await supabaseAdmin.rpc('update_admin_password', {
    p_admin_id: adminId,
    p_new_password_hash: passwordHash,
  });

  if (error) {
    throw new AppError(`Failed to update password: ${error.message}`, 400);
  }

  if (data.error) {
    throw new AppError(data.message, 400);
  }
};

/**
 * Delete admin user
 * Uses PostgreSQL RPC function
 */
export const deleteAdmin = async (
  adminId: string,
  requestingAdminId: string
): Promise<void> => {
  if (!supabaseAdmin) {
    throw new AppError('Supabase admin client not configured', 500);
  }

  const { data, error } = await supabaseAdmin.rpc('delete_admin_user', {
    p_admin_id: adminId,
    p_requesting_admin_id: requestingAdminId,
  });

  if (error) {
    throw new AppError(`Failed to delete admin user: ${error.message}`, 400);
  }

  if (data.error) {
    throw new AppError(data.message, 400);
  }
};

/**
 * Get all available admin roles
 * Uses PostgreSQL RPC function
 */
export const getAdminRoles = async (): Promise<AdminRole[]> => {
  if (!supabaseAdmin) {
    throw new AppError('Supabase admin client not configured', 500);
  }

  const { data, error } = await supabaseAdmin.rpc('get_admin_roles');

  if (error) {
    throw new AppError(`Failed to fetch admin roles: ${error.message}`, 400);
  }

  return data.roles || [];
};

