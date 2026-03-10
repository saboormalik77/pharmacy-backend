import { supabaseAdmin } from '../config/supabase';
import { AppError } from '../utils/appError';
import bcrypt from 'bcryptjs';

// ============================================================
// Interfaces
// ============================================================

export interface Processor {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  status: string;
  notes: string | null;
  assignedStoresCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface ProcessorListResponse {
  processors: Processor[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface CreateProcessorData {
  name: string;
  email: string;
  password: string;
  phone?: string;
  notes?: string;
}

export interface UpdateProcessorData {
  name?: string;
  email?: string;
  phone?: string;
  status?: string;
  notes?: string;
}

export interface AssignedStore {
  assignmentId: string;
  pharmacyId: string;
  businessName: string;
  storeNumber: string | null;
  city: string | null;
  state: string | null;
  address?: string | null;
  serviceType: string | null;
  lastVisitDate?: string | null;
  nextVisitDate?: string | null;
  assignedDate: string;
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

function mapProcessor(row: any, storeCount: number = 0): Processor {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    phone: row.phone,
    status: row.status,
    notes: row.notes,
    assignedStoresCount: storeCount,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// ============================================================
// Service Functions
// ============================================================

export const getProcessors = async (
  page: number = 1,
  limit: number = 20,
  search?: string,
  status?: string
): Promise<ProcessorListResponse> => {
  const sb = ensureAdmin();

  let countQuery = sb.from('processors').select('id', { count: 'exact', head: true });
  let dataQuery = sb.from('processors').select('*');

  if (status && status !== 'all') {
    countQuery = countQuery.eq('status', status);
    dataQuery = dataQuery.eq('status', status);
  }

  if (search) {
    const filter = `name.ilike.%${search}%,email.ilike.%${search}%`;
    countQuery = countQuery.or(filter);
    dataQuery = dataQuery.or(filter);
  }

  const { count, error: countError } = await countQuery;
  if (countError) {
    throw new AppError(`Failed to count processors: ${countError.message}`, 400);
  }

  const total = count ?? 0;
  const totalPages = Math.ceil(total / limit);
  const offset = (page - 1) * limit;

  const { data, error } = await dataQuery
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    throw new AppError(`Failed to fetch processors: ${error.message}`, 400);
  }

  const processorIds = (data || []).map((p: any) => p.id);
  let storeCounts: Record<string, number> = {};

  if (processorIds.length > 0) {
    const { data: assignments } = await sb
      .from('processor_store_assignments')
      .select('processor_id');

    if (assignments) {
      for (const a of assignments) {
        if (processorIds.includes(a.processor_id)) {
          storeCounts[a.processor_id] = (storeCounts[a.processor_id] || 0) + 1;
        }
      }
    }
  }

  return {
    processors: (data || []).map((row: any) => mapProcessor(row, storeCounts[row.id] || 0)),
    pagination: { page, limit, total, totalPages },
  };
};

export const getProcessorById = async (processorId: string): Promise<Processor> => {
  const sb = ensureAdmin();

  const { data, error } = await sb
    .from('processors')
    .select('*')
    .eq('id', processorId)
    .single();

  if (error) {
    throw new AppError(
      error.code === 'PGRST116' ? 'Processor not found' : `Failed to fetch processor: ${error.message}`,
      error.code === 'PGRST116' ? 404 : 400
    );
  }

  const { count } = await sb
    .from('processor_store_assignments')
    .select('id', { count: 'exact', head: true })
    .eq('processor_id', processorId);

  return mapProcessor(data, count ?? 0);
};

export const createProcessor = async (input: CreateProcessorData): Promise<Processor> => {
  const sb = ensureAdmin();

  if (!input.name || !input.name.trim()) {
    throw new AppError('Processor name is required', 400);
  }

  if (!input.email || !input.email.trim()) {
    throw new AppError('Processor email is required (used for login)', 400);
  }

  if (!input.password || input.password.length < 8) {
    throw new AppError('Password is required and must be at least 8 characters', 400);
  }

  const email = input.email.toLowerCase().trim();

  const { data: existingProcessor } = await sb
    .from('processors')
    .select('id')
    .eq('email', email)
    .maybeSingle();
  if (existingProcessor) {
    throw new AppError('A processor with this email already exists', 409);
  }

  const { data: existingAdmin } = await sb
    .from('admin')
    .select('id')
    .eq('email', email)
    .maybeSingle();
  if (existingAdmin) {
    throw new AppError('An admin user with this email already exists', 409);
  }

  const passwordHash = await bcrypt.hash(input.password, 10);

  const { data: adminUser, error: adminError } = await sb
    .from('admin')
    .insert({
      email,
      password_hash: passwordHash,
      name: input.name.trim(),
      role: 'processor',
      is_active: true,
    })
    .select('id')
    .single();

  if (adminError) {
    throw new AppError(`Failed to create admin login for processor: ${adminError.message}`, 400);
  }

  const insertData: Record<string, any> = {
    name: input.name.trim(),
    email,
    status: 'active',
    admin_user_id: adminUser.id,
  };
  if (input.phone) insertData.phone = input.phone.trim();
  if (input.notes) insertData.notes = input.notes.trim();

  const { data, error } = await sb
    .from('processors')
    .insert(insertData)
    .select('*')
    .single();

  if (error) {
    await sb.from('admin').delete().eq('id', adminUser.id);
    throw new AppError(`Failed to create processor: ${error.message}`, 400);
  }

  return mapProcessor(data, 0);
};

export const updateProcessor = async (
  processorId: string,
  updates: UpdateProcessorData
): Promise<Processor> => {
  const sb = ensureAdmin();

  const dbUpdates: Record<string, any> = {};
  if (updates.name !== undefined) dbUpdates.name = updates.name.trim();
  if (updates.email !== undefined) dbUpdates.email = updates.email?.toLowerCase().trim() || null;
  if (updates.phone !== undefined) dbUpdates.phone = updates.phone?.trim() || null;
  if (updates.notes !== undefined) dbUpdates.notes = updates.notes?.trim() || null;
  if (updates.status !== undefined) {
    if (!['active', 'inactive'].includes(updates.status)) {
      throw new AppError('Status must be either "active" or "inactive"', 400);
    }
    dbUpdates.status = updates.status;
  }

  if (Object.keys(dbUpdates).length === 0) {
    throw new AppError('No valid fields provided for update', 400);
  }

  if (dbUpdates.email) {
    const { data: existing } = await sb
      .from('processors')
      .select('id')
      .eq('email', dbUpdates.email)
      .neq('id', processorId)
      .maybeSingle();
    if (existing) {
      throw new AppError('A processor with this email already exists', 409);
    }
  }

  const { data, error } = await sb
    .from('processors')
    .update(dbUpdates)
    .eq('id', processorId)
    .select('*')
    .single();

  if (error) {
    throw new AppError(
      error.code === 'PGRST116' ? 'Processor not found' : `Failed to update processor: ${error.message}`,
      error.code === 'PGRST116' ? 404 : 400
    );
  }

  const { count } = await sb
    .from('processor_store_assignments')
    .select('id', { count: 'exact', head: true })
    .eq('processor_id', processorId);

  return mapProcessor(data, count ?? 0);
};

export const deactivateProcessor = async (processorId: string): Promise<void> => {
  const sb = ensureAdmin();

  const { data: proc } = await sb
    .from('processors')
    .select('admin_user_id')
    .eq('id', processorId)
    .single();

  const { error } = await sb
    .from('processors')
    .update({ status: 'inactive' })
    .eq('id', processorId);

  if (error) {
    throw new AppError(`Failed to deactivate processor: ${error.message}`, 400);
  }

  if (proc?.admin_user_id) {
    await sb
      .from('admin')
      .update({ is_active: false })
      .eq('id', proc.admin_user_id);
  }
};

export const getProcessorStores = async (processorId: string): Promise<AssignedStore[]> => {
  const sb = ensureAdmin();

  await getProcessorById(processorId);

  const { data, error } = await sb
    .from('processor_store_assignments')
    .select('id, processor_id, pharmacy_id, assigned_date')
    .eq('processor_id', processorId)
    .order('assigned_date', { ascending: false });

  if (error) {
    throw new AppError(`Failed to fetch assigned stores: ${error.message}`, 400);
  }

  if (!data || data.length === 0) return [];

  const pharmacyIds = data.map((a: any) => a.pharmacy_id);
  
  // Fetch pharmacy data using the correct column names from the actual schema
  const { data: pharmacies, error: pharmacyError } = await sb
    .from('pharmacy')
    .select(`
      id,
      pharmacy_name,
      email,
      phone,
      physical_address,
      store_number,
      service_type,
      last_visit_date,
      next_visit_date
    `)
    .in('id', pharmacyIds);

  if (pharmacyError) {
    console.error('Error fetching pharmacy data:', pharmacyError.message);
  }

  const pharmacyMap: Record<string, any> = {};
  if (pharmacies) {
    for (const p of pharmacies) {
      pharmacyMap[p.id] = p;
    }
  }

  return data.map((a: any) => {
    const pharm = pharmacyMap[a.pharmacy_id] || {};
    
    // Use pharmacy_name as business name, fallback to email or create identifier
    const businessName = pharm.pharmacy_name || pharm.email || `Pharmacy ${a.pharmacy_id.slice(0, 8)}`;
    
    // Extract city and state from physical_address if it exists
    let city = null;
    let state = null;
    let address = null;
    
    if (pharm.physical_address) {
      try {
        const addressObj = typeof pharm.physical_address === 'string' 
          ? JSON.parse(pharm.physical_address) 
          : pharm.physical_address;
        city = addressObj?.city || null;
        state = addressObj?.state || null;
        address = addressObj?.street || null;
      } catch (e) {
        // If physical_address is not JSON, treat it as a string address
        address = pharm.physical_address;
      }
    }
    
    return {
      assignmentId: a.id,
      pharmacyId: a.pharmacy_id,
      businessName,
      storeNumber: pharm.store_number || null,
      city,
      state,
      address,
      serviceType: pharm.service_type || 'full_service',
      lastVisitDate: pharm.last_visit_date || null,
      nextVisitDate: pharm.next_visit_date || null,
      assignedDate: a.assigned_date,
    };
  });
};

export const assignStoresToProcessor = async (
  processorId: string,
  pharmacyIds: string[]
): Promise<{ assigned: number; skipped: number }> => {
  const sb = ensureAdmin();

  const processor = await getProcessorById(processorId);
  if (processor.status !== 'active') {
    throw new AppError('Cannot assign stores to an inactive processor', 400);
  }

  if (!pharmacyIds || pharmacyIds.length === 0) {
    throw new AppError('At least one pharmacy ID is required', 400);
  }

  const { data: existingPharmacies } = await sb
    .from('pharmacy')
    .select('id')
    .in('id', pharmacyIds);

  const validIds = new Set((existingPharmacies || []).map((p: any) => p.id));
  const invalidIds = pharmacyIds.filter((id) => !validIds.has(id));
  if (invalidIds.length > 0) {
    throw new AppError(`Pharmacies not found: ${invalidIds.join(', ')}`, 404);
  }

  const { data: existing } = await sb
    .from('processor_store_assignments')
    .select('pharmacy_id')
    .eq('processor_id', processorId)
    .in('pharmacy_id', pharmacyIds);

  const alreadyAssigned = new Set((existing || []).map((e: any) => e.pharmacy_id));
  const toInsert = pharmacyIds
    .filter((id) => !alreadyAssigned.has(id))
    .map((pharmacyId) => ({
      processor_id: processorId,
      pharmacy_id: pharmacyId,
    }));

  if (toInsert.length > 0) {
    const { error } = await sb
      .from('processor_store_assignments')
      .insert(toInsert);

    if (error) {
      throw new AppError(`Failed to assign stores: ${error.message}`, 400);
    }

    await sb
      .from('pharmacy')
      .update({ assigned_processor_id: processorId })
      .in('id', toInsert.map((r) => r.pharmacy_id));
  }

  return {
    assigned: toInsert.length,
    skipped: alreadyAssigned.size,
  };
};

export const getMyStores = async (processorId: string): Promise<AssignedStore[]> => {
  const sb = ensureAdmin();

  const { data: assignments, error } = await sb
    .from('processor_store_assignments')
    .select('id, processor_id, pharmacy_id, assigned_date')
    .eq('processor_id', processorId)
    .order('assigned_date', { ascending: false });

  if (error) {
    throw new AppError(`Failed to fetch assigned stores: ${error.message}`, 400);
  }

  if (!assignments || assignments.length === 0) return [];

  const pharmacyIds = assignments.map((a: any) => a.pharmacy_id);
  const { data: pharmacies } = await sb
    .from('pharmacy')
    .select('id, business_name, store_number, city, state, address, service_type, last_visit_date, next_visit_date')
    .in('id', pharmacyIds);

  const pharmacyMap: Record<string, any> = {};
  if (pharmacies) {
    for (const p of pharmacies) {
      pharmacyMap[p.id] = p;
    }
  }

  return assignments.map((a: any) => {
    const pharm = pharmacyMap[a.pharmacy_id] || {};
    return {
      assignmentId: a.id,
      pharmacyId: a.pharmacy_id,
      businessName: pharm.business_name || 'Unknown',
      storeNumber: pharm.store_number || null,
      city: pharm.city || null,
      state: pharm.state || null,
      address: pharm.address || null,
      serviceType: pharm.service_type || null,
      lastVisitDate: pharm.last_visit_date || null,
      nextVisitDate: pharm.next_visit_date || null,
      assignedDate: a.assigned_date,
    };
  });
};

export const unassignStoreFromProcessor = async (
  processorId: string,
  pharmacyId: string
): Promise<void> => {
  const sb = ensureAdmin();

  const { error } = await sb
    .from('processor_store_assignments')
    .delete()
    .eq('processor_id', processorId)
    .eq('pharmacy_id', pharmacyId);

  if (error) {
    throw new AppError(`Failed to unassign store: ${error.message}`, 400);
  }

  await sb
    .from('pharmacy')
    .update({ assigned_processor_id: null })
    .eq('id', pharmacyId)
    .eq('assigned_processor_id', processorId);
};
