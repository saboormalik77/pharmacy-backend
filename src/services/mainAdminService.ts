import { supabaseAdmin } from '../config/supabase';
import { AppError } from '../utils/appError';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const db = supabaseAdmin || null;

const JWT_SECRET = process.env.JWT_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || 'your-secret-key-change-in-production';
const JWT_EXPIRES_IN: string = process.env.MAIN_ADMIN_JWT_EXPIRES_IN || '24h';
const JWT_EXPIRES_IN_SECONDS: number = process.env.MAIN_ADMIN_JWT_EXPIRES_IN_SECONDS
  ? parseInt(process.env.MAIN_ADMIN_JWT_EXPIRES_IN_SECONDS, 10)
  : 86400;

export interface MainAdminLoginData {
  email: string;
  password: string;
}

export interface MainAdminAuthResponse {
  user: {
    id: string;
    email: string;
    name: string;
    role: string;
    permissions: string[];
  };
  token: string;
  accessToken?: string;
  access_token?: string;
  expiresIn: number;
  expiresAt: number;
}

export const mainAdminLogin = async (data: MainAdminLoginData): Promise<MainAdminAuthResponse> => {
  const { email, password } = data;

  if (!db) {
    throw new AppError('Database connection not configured', 500);
  }

  // Try main_admin table first
  const { data: rpcData, error: rpcError } = await db.rpc('get_main_admin_by_email', { p_email: email });

  if (rpcError) {
    throw new AppError('Database error', 500);
  }

  const result = rpcData as any;

  if (!result?.error && result?.admin) {
    const adminData = result.admin;

    if (!adminData.is_active) {
      throw new AppError('Account is inactive', 403);
    }

    const isPasswordValid = await bcrypt.compare(password, adminData.password_hash);
    if (!isPasswordValid) {
      throw new AppError('Invalid email or password', 401);
    }

    const now = Math.floor(Date.now() / 1000);
    const expiresAt = now + JWT_EXPIRES_IN_SECONDS;

    const tokenPayload = {
      id: adminData.id,
      email: adminData.email,
      name: adminData.name,
      role: 'main_admin',
      type: 'main_admin',
    };

    const token = jwt.sign(tokenPayload, JWT_SECRET, {
      expiresIn: JWT_EXPIRES_IN,
    } as jwt.SignOptions);

    await db.rpc('update_main_admin_last_login', { p_admin_id: adminData.id });

    return {
      user: {
        id: adminData.id,
        email: adminData.email,
        name: adminData.name,
        role: 'main_admin',
        permissions: [],
      },
      token,
      accessToken: token,
      access_token: token,
      expiresIn: JWT_EXPIRES_IN_SECONDS,
      expiresAt,
    };
  }

  // Try sub_main_admin table
  const { data: subRpcData, error: subRpcError } = await db.rpc('get_sub_main_admin_by_email', { p_email: email });

  if (subRpcError) {
    throw new AppError('Database error', 500);
  }

  const subResult = subRpcData as any;
  if (subResult?.error || !subResult?.admin) {
    throw new AppError('Invalid email or password', 401);
  }

  const subAdminData = subResult.admin;

  if (!subAdminData.is_active) {
    throw new AppError('Account is inactive', 403);
  }

  if (!subAdminData.password_hash) {
    throw new AppError('Account setup not complete. Please check your email for the invite link.', 403);
  }

  const isSubPasswordValid = await bcrypt.compare(password, subAdminData.password_hash);
  if (!isSubPasswordValid) {
    throw new AppError('Invalid email or password', 401);
  }

  const now = Math.floor(Date.now() / 1000);
  const expiresAt = now + JWT_EXPIRES_IN_SECONDS;

  // Parse permissions from JSONB - handle both array and string
  let subPermissions: string[] = [];
  if (subAdminData.permissions) {
    if (Array.isArray(subAdminData.permissions)) {
      subPermissions = subAdminData.permissions;
    } else if (typeof subAdminData.permissions === 'string') {
      try {
        const parsed = JSON.parse(subAdminData.permissions);
        subPermissions = Array.isArray(parsed) ? parsed : [];
      } catch {
        subPermissions = [];
      }
    }
  }

  const subTokenPayload = {
    id: subAdminData.id,
    email: subAdminData.email,
    name: subAdminData.name,
    role: subAdminData.role,
    permissions: subPermissions,
    type: 'main_admin',
  };

  const subToken = jwt.sign(subTokenPayload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
  } as jwt.SignOptions);

  await db.rpc('update_sub_main_admin_last_login', { p_admin_id: subAdminData.id });

  return {
    user: {
      id: subAdminData.id,
      email: subAdminData.email,
      name: subAdminData.name,
      role: subAdminData.role,
      permissions: subPermissions,
    },
    token: subToken,
    accessToken: subToken,
    access_token: subToken,
    expiresIn: JWT_EXPIRES_IN_SECONDS,
    expiresAt,
  };
};

