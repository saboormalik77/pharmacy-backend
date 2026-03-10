import { supabaseAdmin } from '../config/supabase';
import { AppError } from '../utils/appError';

// ============================================================
// Interfaces
// ============================================================

export interface PharmacyListItem {
  id: string;
  businessName: string;
  owner: string;
  email: string;
  phone: string | null;
  city: string;
  state: string;
  status: string;
  address: string;
  zipCode: string;
  licenseNumber: string;
  totalReturns: number;
  createdAt: string;
}

export interface PharmacyDetails extends PharmacyListItem {
  stateLicenseNumber: string | null;
  licenseExpiryDate: string | null;
  npiNumber: string | null;
  deaNumber: string | null;
  totalReturnsValue: number;
  physicalAddress: {
    street?: string;
    city?: string;
    state?: string;
    zip?: string;
  } | null;
  billingAddress: {
    street?: string;
    city?: string;
    state?: string;
    zip?: string;
  } | null;
  subscriptionTier: string | null;
  subscriptionStatus: string | null;
  updatedAt: string;
}

export interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PharmaciesListResponse {
  pharmacies: PharmacyListItem[];
  pagination: PaginationInfo;
  filters: {
    search: string | null;
    status: string;
  };
  generatedAt: string;
}

export interface PharmacyDetailsResponse {
  pharmacy: PharmacyDetails;
  generatedAt: string;
}

export interface UpdatePharmacyData {
  businessName?: string;
  owner?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  licenseNumber?: string;
  stateLicenseNumber?: string;
  licenseExpiryDate?: string;
  npiNumber?: string;
  deaNumber?: string;
  physicalAddress?: {
    street?: string;
    city?: string;
    state?: string;
    zip?: string;
  };
  billingAddress?: {
    street?: string;
    city?: string;
    state?: string;
    zip?: string;
  };
  subscriptionTier?: string;
  subscriptionStatus?: string;
}

export interface PharmacyStoreSettings {
  storeNumber: string | null;
  primaryWholesaler: string | null;
  wholesalerAccountNumber: string | null;
  secondaryWholesaler: string | null;
  gpoAffiliation: string | null;
  serviceType: string;
  assignedProcessorId: string | null;
  assignedProcessorName: string | null;
  assignedSalesPersonId: string | null;
  lastVisitDate: string | null;
  nextVisitDate: string | null;
  daysBetweenVisits: number;
  deaExpirationDate: string | null;
  deaExpirationWarning: string | null;
  faxNumber: string | null;
}

export interface UpdatePharmacyStoreSettingsData {
  storeNumber?: string;
  primaryWholesaler?: string;
  wholesalerAccountNumber?: string;
  secondaryWholesaler?: string;
  gpoAffiliation?: string;
  serviceType?: string;
  assignedProcessorId?: string | null;
  assignedSalesPersonId?: string | null;
  lastVisitDate?: string;
  nextVisitDate?: string;
  daysBetweenVisits?: number;
  deaExpirationDate?: string;
  faxNumber?: string;
}

// ============================================================
// Service Functions
// ============================================================

/**
 * Get list of pharmacies with search, filter, and pagination
 * Uses PostgreSQL RPC function - no custom JS logic
 */
export const getPharmaciesList = async (
  search?: string,
  status: string = 'all',
  page: number = 1,
  limit: number = 20
): Promise<PharmaciesListResponse> => {
  if (!supabaseAdmin) {
    throw new AppError('Supabase admin client not configured', 500);
  }

  console.log(`📋 Fetching pharmacies list (search: ${search || 'none'}, status: ${status}, page: ${page})`);

  const { data, error } = await supabaseAdmin.rpc('get_admin_pharmacies_list', {
    p_search: search || null,
    p_status: status,
    p_page: page,
    p_limit: limit,
  });

  if (error) {
    throw new AppError(`Failed to fetch pharmacies: ${error.message}`, 400);
  }

  if (!data) {
    throw new AppError('No data returned from pharmacies list', 500);
  }

  console.log(`✅ Found ${data.pagination?.total || 0} pharmacies`);

  return {
    pharmacies: data.pharmacies || [],
    pagination: data.pagination,
    filters: data.filters,
    generatedAt: data.generatedAt,
  };
};

/**
 * Get single pharmacy details by ID
 * Uses PostgreSQL RPC function - no custom JS logic
 */
