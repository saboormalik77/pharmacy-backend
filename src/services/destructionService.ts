/**
 * Destruction Records Service
 *
 * CRUD operations for destruction_records table — tracks pharmaceutical
 * items routed to destruction (permanently non-returnable).
 */

import { supabaseAdmin } from '../config/supabase';
import { AppError } from '../utils/appError';

// ============================================================
// Types
// ============================================================

export interface DestructionRecord {
  id: string;
  pharmacyId: string;
  pharmacyName: string;
  transactionItemId: string | null;
  ndc: string | null;
  productName: string | null;
  manufacturer: string | null;
  lotNumber: string | null;
  quantity: number;
  weightLbs: number | null;
  destructionReason: string;
  status: 'pending' | 'scheduled' | 'picked_up' | 'destroyed' | 'cancelled';
  federalFormNumber: string | null;
  destructionCompany: string | null;
  scheduledDate: string | null;
  pickedUpAt: string | null;
  destroyedAt: string | null;
  formUrl: string | null;
  notes: string | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateDestructionInput {
  pharmacyId: string;
  transactionItemId?: string;
  ndc?: string;
  productName?: string;
  manufacturer?: string;
  lotNumber?: string;
  quantity?: number;
  weightLbs?: number;
  destructionReason?: string;
  destructionCompany?: string;
  scheduledDate?: string;
  notes?: string;
  createdBy?: string;
}

export interface UpdateDestructionInput {
  status?: string;
  federalFormNumber?: string;
  destructionCompany?: string;
  scheduledDate?: string;
  pickedUpAt?: string;
  destroyedAt?: string;
  formUrl?: string;
  weightLbs?: number;
  notes?: string;
}

export interface DestructionListFilters {
  pharmacyId?: string;
  status?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export async function createDestructionRecordForTransactionItem(
  transactionItemId: string,
  createdBy?: string,
  notes?: string
): Promise<DestructionRecord> {
  const sb = ensureAdmin();
  const { data, error } = await sb.rpc('create_destruction_record_for_transaction_item', {
    p_transaction_item_id: transactionItemId,
    p_created_by: createdBy || null,
    p_notes: notes || null,
  });

  if (error) throw new AppError(`Failed to create destruction record: ${error.message}`, 400);
  if (!data) throw new AppError('Failed to create destruction record: no data returned', 500);
  if (data.error) throw new AppError(data.message || 'Failed to create destruction record', data.code || 400);
  return toCamelCase(data.data);
}

// ============================================================
// Helpers
// ============================================================

function ensureAdmin() {
  if (!supabaseAdmin) {
    throw new AppError('Supabase admin client not configured', 500);
  }
  return supabaseAdmin;
}

function toSnakeCase(obj: Record<string, any>): Record<string, any> {
  const map: Record<string, string> = {
    pharmacyId: 'pharmacy_id',
    transactionItemId: 'transaction_item_id',
    productName: 'product_name',
    lotNumber: 'lot_number',
    weightLbs: 'weight_lbs',
    destructionReason: 'destruction_reason',
    destructionCompany: 'destruction_company',
    federalFormNumber: 'federal_form_number',
    scheduledDate: 'scheduled_date',
    pickedUpAt: 'picked_up_at',
    destroyedAt: 'destroyed_at',
    formUrl: 'form_url',
    createdBy: 'created_by',
  };

  const result: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value === undefined) continue;
    result[map[key] || key] = value;
  }
  return result;
}

