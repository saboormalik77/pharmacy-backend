import { supabaseAdmin } from '../config/supabase';
import { AppError } from '../utils/appError';
import { verifyPharmacyStatus } from '../middleware/auth';

export interface InventoryItem {
  id: string;
  pharmacy_id: string;
  ndc: string;
  product_name: string;
  lot_number: string;
  expiration_date: string;
  quantity: number;
  unit?: string;
  location?: string;
  boxes?: number;
  tablets_per_box?: number;
  status: 'active' | 'expiring_soon' | 'expired';
  days_until_expiration: number;
  added_date: string;
  created_at: string;
  updated_at: string;
}

export interface CreateInventoryItemInput {
  pharmacy_id: string;
  ndc: string;
  product_name: string;
  lot_number: string;
  expiration_date: string;
  quantity: number;
  unit?: string;
  location?: string;
  boxes?: number;
  tablets_per_box?: number;
}

export interface UpdateInventoryItemInput {
  lot_number?: string;
  expiration_date?: string;
  quantity?: number;
  location?: string;
  boxes?: number;
  tablets_per_box?: number;
}

const calculateDaysUntilExpiration = (expirationDate: string): number => {
  const expDate = new Date(expirationDate);
  const today = new Date();
  const diffTime = expDate.getTime() - today.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

const determineStatus = (daysUntilExpiration: number): 'active' | 'expiring_soon' | 'expired' => {
  if (daysUntilExpiration < 0) return 'expired';
  if (daysUntilExpiration <= 180) return 'expiring_soon';
  return 'active';
};

export const createInventoryItem = async (input: CreateInventoryItemInput): Promise<InventoryItem> => {
  if (!supabaseAdmin) {
    throw new AppError('Supabase admin client not configured', 500);
  }

  // Verify pharmacy is not suspended/blacklisted
  await verifyPharmacyStatus(input.pharmacy_id);

  const db = supabaseAdmin;

  const daysUntilExpiration = calculateDaysUntilExpiration(input.expiration_date);
  const status = determineStatus(daysUntilExpiration);

  const { data, error } = await db
    .from('inventory_items')
    .insert({
      pharmacy_id: input.pharmacy_id,
      ndc: input.ndc,
      product_name: input.product_name,
      lot_number: input.lot_number,
      expiration_date: input.expiration_date,
      quantity: input.quantity,
      unit: input.unit,
      location: input.location,
      boxes: input.boxes,
      tablets_per_box: input.tablets_per_box,
      status,
      days_until_expiration: daysUntilExpiration,
    })
    .select()
    .single();

  if (error) {
    throw new AppError(`Failed to create inventory item: ${error.message}`, 400);
  }

  return data;
};

export const getInventoryItems = async (
  pharmacyId: string,
  filters?: {
    status?: 'active' | 'expiring_soon' | 'expired';
    search?: string;
    limit?: number;
    offset?: number;
  }
): Promise<{ items: InventoryItem[]; total: number }> => {
  if (!supabaseAdmin) {
    throw new AppError('Supabase admin client not configured', 500);
  }

  // Verify pharmacy is not suspended/blacklisted
  await verifyPharmacyStatus(pharmacyId);

  const db = supabaseAdmin;

  let query = db
    .from('inventory_items')
    .select('*', { count: 'exact' })
    .eq('pharmacy_id', pharmacyId)
    .order('created_at', { ascending: false });

  if (filters?.status) {
    query = query.eq('status', filters.status);
  }

  if (filters?.search) {
    query = query.or(
      `ndc.ilike.%${filters.search}%,product_name.ilike.%${filters.search}%,lot_number.ilike.%${filters.search}%`
    );
  }

  if (filters?.limit) {
    query = query.limit(filters.limit);
  }

  if (filters?.offset) {
    query = query.range(filters.offset, filters.offset + (filters.limit || 100) - 1);
  }

  const { data, error, count } = await query;

  if (error) {
    throw new AppError(`Failed to fetch inventory items: ${error.message}`, 400);
  }

  return {
    items: data || [],
    total: count || 0,
  };
};

export const getInventoryItemById = async (
  pharmacyId: string,
  itemId: string
): Promise<InventoryItem> => {
  if (!supabaseAdmin) {
    throw new AppError('Supabase admin client not configured', 500);
  }

  // Verify pharmacy is not suspended/blacklisted
  await verifyPharmacyStatus(pharmacyId);

  const db = supabaseAdmin;

  const { data, error } = await db
    .from('inventory_items')
    .select('*')
    .eq('id', itemId)
    .eq('pharmacy_id', pharmacyId)
    .single();

  if (error) {
    throw new AppError(`Failed to fetch inventory item: ${error.message}`, 404);
  }

  return data;
};

export const updateInventoryItem = async (
  pharmacyId: string,
  itemId: string,
  input: UpdateInventoryItemInput
): Promise<InventoryItem> => {
  if (!supabaseAdmin) {
    throw new AppError('Supabase admin client not configured', 500);
  }

  // Verify pharmacy is not suspended/blacklisted
  await verifyPharmacyStatus(pharmacyId);

  const db = supabaseAdmin;

  const updateData: any = {
    updated_at: new Date().toISOString(),
  };

  if (input.lot_number !== undefined) updateData.lot_number = input.lot_number;
  if (input.expiration_date !== undefined) {
    updateData.expiration_date = input.expiration_date;
    const daysUntilExpiration = calculateDaysUntilExpiration(input.expiration_date);
    updateData.days_until_expiration = daysUntilExpiration;
    updateData.status = determineStatus(daysUntilExpiration);
  }
  if (input.quantity !== undefined) updateData.quantity = input.quantity;
  if (input.location !== undefined) updateData.location = input.location;
  if (input.boxes !== undefined) updateData.boxes = input.boxes;
  if (input.tablets_per_box !== undefined) updateData.tablets_per_box = input.tablets_per_box;

  const { data, error } = await db
    .from('inventory_items')
    .update(updateData)
    .eq('id', itemId)
    .eq('pharmacy_id', pharmacyId)
    .select()
    .single();

  if (error) {
    throw new AppError(`Failed to update inventory item: ${error.message}`, 400);
  }

  return data;
};

export const deleteInventoryItem = async (pharmacyId: string, itemId: string): Promise<void> => {
  if (!supabaseAdmin) {
    throw new AppError('Supabase admin client not configured', 500);
  }

  // Verify pharmacy is not suspended/blacklisted
  await verifyPharmacyStatus(pharmacyId);

  const db = supabaseAdmin;

  const { error } = await db
    .from('inventory_items')
    .delete()
    .eq('id', itemId)
    .eq('pharmacy_id', pharmacyId);

  if (error) {
    throw new AppError(`Failed to delete inventory item: ${error.message}`, 400);
  }
};

export const getInventoryMetrics = async (pharmacyId: string) => {
  if (!supabaseAdmin) {
    throw new AppError('Supabase admin client not configured', 500);
  }

  // Verify pharmacy is not suspended/blacklisted
  await verifyPharmacyStatus(pharmacyId);

  const db = supabaseAdmin;

  const { data, error } = await db
    .from('inventory_items')
    .select('status, quantity')
    .eq('pharmacy_id', pharmacyId);

  if (error) {
    throw new AppError(`Failed to fetch inventory metrics: ${error.message}`, 400);
  }

  const totalItems = data?.length || 0;
  const active = data?.filter((item) => item.status === 'active').length || 0;
  const expiringSoon = data?.filter((item) => item.status === 'expiring_soon').length || 0;
  const expired = data?.filter((item) => item.status === 'expired').length || 0;

  return {
    totalItems,
    active,
    expiringSoon,
    expired,
  };
};

