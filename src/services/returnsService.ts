import { supabaseAdmin } from '../config/supabase';
import { AppError } from '../utils/appError';
import { verifyPharmacyStatus } from '../middleware/auth';

export interface ReturnItem {
  id: string;
  return_id: string;
  inventory_item_id?: string;
  ndc: string;
  drug_name: string;
  manufacturer?: string;
  lot_number: string;
  expiration_date: string;
  quantity: number;
  unit?: string;
  reason?: string;
  estimated_credit?: number;
  classification?: 'returnable' | 'destruction' | 'pending';
  photos?: string[];
  created_at: string;
}

export interface Return {
  id: string;
  pharmacy_id: string;
  status: 'draft' | 'ready_to_ship' | 'in_transit' | 'processing' | 'completed' | 'cancelled';
  total_estimated_credit: number;
  shipment_id?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  items?: ReturnItem[];
}

export interface CreateReturnInput {
  pharmacy_id: string;
  items: Omit<ReturnItem, 'id' | 'return_id' | 'created_at'>[];
  notes?: string;
}

export interface UpdateReturnInput {
  status?: Return['status'];
  notes?: string;
  shipment_id?: string;
}

export const createReturn = async (input: CreateReturnInput): Promise<Return> => {
  if (!supabaseAdmin) {
    throw new AppError('Supabase admin client not configured', 500);
  }

  // Verify pharmacy is not suspended/blacklisted
  await verifyPharmacyStatus(input.pharmacy_id);

  const db = supabaseAdmin;

  // Calculate total estimated credit
  const totalEstimatedCredit = input.items.reduce((sum, item) => sum + (item.estimated_credit || 0), 0);

  // Create return
  const { data: returnData, error: returnError } = await db
    .from('returns')
    .insert({
      pharmacy_id: input.pharmacy_id,
      status: 'draft',
      total_estimated_credit: totalEstimatedCredit,
      notes: input.notes,
    })
    .select()
    .single();

  if (returnError) {
    throw new AppError(`Failed to create return: ${returnError.message}`, 400);
  }

  // Create return items
  const returnItems = input.items.map((item) => ({
    return_id: returnData.id,
    inventory_item_id: item.inventory_item_id,
    ndc: item.ndc,
    // Accept both drug_name and product_name from frontend
    drug_name: item.drug_name || (item as any).product_name || '',
    manufacturer: item.manufacturer,
    lot_number: item.lot_number,
    expiration_date: item.expiration_date,
    quantity: item.quantity,
    unit: item.unit,
    reason: item.reason,
    estimated_credit: item.estimated_credit,
    classification: item.classification,
    photos: item.photos,
  }));

  const { error: itemsError } = await db
    .from('return_items')
    .insert(returnItems);

  if (itemsError) {
    // Rollback return creation
    await db.from('returns').delete().eq('id', returnData.id);
    throw new AppError(`Failed to create return items: ${itemsError.message}`, 400);
  }

  // Fetch return with items
  const returnWithItems = await getReturnById(input.pharmacy_id, returnData.id);
  return returnWithItems;
};

export const getReturns = async (
  pharmacyId: string,
  filters?: {
    status?: Return['status'];
    limit?: number;
    offset?: number;
  }
): Promise<{ returns: Return[]; total: number }> => {
  if (!supabaseAdmin) {
    throw new AppError('Supabase admin client not configured', 500);
  }

  // Verify pharmacy is not suspended/blacklisted
  await verifyPharmacyStatus(pharmacyId);

  const db = supabaseAdmin;

  let query = db
    .from('returns')
    .select('*', { count: 'exact' })
    .eq('pharmacy_id', pharmacyId)
    .order('created_at', { ascending: false });

  if (filters?.status) {
    query = query.eq('status', filters.status);
  }

  if (filters?.limit) {
    query = query.limit(filters.limit);
  }

  if (filters?.offset) {
    query = query.range(filters.offset, filters.offset + (filters.limit || 100) - 1);
  }

  const { data, error, count } = await query;

  if (error) {
    throw new AppError(`Failed to fetch returns: ${error.message}`, 400);
  }

  // Fetch items for each return
  const returnsWithItems = await Promise.all(
    (data || []).map(async (returnItem) => {
      const { data: items } = await db
        .from('return_items')
        .select('*')
        .eq('return_id', returnItem.id);

      return {
        ...returnItem,
        items: items || [],
      };
    })
  );

  return {
    returns: returnsWithItems,
    total: count || 0,
  };
};