function toCamelCase(row: any): DestructionRecord {
  const pharmacyJoin = row.pharmacy || row.pharmacies || null;
  const resolvedPharmacyName: string =
    (pharmacyJoin && (pharmacyJoin.pharmacy_name || pharmacyJoin.name)) ||
    row.pharmacy_name ||
    'Unknown Pharmacy';

  return {
    id: row.id,
    pharmacyId: row.pharmacy_id,
    pharmacyName: resolvedPharmacyName,
    transactionItemId: row.transaction_item_id,
    ndc: row.ndc,
    productName: row.product_name,
    manufacturer: row.manufacturer,
    lotNumber: row.lot_number,
    quantity: row.quantity,
    weightLbs: row.weight_lbs ? Number(row.weight_lbs) : null,
    destructionReason: row.destruction_reason,
    status: row.status,
    federalFormNumber: row.federal_form_number,
    destructionCompany: row.destruction_company,
    scheduledDate: row.scheduled_date,
    pickedUpAt: row.picked_up_at,
    destroyedAt: row.destroyed_at,
    formUrl: row.form_url,
    notes: row.notes,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// ============================================================
// CRUD Operations
// ============================================================

export async function createDestructionRecord(
  input: CreateDestructionInput
): Promise<DestructionRecord> {
  const sb = ensureAdmin();
  const insertData = toSnakeCase(input);

  const { data, error } = await sb
    .from('destruction_records')
    .insert(insertData)
    .select('*, pharmacy:pharmacy_id(pharmacy_name, name)')
    .single();

  if (error) throw new AppError(`Failed to create destruction record: ${error.message}`, 400);
  return toCamelCase(data);
}

export async function getDestructionRecord(id: string): Promise<DestructionRecord> {
  const sb = ensureAdmin();

  const { data, error } = await sb
    .from('destruction_records')
    .select('*, pharmacy:pharmacy_id(pharmacy_name, name)')
    .eq('id', id)
    .single();

  if (error || !data) throw new AppError('Destruction record not found', 404);
  return toCamelCase(data);
}

export async function listDestructionRecords(
  filters: DestructionListFilters = {}
): Promise<{ records: DestructionRecord[]; total: number }> {
  const sb = ensureAdmin();
  const page = filters.page || 1;
  const limit = filters.limit || 50;
  const offset = (page - 1) * limit;

  let query = sb
    .from('destruction_records')
    .select('*, pharmacy:pharmacy_id(pharmacy_name, name)', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (filters.pharmacyId) {
    query = query.eq('pharmacy_id', filters.pharmacyId);
  }

  if (filters.status) {
    query = query.eq('status', filters.status);
  }

  if (filters.search) {
    query = query.or(
      `ndc.ilike.%${filters.search}%,product_name.ilike.%${filters.search}%,manufacturer.ilike.%${filters.search}%`
    );
  }

  const { data, error, count } = await query;

  if (error) throw new AppError(`Failed to list destruction records: ${error.message}`, 400);
  return {
    records: (data || []).map(toCamelCase),
    total: count || 0,
  };
}

export async function getPendingDestructionItems(
  pharmacyId?: string
): Promise<DestructionRecord[]> {
  const sb = ensureAdmin();

  let query = sb
    .from('destruction_records')
    .select('*, pharmacy:pharmacy_id(pharmacy_name, name)')
    .in('status', ['pending', 'scheduled'])
    .order('created_at', { ascending: false });

  if (pharmacyId) {
    query = query.eq('pharmacy_id', pharmacyId);
  }

  const { data, error } = await query;

  if (error) throw new AppError(`Failed to get pending destruction items: ${error.message}`, 400);
  return (data || []).map(toCamelCase);
}

export async function updateDestructionRecord(
  id: string,
  input: UpdateDestructionInput
): Promise<DestructionRecord> {
  const sb = ensureAdmin();
  const updateData = toSnakeCase(input);

  if (input.status === 'picked_up' && !input.pickedUpAt) {
    updateData.picked_up_at = new Date().toISOString();
  }
  if (input.status === 'destroyed' && !input.destroyedAt) {
    updateData.destroyed_at = new Date().toISOString();
  }

  const { data, error } = await sb
    .from('destruction_records')
    .update(updateData)
    .eq('id', id)
    .select('*, pharmacy:pharmacy_id(pharmacy_name, name)')
    .single();

  if (error || !data) throw new AppError(`Failed to update destruction record: ${error?.message}`, 400);
  return toCamelCase(data);
}

export async function getDestructionStats(pharmacyId?: string): Promise<{
  total: number;
  pending: number;
  scheduled: number;
  pickedUp: number;
  destroyed: number;
  cancelled: number;
}> {
  const sb = ensureAdmin();

  let query = sb.from('destruction_records').select('status');

  if (pharmacyId) {
    query = query.eq('pharmacy_id', pharmacyId);
  }

  const { data, error } = await query;

  if (error) throw new AppError(`Failed to get destruction stats: ${error.message}`, 400);

  const records = data || [];
  return {
    total: records.length,
    pending: records.filter((r: any) => r.status === 'pending').length,
    scheduled: records.filter((r: any) => r.status === 'scheduled').length,
    pickedUp: records.filter((r: any) => r.status === 'picked_up').length,
    destroyed: records.filter((r: any) => r.status === 'destroyed').length,
    cancelled: records.filter((r: any) => r.status === 'cancelled').length,
  };
}
