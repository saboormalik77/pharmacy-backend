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
  businessName: string | null;
  logoUrl: string | null;
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
  businessName?: string;
  logoUrl?: string;
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
    p_business_name: updateData.businessName || null,
    p_logo_url: updateData.logoUrl || null,
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
 * Upload logo to Supabase Storage and return the public URL
 */
export const uploadLogo = async (
  fileBuffer: Buffer,
  originalName: string,
  mimeType: string
): Promise<string> => {
  if (!supabaseAdmin) {
    throw new AppError('Supabase admin client not configured', 500);
  }

  const ext = originalName.split('.').pop() || 'png';
  const fileName = `logo_${Date.now()}.${ext}`;
  const filePath = `logos/${fileName}`;

  const { error: uploadError } = await supabaseAdmin.storage
    .from('settings')
    .upload(filePath, fileBuffer, {
      contentType: mimeType,
      upsert: true,
    });

  if (uploadError) {
    throw new AppError(`Failed to upload logo: ${uploadError.message}`, 400);
  }

  const { data: urlData } = supabaseAdmin.storage
    .from('settings')
    .getPublicUrl(filePath);

  return urlData.publicUrl;
};

/**
 * Reset admin password (self-service)
 * Validates current password in application layer (bcrypt),
 * then calls RPC function to update
 */
export const resetAdminPassword = async (
  adminId: string,
  passwordData: ResetPasswordData,
  adminRole?: string
): Promise<void> => {
  if (!supabaseAdmin) {
    throw new AppError('Supabase admin client not configured', 500);
  }

  const { currentPassword, newPassword, confirmPassword } = passwordData;

  if (newPassword !== confirmPassword) {
    throw new AppError('New password and confirm password do not match', 400);
  }

  if (newPassword.length < 8) {
    throw new AppError('Password must be at least 8 characters long', 400);
  }

  // Determine which table to query based on the admin role
  const isMainAdmin = adminRole === 'super_admin';
  const tableName = isMainAdmin ? 'main_admin' : 'admin';

  const { data: adminData, error: fetchError } = await supabaseAdmin
    .from(tableName)
    .select('password_hash')
    .eq('id', adminId)
    .single();

  if (fetchError || !adminData) {
    // If not found in determined table and role is super_admin, also try sub_main_admin
    if (isMainAdmin) {
      const { data: subData, error: subError } = await supabaseAdmin
        .from('sub_main_admin')
        .select('password_hash')
        .eq('id', adminId)
        .single();

      if (subError || !subData) {
        throw new AppError('Admin user not found', 404);
      }

      const isValid = await bcrypt.compare(currentPassword, subData.password_hash);
      if (!isValid) {
        throw new AppError('Current password is incorrect', 401);
      }

      const hash = await bcrypt.hash(newPassword, 10);
      const { error: updateError } = await supabaseAdmin
        .from('sub_main_admin')
        .update({ password_hash: hash, updated_at: new Date().toISOString() })
        .eq('id', adminId);

      if (updateError) {
        throw new AppError(`Failed to reset password: ${updateError.message}`, 400);
      }
      return;
    }
    throw new AppError('Admin user not found', 404);
  }

  const isCurrentPasswordValid = await bcrypt.compare(
    currentPassword,
    adminData.password_hash
  );

  if (!isCurrentPasswordValid) {
    throw new AppError('Current password is incorrect', 401);
  }

  const newPasswordHash = await bcrypt.hash(newPassword, 10);

  if (isMainAdmin) {
    const { error: updateError } = await supabaseAdmin
      .from('main_admin')
      .update({ password_hash: newPasswordHash, updated_at: new Date().toISOString() })
      .eq('id', adminId);

    if (updateError) {
      throw new AppError(`Failed to reset password: ${updateError.message}`, 400);
    }
  } else {
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
  }
};