export const getPharmacyById = async (
  pharmacyId: string
): Promise<PharmacyDetailsResponse> => {
  if (!supabaseAdmin) {
    throw new AppError('Supabase admin client not configured', 500);
  }

  console.log(`🔍 Fetching pharmacy details for ID: ${pharmacyId}`);

  const { data, error } = await supabaseAdmin.rpc('get_admin_pharmacy_by_id', {
    p_pharmacy_id: pharmacyId,
  });

  if (error) {
    throw new AppError(`Failed to fetch pharmacy: ${error.message}`, 400);
  }

  if (!data) {
    throw new AppError('No data returned from pharmacy details', 500);
  }

  // Check for RPC-level errors
  if (data.error) {
    throw new AppError(data.message || 'Pharmacy not found', data.code || 404);
  }

  console.log(`✅ Pharmacy found: ${data.pharmacy?.businessName}`);

  return {
    pharmacy: data.pharmacy,
    generatedAt: data.generatedAt,
  };
};

/**
 * Update pharmacy details
 * Uses PostgreSQL RPC function - no custom JS logic
 */
export const updatePharmacy = async (
  pharmacyId: string,
  updates: UpdatePharmacyData
): Promise<PharmacyDetailsResponse> => {
  if (!supabaseAdmin) {
    throw new AppError('Supabase admin client not configured', 500);
  }

  console.log(`✏️ Updating pharmacy: ${pharmacyId}`);

  const { data, error } = await supabaseAdmin.rpc('update_admin_pharmacy', {
    p_pharmacy_id: pharmacyId,
    p_updates: updates,
  });

  if (error) {
    throw new AppError(`Failed to update pharmacy: ${error.message}`, 400);
  }

  if (!data) {
    throw new AppError('No data returned from pharmacy update', 500);
  }

  // Check for RPC-level errors
  if (data.error) {
    throw new AppError(data.message || 'Failed to update pharmacy', data.code || 400);
  }

  console.log(`✅ Pharmacy updated: ${data.pharmacy?.businessName}`);

  return {
    pharmacy: data.pharmacy,
    generatedAt: data.generatedAt,
  };
};

/**
 * Update pharmacy status (blacklist/restore/suspend)
 * Uses PostgreSQL RPC function - no custom JS logic
 */
export const updatePharmacyStatus = async (
  pharmacyId: string,
  newStatus: string
): Promise<PharmacyDetailsResponse & { statusChange: { from: string; to: string } }> => {
  if (!supabaseAdmin) {
    throw new AppError('Supabase admin client not configured', 500);
  }

  console.log(`🔄 Updating pharmacy status: ${pharmacyId} -> ${newStatus}`);

  const { data, error } = await supabaseAdmin.rpc('update_admin_pharmacy_status', {
    p_pharmacy_id: pharmacyId,
    p_new_status: newStatus,
  });

  if (error) {
    throw new AppError(`Failed to update pharmacy status: ${error.message}`, 400);
  }

  if (!data) {
    throw new AppError('No data returned from status update', 500);
  }

  // Check for RPC-level errors
  if (data.error) {
    throw new AppError(data.message || 'Failed to update pharmacy status', data.code || 400);
  }

  console.log(`✅ Pharmacy status updated: ${data.statusChange?.from} -> ${data.statusChange?.to}`);

  return {
    pharmacy: data.pharmacy,
    statusChange: data.statusChange,
    generatedAt: data.generatedAt,
  };
};

// ============================================================
// FCR Store-Settings Functions (direct queries, no RPC)
// ============================================================

const FCR_PHARMACY_COLUMNS = `
  store_number,
  primary_wholesaler,
  wholesaler_account_number,
  secondary_wholesaler,
  gpo_affiliation,
  service_type,
  assigned_processor_id,
  assigned_sales_person_id,
  last_visit_date,
  next_visit_date,
  days_between_visits,
  dea_expiration_date,
  dea_number,
  fax_number
`;