export const getReturnById = async (pharmacyId: string, returnId: string): Promise<Return> => {
  if (!supabaseAdmin) {
    throw new AppError('Supabase admin client not configured', 500);
  }

  // Verify pharmacy is not suspended/blacklisted
  await verifyPharmacyStatus(pharmacyId);

  const db = supabaseAdmin;

  const { data, error } = await db
    .from('returns')
    .select('*')
    .eq('id', returnId)
    .eq('pharmacy_id', pharmacyId)
    .single();

  if (error) {
    throw new AppError(`Failed to fetch return: ${error.message}`, 404);
  }

  // Fetch items
  const { data: items } = await db
    .from('return_items')
    .select('*')
    .eq('return_id', returnId);

  return {
    ...data,
    items: items || [],
  };
};

export const updateReturn = async (
  pharmacyId: string,
  returnId: string,
  input: UpdateReturnInput
): Promise<Return> => {
  if (!supabaseAdmin) {
    throw new AppError('Supabase admin client not configured', 500);
  }

  // Verify pharmacy is not suspended/blacklisted
  await verifyPharmacyStatus(pharmacyId);

  const db = supabaseAdmin;

  // Validate if return can be updated (check lock status)
  const { data: validationResult, error: validationError } = await db.rpc('validate_legacy_return_update', {
    p_id: returnId,
    p_updates: input,
  });

  if (validationError || (validationResult && validationResult.error)) {
    const errorMessage = validationResult?.message || validationError?.message || 'Failed to validate return update';
    throw new AppError(errorMessage, validationResult?.code || 400);
  }

  const updateData: any = {
    updated_at: new Date().toISOString(),
  };

  if (input.status !== undefined) updateData.status = input.status;
  if (input.notes !== undefined) updateData.notes = input.notes;
  if (input.shipment_id !== undefined) updateData.shipment_id = input.shipment_id;

  const { data, error } = await db
    .from('returns')
    .update(updateData)
    .eq('id', returnId)
    .eq('pharmacy_id', pharmacyId)
    .select()
    .single();

  if (error) {
    throw new AppError(`Failed to update return: ${error.message}`, 400);
  }

  // Fetch items
  const { data: items } = await db
    .from('return_items')
    .select('*')
    .eq('return_id', returnId);

  return {
    ...data,
    items: items || [],
  };
};

export const deleteReturn = async (pharmacyId: string, returnId: string): Promise<void> => {
  if (!supabaseAdmin) {
    throw new AppError('Supabase admin client not configured', 500);
  }

  // Verify pharmacy is not suspended/blacklisted
  await verifyPharmacyStatus(pharmacyId);

  const db = supabaseAdmin;

  // Validate if return can be deleted (check lock status)
  const { data: validationResult, error: validationError } = await db.rpc('validate_legacy_return_deletion', {
    p_id: returnId,
  });

  if (validationError || (validationResult && validationResult.error)) {
    const errorMessage = validationResult?.message || validationError?.message || 'Failed to validate return deletion';
    throw new AppError(errorMessage, validationResult?.code || 400);
  }

  // Delete return items first (cascade should handle this, but being explicit)
  await db.from('return_items').delete().eq('return_id', returnId);

  const { error } = await db
    .from('returns')
    .delete()
    .eq('id', returnId)
    .eq('pharmacy_id', pharmacyId);

  if (error) {
    throw new AppError(`Failed to delete return: ${error.message}`, 400);
  }
};

export const checkReturnLockStatus = async (returnId: string): Promise<{
  id: string;
  status: string;
  isLocked: boolean;
  canEdit: boolean;
  lockReason: string | null;
}> => {
  if (!supabaseAdmin) {
    throw new AppError('Supabase admin client not configured', 500);
  }

  const db = supabaseAdmin;

  const { data, error } = await db.rpc('check_legacy_return_lock_status', {
    p_id: returnId,
  });

  if (error || (data && data.error)) {
    const errorMessage = data?.message || error?.message || 'Failed to check lock status';
    throw new AppError(errorMessage, data?.code || 400);
  }

  return data.data;
};

