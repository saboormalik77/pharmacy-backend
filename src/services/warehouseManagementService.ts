import { supabaseAdmin } from '../config/supabase';
import { AppError } from '../utils/appError';

// ============================================================
// Interfaces
// ============================================================

export interface Warehouse {
  id: string;
  name: string;
  contactName: string | null;
  phone: string | null;
  street: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  country: string;
  isActive: boolean;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateWarehouseData {
  name: string;
  contactName?: string;
  phone?: string;
  street?: string;
  city?: string;
  state?: string;
  zip?: string;
  country?: string;
  isActive?: boolean;
  isDefault?: boolean;
}

export interface UpdateWarehouseData {
  name?: string;
  contactName?: string;
  phone?: string;
  street?: string;
  city?: string;
  state?: string;
  zip?: string;
  country?: string;
  isActive?: boolean;
  isDefault?: boolean;
}

// ============================================================
// Service Functions
// ============================================================

/**
 * Get all warehouses
 */
export const getAllWarehouses = async (): Promise<Warehouse[]> => {
  if (!supabaseAdmin) {
    throw new AppError('Supabase admin client not configured', 500);
  }

  console.log('🏭 Fetching all warehouses');

  const { data, error } = await supabaseAdmin.rpc('get_warehouses');

  if (error) {
    throw new AppError(`Failed to fetch warehouses: ${error.message}`, 400);
  }

  if (data.error) {
    throw new AppError(data.message, 400);
  }

  return data.warehouses || [];
};

/**
 * Get default warehouse
 */
export const getDefaultWarehouse = async (): Promise<Warehouse | null> => {
  if (!supabaseAdmin) {
    throw new AppError('Supabase admin client not configured', 500);
  }

  console.log('🏭 Fetching default warehouse');

  const { data, error } = await supabaseAdmin.rpc('get_default_warehouse');

  if (error) {
    throw new AppError(`Failed to fetch default warehouse: ${error.message}`, 400);
  }

  if (data.error) {
    throw new AppError(data.message, 400);
  }

  return data.warehouse || null;
};

/**
 * Create a new warehouse
 */
export const createWarehouse = async (
  warehouseData: CreateWarehouseData,
  createdBy?: string
): Promise<Warehouse> => {
  if (!supabaseAdmin) {
    throw new AppError('Supabase admin client not configured', 500);
  }

  console.log('🏭 Creating new warehouse:', warehouseData.name);

  // Validate required fields
  if (!warehouseData.name || warehouseData.name.trim() === '') {
    throw new AppError('Warehouse name is required', 400);
  }

  const { data, error } = await supabaseAdmin.rpc('create_warehouse', {
    p_name: warehouseData.name,
    p_contact_name: warehouseData.contactName || null,
    p_phone: warehouseData.phone || null,
    p_street: warehouseData.street || null,
    p_city: warehouseData.city || null,
    p_state: warehouseData.state || null,
    p_zip: warehouseData.zip || null,
    p_country: warehouseData.country || 'US',
    p_is_active: warehouseData.isActive ?? true,
    p_is_default: warehouseData.isDefault ?? false,
    p_created_by: createdBy || null,
  });

  if (error) {
    throw new AppError(`Failed to create warehouse: ${error.message}`, 400);
  }

  if (data.error) {
    throw new AppError(data.message, 400);
  }

  return data.warehouse;
};

/**
 * Update an existing warehouse
 */
export const updateWarehouse = async (
  warehouseId: string,
  updateData: UpdateWarehouseData,
  updatedBy?: string
): Promise<Warehouse> => {
  if (!supabaseAdmin) {
    throw new AppError('Supabase admin client not configured', 500);
  }

  console.log(`🏭 Updating warehouse ${warehouseId}`);

  const { data, error } = await supabaseAdmin.rpc('update_warehouse', {
    p_warehouse_id: warehouseId,
    p_name: updateData.name || null,
    p_contact_name: updateData.contactName || null,
    p_phone: updateData.phone || null,
    p_street: updateData.street || null,
    p_city: updateData.city || null,
    p_state: updateData.state || null,
    p_zip: updateData.zip || null,
    p_country: updateData.country || null,
    p_is_active: updateData.isActive ?? null,
    p_is_default: updateData.isDefault ?? null,
    p_updated_by: updatedBy || null,
  });

  if (error) {
    throw new AppError(`Failed to update warehouse: ${error.message}`, 400);
  }

  if (data.error) {
    throw new AppError(data.message, 400);
  }

  return data.warehouse;
};

/**
 * Delete a warehouse
 */
export const deleteWarehouse = async (
  warehouseId: string,
  hardDelete: boolean = false
): Promise<void> => {
  if (!supabaseAdmin) {
    throw new AppError('Supabase admin client not configured', 500);
  }

  console.log(`🏭 Deleting warehouse ${warehouseId} (hard: ${hardDelete})`);

  const { data, error } = await supabaseAdmin.rpc('delete_warehouse', {
    p_warehouse_id: warehouseId,
    p_hard_delete: hardDelete,
  });

  if (error) {
    throw new AppError(`Failed to delete warehouse: ${error.message}`, 400);
  }

  if (data.error) {
    throw new AppError(data.message, 400);
  }
};