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
 * Get admin settings (scoped to buying group)
 * Uses PostgreSQL RPC function - no custom JS logic
 */
export const getAdminSettings = async (
  buyingGroupId?: string | null
): Promise<AdminSettings> => {
  if (!supabaseAdmin) {
    throw new AppError('Supabase admin client not configured', 500);
  }

  console.log(`🔧 Fetching admin settings (buyingGroupId: ${buyingGroupId || 'global'})`);

  // Get basic settings from admin_settings
  const { data, error } = await supabaseAdmin.rpc('get_admin_settings', {
    p_buying_group_id: buyingGroupId ?? null,
  });

  if (error) {
    throw new AppError(`Failed to fetch admin settings: ${error.message}`, 400);
  }

  if (data.error) {
    throw new AppError(data.message, 400);
  }

  let settings = data.settings;

  // For MainAdmin (buyingGroupId is null), fetch warehouse info from warehouses table
  if (buyingGroupId === null) {
    console.log('🏭 MainAdmin detected - fetching warehouse from warehouses table');
    
    const { data: warehouseData, error: warehouseError } = await supabaseAdmin.rpc('get_default_warehouse');
    
    if (!warehouseError && warehouseData && !warehouseData.error && warehouseData.warehouse) {
      const warehouse = warehouseData.warehouse;
      
      // Override warehouse fields with data from warehouses table
      settings = {
        ...settings,
        warehouseName: warehouse.name || null,
        warehouseStreet: warehouse.street || null,
        warehouseCity: warehouse.city || null,
        warehouseState: warehouse.state || null,
        warehouseZip: warehouse.zip || null,
        warehouseCountry: warehouse.country || 'US',
        warehousePhone: warehouse.phone || null,
        warehouseContactName: warehouse.contactName || null,
      };
      
      console.log('✅ Warehouse data loaded from warehouses table');
    } else {
      console.log('⚠️ No default warehouse found, using admin_settings warehouse data');
    }
  }

  return settings;
};

/**
 * Update admin settings (scoped to buying group)
 * Uses PostgreSQL RPC function - no custom JS logic
 */
export const updateAdminSettings = async (
  updateData: UpdateSettingsData,
  buyingGroupId?: string | null
): Promise<AdminSettings> => {
  if (!supabaseAdmin) {
    throw new AppError('Supabase admin client not configured', 500);
  }

  console.log(`🔧 Updating admin settings (buyingGroupId: ${buyingGroupId || 'global'})`);

  // Check if this is a warehouse update for MainAdmin
  const isWarehouseUpdate = updateData.warehouseName || updateData.warehouseStreet || 
    updateData.warehouseCity || updateData.warehouseState || updateData.warehouseZip || 
    updateData.warehouseCountry || updateData.warehousePhone || updateData.warehouseContactName;

  if (buyingGroupId === null && isWarehouseUpdate) {
    console.log('🏭 MainAdmin warehouse update - saving to warehouses table');
    
    // Get current default warehouse
    const { data: warehouseData, error: warehouseError } = await supabaseAdmin.rpc('get_default_warehouse');
    
    if (!warehouseError && warehouseData && !warehouseData.error && warehouseData.warehouse) {
      // Update existing warehouse
      const { data: updateResult, error: updateError } = await supabaseAdmin.rpc('update_warehouse', {
        p_warehouse_id: warehouseData.warehouse.id,
        p_name: updateData.warehouseName || null,
        p_contact_name: updateData.warehouseContactName || null,
        p_phone: updateData.warehousePhone || null,
        p_street: updateData.warehouseStreet || null,
        p_city: updateData.warehouseCity || null,
        p_state: updateData.warehouseState || null,
        p_zip: updateData.warehouseZip || null,
        p_country: updateData.warehouseCountry || null,
        p_is_active: null, // Keep current status
        p_is_default: null, // Keep current status
        p_updated_by: null,
      });
      
      if (updateError) {
        throw new AppError(`Failed to update warehouse: ${updateError.message}`, 400);
      }
      
      if (updateResult && updateResult.error) {
        throw new AppError(updateResult.message, 400);
      }
      
      console.log('✅ Warehouse updated in warehouses table');
    } else {
      console.log('⚠️ No default warehouse found, warehouse data will be ignored');
    }
  }

  // Update other settings (non-warehouse) in admin_settings
  const settingsUpdateData = { ...updateData };
  
  // For MainAdmin, don't update warehouse fields in admin_settings since they're now in warehouses table
  if (buyingGroupId === null) {
    settingsUpdateData.warehouseName = undefined;
    settingsUpdateData.warehouseStreet = undefined;
    settingsUpdateData.warehouseCity = undefined;
    settingsUpdateData.warehouseState = undefined;
    settingsUpdateData.warehouseZip = undefined;
    settingsUpdateData.warehouseCountry = undefined;
    settingsUpdateData.warehousePhone = undefined;
    settingsUpdateData.warehouseContactName = undefined;
  }

  const { data, error } = await supabaseAdmin.rpc('update_admin_settings', {
    p_site_name: settingsUpdateData.siteName || null,
    p_site_email: settingsUpdateData.siteEmail || null,
    p_timezone: settingsUpdateData.timezone || null,
    p_language: settingsUpdateData.language || null,
    p_email_notifications: settingsUpdateData.emailNotifications ?? null,
    p_document_approval_notif: settingsUpdateData.documentApprovalNotif ?? null,
    p_payment_notif: settingsUpdateData.paymentNotif ?? null,
    p_shipment_notif: settingsUpdateData.shipmentNotif ?? null,
    p_warehouse_name: settingsUpdateData.warehouseName || null,
    p_warehouse_street: settingsUpdateData.warehouseStreet || null,
    p_warehouse_city: settingsUpdateData.warehouseCity || null,
    p_warehouse_state: settingsUpdateData.warehouseState || null,
    p_warehouse_zip: settingsUpdateData.warehouseZip || null,
    p_warehouse_country: settingsUpdateData.warehouseCountry || null,
    p_warehouse_phone: settingsUpdateData.warehousePhone || null,
    p_warehouse_contact_name: settingsUpdateData.warehouseContactName || null,
    p_business_name: settingsUpdateData.businessName || null,
    p_logo_url: settingsUpdateData.logoUrl || null,
    p_buying_group_id: buyingGroupId ?? null,
  });

  if (error) {
    throw new AppError(`Failed to update admin settings: ${error.message}`, 400);
  }

  if (data.error) {
    throw new AppError(data.message, 400);
  }

  // Return the updated settings (which will fetch warehouse data from warehouses table for MainAdmin)
  return await getAdminSettings(buyingGroupId);
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
 * (Scoped to buying group to avoid filename conflicts)
 */
export const uploadLogo = async (
  fileBuffer: Buffer,
  originalName: string,
  mimeType: string,
  buyingGroupId?: string | null
): Promise<string> => {
  if (!supabaseAdmin) {
    throw new AppError('Supabase admin client not configured', 500);
  }

  const ext = originalName.split('.').pop() || 'png';
  const groupPrefix = buyingGroupId ? `${buyingGroupId}_` : 'global_';
  const fileName = `logo_${groupPrefix}${Date.now()}.${ext}`;
  const filePath = `logos/${fileName}`;

  console.log(`🔧 Uploading logo (buyingGroupId: ${buyingGroupId || 'global'}): ${filePath}`);

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

