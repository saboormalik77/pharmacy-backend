import { supabaseAdmin } from '../config/supabase';
import { AppError } from '../utils/appError';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

const db = supabaseAdmin || null;

const JWT_SECRET = process.env.JWT_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || 'your-secret-key-change-in-production';

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || '';

export const ALL_MAIN_ADMIN_PERMISSIONS = [
  'dashboard',
  'buying_groups',
  'distributors',
  'warehouse',
  'payout_hub',
  'policies',
  'ndc_pricing',
  'tbd_items',
  'destruction',
  'settings',
];

function generateInviteToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

export const createSubMainAdmin = async (params: {
  email: string;
  name: string;
  role?: string;
  permissions: string[];
  createdBy: string;
}) => {
  if (!db) throw new AppError('Database connection not configured', 500);

  const inviteToken = generateInviteToken();
  const inviteExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  const { data, error } = await db.rpc('create_sub_main_admin', {
    p_email: params.email,
    p_name: params.name,
    p_role: params.role || 'sub_admin',
    p_permissions: params.permissions,
    p_invite_token: inviteToken,
    p_invite_expires_at: inviteExpiresAt,
    p_created_by: params.createdBy,
  });

  if (error) throw new AppError(`Failed to create sub admin: ${error.message}`, 500);

  const result = data as any;
  if (result?.error) throw new AppError(result.message, 400);

  await sendSubAdminInviteEmail({
    to: params.email,
    name: params.name,
    inviteToken,
    permissions: params.permissions,
  });

  return result;
};

export const getSubMainAdmins = async (params: {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
}) => {
  if (!db) throw new AppError('Database connection not configured', 500);

  const { data, error } = await db.rpc('get_sub_main_admins_list', {
    p_page: params.page || 1,
    p_limit: params.limit || 10,
    p_search: params.search || null,
    p_status: params.status || null,
  });

  if (error) throw new AppError(`Failed to fetch sub admins: ${error.message}`, 500);
  return data;
};

export const getSubMainAdminById = async (adminId: string) => {
  if (!db) throw new AppError('Database connection not configured', 500);

  const { data, error } = await db.rpc('get_sub_main_admin_by_id', { p_admin_id: adminId });

  if (error) throw new AppError(`Failed to fetch sub admin: ${error.message}`, 500);

  const result = data as any;
  if (result?.error) throw new AppError(result.message, 404);

  return result;
};

export const updateSubMainAdmin = async (adminId: string, params: {
  name?: string;
  email?: string;
  role?: string;
  permissions?: string[];
  isActive?: boolean;
}) => {
  if (!db) throw new AppError('Database connection not configured', 500);

  const { data, error } = await db.rpc('update_sub_main_admin', {
    p_admin_id: adminId,
    p_name: params.name || null,
    p_email: params.email || null,
    p_role: params.role || null,
    p_permissions: params.permissions !== undefined ? params.permissions : null,
    p_is_active: params.isActive !== undefined ? params.isActive : null,
  });

  if (error) throw new AppError(`Failed to update sub admin: ${error.message}`, 500);

  const result = data as any;
  if (result?.error) throw new AppError(result.message, 400);

  return result;
};

export const deleteSubMainAdmin = async (adminId: string) => {
  if (!db) throw new AppError('Database connection not configured', 500);

  const { data, error } = await db.rpc('delete_sub_main_admin', { p_admin_id: adminId });

  if (error) throw new AppError(`Failed to delete sub admin: ${error.message}`, 500);

  const result = data as any;
  if (result?.error) throw new AppError(result.message, 400);

  return result;
};

export const resendSubAdminInvite = async (adminId: string) => {
  if (!db) throw new AppError('Database connection not configured', 500);

  const inviteToken = generateInviteToken();
  const inviteExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  const { data, error } = await db.rpc('resend_sub_admin_invite', {
    p_admin_id: adminId,
    p_invite_token: inviteToken,
    p_invite_expires_at: inviteExpiresAt,
  });

  if (error) throw new AppError(`Failed to resend invite: ${error.message}`, 500);

  const result = data as any;
  if (result?.error) throw new AppError(result.message, 400);

  const admin = result.admin;
  await sendSubAdminInviteEmail({
    to: admin.email,
    name: admin.name,
    inviteToken,
    permissions: [],
  });

  return result;
};

export const validateInviteToken = async (token: string) => {
  if (!db) throw new AppError('Database connection not configured', 500);

  const { data, error } = await db.rpc('validate_sub_admin_invite_token', {
    p_invite_token: token,
  });

  if (error) throw new AppError(`Failed to validate token: ${error.message}`, 500);

  const result = data as any;
  if (result?.error) throw new AppError(result.message, 400);

  return result;
};

export const acceptInvite = async (token: string, password: string) => {
  if (!db) throw new AppError('Database connection not configured', 500);

  const passwordHash = await bcrypt.hash(password, 10);

  const { data, error } = await db.rpc('accept_sub_admin_invite', {
    p_invite_token: token,
    p_password_hash: passwordHash,
  });

  if (error) throw new AppError(`Failed to accept invite: ${error.message}`, 500);

  const result = data as any;
  if (result?.error) throw new AppError(result.message, 400);

  return result;
};

async function sendSubAdminInviteEmail(params: {
  to: string;
  name: string;
  inviteToken: string;
  permissions: string[];
}) {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.warn('[sendSubAdminInviteEmail] Missing SUPABASE_URL or SUPABASE_ANON_KEY, skipping email');
    return;
  }

  try {
    const response = await fetch(
      `${SUPABASE_URL}/functions/v1/send-sub-admin-invite`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          to: params.to,
          name: params.name,
          inviteToken: params.inviteToken,
          permissions: params.permissions,
        }),
      }
    );

    const result = await response.json();
    if (!result.success) {
      console.error('[sendSubAdminInviteEmail] Edge function error:', result.error);
    } else {
      console.log('[sendSubAdminInviteEmail] Invite email sent to:', params.to);
    }
  } catch (err: any) {
    console.error('[sendSubAdminInviteEmail] Failed to call edge function:', err.message);
  }
}
