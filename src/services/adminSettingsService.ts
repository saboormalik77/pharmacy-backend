import { supabaseAdmin } from '../config/supabase';
import { AppError } from '../utils/appError';
import bcrypt from 'bcryptjs';

// ============================================================
// Interfaces
// ============================================================

export interface AdminSettings {
  siteName: string;
  siteEmail: string;
  timezone: string;
  language: string;
  emailNotifications: boolean;
  documentApprovalNotif: boolean;
  paymentNotif: boolean;
  shipmentNotif: boolean;
  warehouseName: string | null;
  warehouseStreet: string | null;
  warehouseCity: string | null;
  warehouseState: string | null;
  warehouseZip: string | null;
  warehouseCountry: string | null;
  warehousePhone: string | null;
  warehouseContactName: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateSettingsData {
  siteName?: string;
  siteEmail?: string;
  timezone?: string;
  language?: string;
  emailNotifications?: boolean;
  documentApprovalNotif?: boolean;
  paymentNotif?: boolean;
  shipmentNotif?: boolean;
  warehouseName?: string;
  warehouseStreet?: string;
  warehouseCity?: string;
  warehouseState?: string;
  warehouseZip?: string;
  warehouseCountry?: string;
  warehousePhone?: string;
  warehouseContactName?: string;
}

export interface TimezoneOption {
  value: string;
  label: string;
}

export interface LanguageOption {
  value: string;
  label: string;
}

export interface AdminProfile {
  id: string;
  email: string;
  name: string;
  role: string;
  roleDisplay: string;
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ResetPasswordData {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

// ============================================================
// Service Functions
// ============================================================

/**
 * Get admin settings
 * Uses PostgreSQL RPC function - no custom JS logic
 */
export const getAdminSettings = async (): Promise<AdminSettings> => {
  if (!supabaseAdmin) {
    throw new AppError('Supabase admin client not configured', 500);
  }

  const { data, error } = await supabaseAdmin.rpc('get_admin_settings');

  if (error) {
    throw new AppError(`Failed to fetch admin settings: ${error.message}`, 400);
  }

  if (data.error) {
    throw new AppError(data.message, 400);
  }

  return data.settings;
};

/**
 * Update admin settings
 * Uses PostgreSQL RPC function - no custom JS logic
 */
export const updateAdminSettings = async (
  updateData: UpdateSettingsData
): Promise<AdminSettings> => {
  if (!supabaseAdmin) {
    throw new AppError('Supabase admin client not configured', 500);
  }

  const { data, error } = await supabaseAdmin.rpc('update_admin_settings', {
    p_site_name: updateData.siteName || null,
    p_site_email: updateData.siteEmail || null,
    p_timezone: updateData.timezone || null,
    p_language: updateData.language || null,
    p_email_notifications: updateData.emailNotifications ?? null,
    p_document_approval_notif: updateData.documentApprovalNotif ?? null,
    p_payment_notif: updateData.paymentNotif ?? null,
    p_shipment_notif: updateData.shipmentNotif ?? null,
    p_warehouse_name: updateData.warehouseName || null,
    p_warehouse_street: updateData.warehouseStreet || null,
    p_warehouse_city: updateData.warehouseCity || null,
    p_warehouse_state: updateData.warehouseState || null,
    p_warehouse_zip: updateData.warehouseZip || null,
    p_warehouse_country: updateData.warehouseCountry || null,
    p_warehouse_phone: updateData.warehousePhone || null,
    p_warehouse_contact_name: updateData.warehouseContactName || null,
  });

  if (error) {
    throw new AppError(`Failed to update admin settings: ${error.message}`, 400);
  }

  if (data.error) {
    throw new AppError(data.message, 400);
  }

  return data.settings;
};

/**
 * Get available timezones
 * Uses PostgreSQL RPC function
 */
export const getAvailableTimezones = async (): Promise<TimezoneOption[]> => {
  if (!supabaseAdmin) {
    throw new AppError('Supabase admin client not configured', 500);
  }

  const { data, error } = await supabaseAdmin.rpc('get_available_timezones');

  if (error) {
    throw new AppError(`Failed to fetch timezones: ${error.message}`, 400);
  }

  return data.timezones || [];
};

/**
 * Get available languages
 * Uses PostgreSQL RPC function
 */
export const getAvailableLanguages = async (): Promise<LanguageOption[]> => {
  if (!supabaseAdmin) {
    throw new AppError('Supabase admin client not configured', 500);
  }

  const { data, error } = await supabaseAdmin.rpc('get_available_languages');

  if (error) {
    throw new AppError(`Failed to fetch languages: ${error.message}`, 400);
  }

  return data.languages || [];
};

/**
 * Get admin profile
 * Uses PostgreSQL RPC function
 */
export const getAdminProfile = async (adminId: string): Promise<AdminProfile> => {
  if (!supabaseAdmin) {
    throw new AppError('Supabase admin client not configured', 500);
  }

  const { data, error } = await supabaseAdmin.rpc('get_admin_profile', {
    p_admin_id: adminId,
  });

  if (error) {
    throw new AppError(`Failed to fetch admin profile: ${error.message}`, 400);
  }

  if (data.error) {
    throw new AppError(data.message, 404);
  }

  return data.admin;
};

/**
 * Reset admin password (self-service)
 * Validates current password in application layer (bcrypt),
 * then calls RPC function to update
 */
export const resetAdminPassword = async (
  adminId: string,
  passwordData: ResetPasswordData
): Promise<void> => {
  if (!supabaseAdmin) {
    throw new AppError('Supabase admin client not configured', 500);
  }

  const { currentPassword, newPassword, confirmPassword } = passwordData;

  // Validate passwords match
  if (newPassword !== confirmPassword) {
    throw new AppError('New password and confirm password do not match', 400);
  }

  // Validate password strength
  if (newPassword.length < 8) {
    throw new AppError('Password must be at least 8 characters long', 400);
  }

  // Get current password hash from database
  const { data: adminData, error: fetchError } = await supabaseAdmin
    .from('admin')
    .select('password_hash')
    .eq('id', adminId)
    .single();

  if (fetchError || !adminData) {
    throw new AppError('Admin user not found', 404);
  }

  // Verify current password
  const isCurrentPasswordValid = await bcrypt.compare(
    currentPassword,
    adminData.password_hash
  );

  if (!isCurrentPasswordValid) {
    throw new AppError('Current password is incorrect', 401);
  }

  // Hash new password
  const newPasswordHash = await bcrypt.hash(newPassword, 10);

  // Update password via RPC function
  const { data, error } = await supabaseAdmin.rpc('reset_admin_own_password', {
    p_admin_id: adminId,
    p_current_password_hash: adminData.password_hash,
    p_new_password_hash: newPasswordHash,
  });

  if (error) {
    throw new AppError(`Failed to reset password: ${error.message}`, 400);
  }

  if (data.error) {
    throw new AppError(data.message, 400);
  }
};

