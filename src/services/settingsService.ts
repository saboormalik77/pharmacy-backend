import { supabase, supabaseAdmin } from '../config/supabase';
import { AppError } from '../utils/appError';

export interface PharmacySettings {
  id: string;
  email: string;
  name: string;
  pharmacy_name: string;
  npi_number: string | null;
  dea_number: string | null;
  contact_phone: string | null;
  phone: string | null;
  physical_address: {
    street?: string;
    city?: string;
    state?: string;
    zip?: string;
  } | null;
  billing_address: {
    street?: string;
    city?: string;
    state?: string;
    zip?: string;
  } | null;
  title?: string | null;
  state_license_number?: string | null;
  license_expiry_date?: string | null;
  corporate_name?: string | null;
  mailing_address?: string | null;
  store_hours?: string | null;
  dea_file_url?: string | null;
  license_file_url?: string | null;
  status?: string | null;
  subscription_tier?: string | null;
  subscription_status?: string | null;
  trial_ends_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface UpdateSettingsData {
  name?: string;
  email?: string;
  phone?: string;
  contact_phone?: string;
  pharmacy_name?: string;
  npi_number?: string;
  dea_number?: string;
  title?: string;
  state_license_number?: string;
  license_expiry_date?: string;
  corporate_name?: string;
  mailing_address?: string;
  store_hours?: string;
  dea_file_url?: string;
  license_file_url?: string;
  physical_address?: {
    street?: string;
    city?: string;
    state?: string;
    zip?: string;
  };
  billing_address?: {
    street?: string;
    city?: string;
    state?: string;
    zip?: string;
  };
}

export interface ChangePasswordData {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

/**
 * Get pharmacy settings/profile
 */
export const getPharmacySettings = async (pharmacyId: string): Promise<PharmacySettings> => {
  if (!supabaseAdmin) {
    throw new AppError('Supabase admin client not configured', 500);
  }

  const { data, error } = await supabaseAdmin
    .from('pharmacy')
    .select('*')
    .eq('id', pharmacyId)
    .single();

  if (error || !data) {
    throw new AppError('Pharmacy not found', 404);
  }

  return {
    id: data.id,
    email: data.email,
    name: data.name,
    pharmacy_name: data.pharmacy_name,
    npi_number: data.npi_number,
    dea_number: data.dea_number,
    contact_phone: data.contact_phone,
    phone: data.phone,
    physical_address: data.physical_address as any,
    billing_address: data.billing_address as any,
    title: (data as any).title || null,
    state_license_number: (data as any).state_license_number || null,
    license_expiry_date: (data as any).license_expiry_date || null,
    corporate_name: (data as any).corporate_name || null,
    mailing_address: (data as any).mailing_address || null,
    store_hours: (data as any).store_hours || null,
    dea_file_url: (data as any).dea_file_url || null,
    license_file_url: (data as any).license_file_url || null,
    status: (data as any).status || null,
    subscription_tier: (data as any).subscription_tier || null,
    subscription_status: (data as any).subscription_status || null,
    trial_ends_at: (data as any).trial_ends_at || null,
    created_at: data.created_at,
    updated_at: data.updated_at,
  };
};

/**
 * Update pharmacy settings/profile
 */
export const updatePharmacySettings = async (
  pharmacyId: string,
  updateData: UpdateSettingsData
): Promise<PharmacySettings> => {
  if (!supabaseAdmin) {
    throw new AppError('Supabase admin client not configured', 500);
  }

  // Define allowed fields for update (exclude id, pharmacy_id, created_at)
  const allowedFields = [
    'name', 'email', 'phone', 'contact_phone', 'pharmacy_name', 
    'npi_number', 'dea_number', 'title', 'state_license_number',
    'license_expiry_date', 'corporate_name', 'mailing_address', 
    'store_hours', 'dea_file_url', 'license_file_url',
    'physical_address', 'billing_address'
  ];

  // Prepare update object - only include allowed fields
  const updateFields: any = {
    updated_at: new Date().toISOString(),
  };

  // Filter and copy only allowed fields
  if (updateData.name !== undefined) updateFields.name = updateData.name;
  if (updateData.phone !== undefined) updateFields.phone = updateData.phone;
  if (updateData.contact_phone !== undefined) updateFields.contact_phone = updateData.contact_phone;
  if (updateData.pharmacy_name !== undefined) updateFields.pharmacy_name = updateData.pharmacy_name;
  if (updateData.npi_number !== undefined) updateFields.npi_number = updateData.npi_number;
  if (updateData.dea_number !== undefined) updateFields.dea_number = updateData.dea_number;
  if (updateData.title !== undefined) updateFields.title = updateData.title;
  if (updateData.state_license_number !== undefined) updateFields.state_license_number = updateData.state_license_number;
  if (updateData.license_expiry_date !== undefined) updateFields.license_expiry_date = updateData.license_expiry_date;
  if (updateData.corporate_name !== undefined) updateFields.corporate_name = updateData.corporate_name;
  if (updateData.mailing_address !== undefined) updateFields.mailing_address = updateData.mailing_address;
  if (updateData.store_hours !== undefined) updateFields.store_hours = updateData.store_hours;
  if (updateData.dea_file_url !== undefined) updateFields.dea_file_url = updateData.dea_file_url;
  if (updateData.license_file_url !== undefined) updateFields.license_file_url = updateData.license_file_url;
  // Handle physical_address: merge with existing data instead of replacing
  if (updateData.physical_address !== undefined) {
    // First, get the current physical_address from the database
    const { data: currentData } = await supabaseAdmin
      .from('pharmacy')
      .select('physical_address')
      .eq('id', pharmacyId)
      .single();
    
    // Merge the new fields with existing physical_address data
    const currentPhysicalAddress = currentData?.physical_address || {};
    const updatedPhysicalAddress = {
      ...currentPhysicalAddress,
      ...updateData.physical_address, // This will only include the fields that were actually provided
    };
    
    updateFields.physical_address = updatedPhysicalAddress;
  }
  
  if (updateData.billing_address !== undefined) {
    updateFields.billing_address = updateData.billing_address;
  }

  // If email is being updated, also update it in auth
  if (updateData.email !== undefined && updateData.email !== null) {
    // Update email in auth.users
    const { error: emailError } = await supabaseAdmin.auth.admin.updateUserById(pharmacyId, {
      email: updateData.email,
    });

    if (emailError) {
      throw new AppError(`Failed to update email: ${emailError.message}`, 400);
    }

    updateFields.email = updateData.email;
  }

  // Update pharmacy record
  const { data, error } = await supabaseAdmin
    .from('pharmacy')
    .update(updateFields)
    .eq('id', pharmacyId)
    .select()
    .single();

  if (error) {
    throw new AppError(`Failed to update settings: ${error.message}`, 500);
  }

  return {
    id: data.id,
    email: data.email,
    name: data.name,
    pharmacy_name: data.pharmacy_name,
    npi_number: data.npi_number,
    dea_number: data.dea_number,
    contact_phone: data.contact_phone,
    phone: data.phone,
    physical_address: data.physical_address as any,
    billing_address: data.billing_address as any,
    title: (data as any).title || null,
    state_license_number: (data as any).state_license_number || null,
    license_expiry_date: (data as any).license_expiry_date || null,
    corporate_name: (data as any).corporate_name || null,
    mailing_address: (data as any).mailing_address || null,
    store_hours: (data as any).store_hours || null,
    dea_file_url: (data as any).dea_file_url || null,
    license_file_url: (data as any).license_file_url || null,
    status: (data as any).status || null,
    subscription_tier: (data as any).subscription_tier || null,
    subscription_status: (data as any).subscription_status || null,
    trial_ends_at: (data as any).trial_ends_at || null,
    created_at: data.created_at,
    updated_at: data.updated_at,
  };
};

/**
 * Change password
 */
export const changePassword = async (
  pharmacyId: string,
  passwordData: ChangePasswordData
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

  if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(newPassword)) {
    throw new AppError(
      'Password must contain at least one uppercase letter, one lowercase letter, and one number',
      400
    );
  }

  // Verify current password by attempting to sign in
  const { data: pharmacy } = await supabaseAdmin
    .from('pharmacy')
    .select('email')
    .eq('id', pharmacyId)
    .single();

  if (!pharmacy) {
    throw new AppError('Pharmacy not found', 404);
  }

  // Try to sign in with current password to verify it (use regular client for auth)
  const { error: verifyError } = await supabase.auth.signInWithPassword({
    email: pharmacy.email,
    password: currentPassword,
  });

  if (verifyError) {
    throw new AppError('Current password is incorrect', 401);
  }

  // Update password using admin client
  const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(pharmacyId, {
    password: newPassword,
  });

  if (updateError) {
    throw new AppError(`Failed to update password: ${updateError.message}`, 500);
  }
};