function buildDeaWarning(deaExp: string | null): string | null {
  if (!deaExp) return 'DEA expiration date is missing';
  const expDate = new Date(deaExp);
  const now = new Date();
  if (expDate < now) return 'DEA is expired';
  const daysLeft = Math.ceil((expDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  if (daysLeft <= 30) return `DEA expires in ${daysLeft} days`;
  return null;
}

export const getPharmacyStoreSettings = async (
  pharmacyId: string
): Promise<PharmacyStoreSettings> => {
  if (!supabaseAdmin) {
    throw new AppError('Supabase admin client not configured', 500);
  }

  const { data, error } = await supabaseAdmin
    .from('pharmacy')
    .select(FCR_PHARMACY_COLUMNS)
    .eq('id', pharmacyId)
    .single();

  if (error) {
    throw new AppError(`Failed to fetch pharmacy store settings: ${error.message}`, error.code === 'PGRST116' ? 404 : 400);
  }

  if (!data) {
    throw new AppError('Pharmacy not found', 404);
  }

  let processorName: string | null = null;
  if (data.assigned_processor_id) {
    const { data: proc } = await supabaseAdmin
      .from('processors')
      .select('name')
      .eq('id', data.assigned_processor_id)
      .single();
    processorName = proc?.name || null;
  }

  return {
    storeNumber: data.store_number,
    primaryWholesaler: data.primary_wholesaler,
    wholesalerAccountNumber: data.wholesaler_account_number,
    secondaryWholesaler: data.secondary_wholesaler,
    gpoAffiliation: data.gpo_affiliation,
    serviceType: data.service_type || 'full_service',
    assignedProcessorId: data.assigned_processor_id,
    assignedProcessorName: processorName,
    assignedSalesPersonId: data.assigned_sales_person_id,
    lastVisitDate: data.last_visit_date,
    nextVisitDate: data.next_visit_date,
    daysBetweenVisits: data.days_between_visits ?? 120,
    deaExpirationDate: data.dea_expiration_date,
    deaExpirationWarning: buildDeaWarning(data.dea_expiration_date),
    faxNumber: data.fax_number,
  };
};

export const updatePharmacyStoreSettings = async (
  pharmacyId: string,
  updates: UpdatePharmacyStoreSettingsData
): Promise<PharmacyStoreSettings> => {
  if (!supabaseAdmin) {
    throw new AppError('Supabase admin client not configured', 500);
  }

  const dbUpdates: Record<string, any> = {};
  if (updates.storeNumber !== undefined) dbUpdates.store_number = updates.storeNumber;
  if (updates.primaryWholesaler !== undefined) dbUpdates.primary_wholesaler = updates.primaryWholesaler;
  if (updates.wholesalerAccountNumber !== undefined) dbUpdates.wholesaler_account_number = updates.wholesalerAccountNumber;
  if (updates.secondaryWholesaler !== undefined) dbUpdates.secondary_wholesaler = updates.secondaryWholesaler;
  if (updates.gpoAffiliation !== undefined) dbUpdates.gpo_affiliation = updates.gpoAffiliation;
  if (updates.serviceType !== undefined) dbUpdates.service_type = updates.serviceType;
  if (updates.assignedProcessorId !== undefined) dbUpdates.assigned_processor_id = updates.assignedProcessorId;
  if (updates.assignedSalesPersonId !== undefined) dbUpdates.assigned_sales_person_id = updates.assignedSalesPersonId;
  if (updates.lastVisitDate !== undefined) dbUpdates.last_visit_date = updates.lastVisitDate;
  if (updates.nextVisitDate !== undefined) dbUpdates.next_visit_date = updates.nextVisitDate;
  if (updates.daysBetweenVisits !== undefined) dbUpdates.days_between_visits = updates.daysBetweenVisits;
  if (updates.deaExpirationDate !== undefined) dbUpdates.dea_expiration_date = updates.deaExpirationDate;
  if (updates.faxNumber !== undefined) dbUpdates.fax_number = updates.faxNumber;

  if (Object.keys(dbUpdates).length === 0) {
    throw new AppError('No valid fields provided for update', 400);
  }

  if (dbUpdates.store_number) {
    const { data: existing } = await supabaseAdmin
      .from('pharmacy')
      .select('id')
      .eq('store_number', dbUpdates.store_number)
      .neq('id', pharmacyId)
      .maybeSingle();
    if (existing) {
      throw new AppError(`Store number "${dbUpdates.store_number}" is already assigned to another pharmacy`, 409);
    }
  }

  if (dbUpdates.service_type) {
    const valid = ['full_service', 'self_service', 'express'];
    if (!valid.includes(dbUpdates.service_type)) {
      throw new AppError(`Invalid service type. Must be one of: ${valid.join(', ')}`, 400);
    }
  }

  if (dbUpdates.assigned_processor_id) {
    const { data: proc, error: procErr } = await supabaseAdmin
      .from('processors')
      .select('id, status')
      .eq('id', dbUpdates.assigned_processor_id)
      .single();
    if (procErr || !proc) {
      throw new AppError('Assigned processor not found', 404);
    }
    if (proc.status !== 'active') {
      throw new AppError('Cannot assign an inactive processor', 400);
    }
  }

  const { error } = await supabaseAdmin
    .from('pharmacy')
    .update(dbUpdates)
    .eq('id', pharmacyId);

  if (error) {
    throw new AppError(`Failed to update pharmacy store settings: ${error.message}`, 400);
  }

  return getPharmacyStoreSettings(pharmacyId);
};