export const verifyMainAdminToken = async (token: string): Promise<{
  id: string;
  email: string;
  name: string;
  role: string;
  permissions: string[];
  type: string;
}> => {
  try {
    let decoded: any;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (jwtError: any) {
      throw new AppError(`Token verification failed: ${jwtError.message}`, 401);
    }

    if (decoded.type !== 'main_admin') {
      throw new AppError('Invalid token type', 401);
    }

    if (!db) {
      throw new AppError('Database connection not configured', 500);
    }

    // Try main_admin table first
    const { data: rpcData, error: rpcError } = await db.rpc('get_main_admin_by_id', { p_admin_id: decoded.id });

    if (!rpcError) {
      const result = rpcData as any;
      if (!result?.error && result?.admin) {
        if (!result.admin.is_active) {
          throw new AppError('Account is inactive', 403);
        }
        return {
          id: result.admin.id,
          email: result.admin.email,
          name: result.admin.name,
          role: 'main_admin',
          permissions: [],
          type: 'main_admin',
        };
      }
    }

    // Try sub_main_admin table
    const { data: subRpcData, error: subRpcError } = await db.rpc('get_sub_main_admin_by_id', { p_admin_id: decoded.id });

    if (subRpcError) {
      throw new AppError('Database error', 500);
    }

    const subResult = subRpcData as any;
    if (subResult?.error || !subResult?.admin) {
      throw new AppError('Admin not found', 404);
    }

    if (!subResult.admin.is_active) {
      throw new AppError('Account is inactive', 403);
    }

    // Parse permissions from JSONB - handle both array and string
    let subPermissions: string[] = [];
    if (subResult.admin.permissions) {
      if (Array.isArray(subResult.admin.permissions)) {
        subPermissions = subResult.admin.permissions;
      } else if (typeof subResult.admin.permissions === 'string') {
        try {
          const parsed = JSON.parse(subResult.admin.permissions);
          subPermissions = Array.isArray(parsed) ? parsed : [];
        } catch {
          subPermissions = [];
        }
      }
    }

    return {
      id: subResult.admin.id,
      email: subResult.admin.email,
      name: subResult.admin.name,
      role: subResult.admin.role || 'sub_admin',
      permissions: subPermissions,
      type: 'main_admin',
    };
  } catch (error: any) {
    if (error instanceof AppError) throw error;
    throw new AppError('Invalid or expired token', 401);
  }
};

export const getBuyingGroups = async (params: {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  sortBy?: string;
  sortOrder?: string;
}) => {
  if (!db) throw new AppError('Database connection not configured', 500);

  const { data, error } = await db.rpc('get_buying_groups_list', {
    p_page: params.page || 1,
    p_limit: params.limit || 10,
    p_search: params.search || null,
    p_status: params.status || null,
    p_sort_by: params.sortBy || 'created_at',
    p_sort_order: params.sortOrder || 'desc',
  });

  if (error) throw new AppError(`Failed to fetch buying groups: ${error.message}`, 500);
  return data;
};

export const getBuyingGroupById = async (groupId: string) => {
  if (!db) throw new AppError('Database connection not configured', 500);

  const { data, error } = await db.rpc('get_buying_group_by_id', { p_group_id: groupId });

  if (error) throw new AppError(`Failed to fetch buying group: ${error.message}`, 500);

  const result = data as any;
  if (result?.error) throw new AppError(result.message, 404);

  return result;
};

export const createBuyingGroup = async (params: {
  name: string;
  contactEmail?: string;
  contactPhone?: string;
  address?: string;
  notes?: string;
  adminEmail?: string;
  adminPassword?: string;
  adminName?: string;
}) => {
  if (!db) throw new AppError('Database connection not configured', 500);

  if (!params.adminPassword) {
    throw new AppError('Password is required', 400);
  }

  const adminPasswordHash = await bcrypt.hash(params.adminPassword, 10);

  const { data, error } = await db.rpc('create_buying_group', {
    p_name: params.name,
    p_contact_email: params.contactEmail || null,
    p_contact_phone: params.contactPhone || null,
    p_address: params.address || null,
    p_notes: params.notes || null,
    p_admin_email: params.adminEmail || null,
    p_admin_password_hash: adminPasswordHash,
    p_admin_name: params.adminName || null,
  });

  if (error) throw new AppError(`Failed to create buying group: ${error.message}`, 500);

  const result = data as any;
  if (result?.error) throw new AppError(result.message, 400);

  return result;
};

export const updateBuyingGroup = async (groupId: string, params: {
  name?: string;
  contactEmail?: string;
  contactPhone?: string;
  address?: string;
  status?: string;
  notes?: string;
}) => {
  if (!db) throw new AppError('Database connection not configured', 500);

  const { data, error } = await db.rpc('update_buying_group', {
    p_group_id: groupId,
    p_name: params.name || null,
    p_contact_email: params.contactEmail || null,
    p_contact_phone: params.contactPhone || null,
    p_address: params.address || null,
    p_status: params.status || null,
    p_notes: params.notes || null,
  });

  if (error) throw new AppError(`Failed to update buying group: ${error.message}`, 500);

  const result = data as any;
  if (result?.error) throw new AppError(result.message, 400);

  return result;
};

export const deleteBuyingGroup = async (groupId: string) => {
  if (!db) throw new AppError('Database connection not configured', 500);

  const { data, error } = await db.rpc('delete_buying_group', { p_group_id: groupId });

  if (error) throw new AppError(`Failed to delete buying group: ${error.message}`, 500);

  const result = data as any;
  if (result?.error) throw new AppError(result.message, 400);

  return result;
};
