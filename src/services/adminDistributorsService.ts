import { supabaseAdmin } from '../config/supabase';
import { AppError } from '../utils/appError';

// ============================================================
// Type Definitions
// ============================================================

export interface DistributorStats {
  totalDistributors: number;
  activeDistributors: number;
  inactiveDistributors: number;
  totalDeals: number;
}

export interface DistributorListItem {
  id: string;
  companyName: string;
  contactPerson: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  status: 'active' | 'inactive';
  licenseNumber: string;
  specializations: string[];
  totalDeals: number;
  createdAt: string;
}

export interface DistributorsListResponse {
  distributors: DistributorListItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  filters: {
    search: string | null;
    status: string;
  };
  stats: DistributorStats;
  generatedAt: string;
}

export interface DistributorDetails extends DistributorListItem {
  code: string;
  portalUrl: string;
  supportedFormats: string[];
  feeRates: Record<string, unknown>;
}

export interface DistributorDetailsResponse {
  distributor: DistributorDetails;
  generatedAt: string;
}

export interface CreateDistributorData {
  companyName: string;
  contactPerson?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  licenseNumber?: string;
  specializations?: string[];
}

export interface UpdateDistributorData {
  companyName?: string;
  contactPerson?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  licenseNumber?: string;
  specializations?: string[];
}

export interface UniqueProductItem {
  reportId: string;
  ndcCode: string;
  productName: string;
  manufacturer: string;
  creditAmount: number;
  pricePerUnit: number;
  quantity: number;
  fullUnits: number;
  partialUnits: number;
  lotNumber: string;
  expirationDate: string;
  packageSize: string;
  reportDate: string;
  fileName: string;
  pharmacyId: string;
}

export interface DistributorUniqueProductsResponse {
  distributor: {
    id: string;
    name: string;
  };
  products: UniqueProductItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  generatedAt: string;
}

// ============================================================
// Service Functions
// ============================================================

/**
 * Get list of distributors with search, filter, pagination AND stats
 * Uses PostgreSQL RPC function - no custom JS logic
 * Stats are included in the response
 */
export const getDistributorsList = async (
  search?: string,
  status: string = 'all',
  page: number = 1,
  limit: number = 20
): Promise<DistributorsListResponse> => {
  if (!supabaseAdmin) {
    throw new AppError('Supabase admin client not configured', 500);
  }

  const { data, error } = await supabaseAdmin.rpc('get_admin_distributors_list', {
    p_search: search || null,
    p_status: status,
    p_page: page,
    p_limit: limit,
  });

  if (error) {
    throw new AppError(`Failed to fetch distributors: ${error.message}`, 400);
  }

  return data as DistributorsListResponse;
};

/**
 * Get single distributor by ID
 * Uses PostgreSQL RPC function - no custom JS logic
 */
export const getDistributorById = async (
  distributorId: string
): Promise<DistributorDetailsResponse> => {
  if (!supabaseAdmin) {
    throw new AppError('Supabase admin client not configured', 500);
  }

  const { data, error } = await supabaseAdmin.rpc('get_admin_distributor_by_id', {
    p_distributor_id: distributorId,
  });

  if (error) {
    if (error.message.includes('not found')) {
      throw new AppError('Distributor not found', 404);
    }
    throw new AppError(`Failed to fetch distributor: ${error.message}`, 400);
  }

  return data as DistributorDetailsResponse;
};

/**
 * Create a new distributor
 * Uses PostgreSQL RPC function - no custom JS logic
 */
export const createDistributor = async (
  distributorData: CreateDistributorData
): Promise<DistributorDetailsResponse> => {
  if (!supabaseAdmin) {
    throw new AppError('Supabase admin client not configured', 500);
  }

  const { data, error } = await supabaseAdmin.rpc('create_admin_distributor', {
    p_company_name: distributorData.companyName,
    p_contact_person: distributorData.contactPerson || null,
    p_email: distributorData.email || null,
    p_phone: distributorData.phone || null,
    p_address: distributorData.address || null,
    p_city: distributorData.city || null,
    p_state: distributorData.state || null,
    p_zip_code: distributorData.zipCode || null,
    p_license_number: distributorData.licenseNumber || null,
    p_specializations: distributorData.specializations || [],
  });

  if (error) {
    if (error.message.includes('required')) {
      throw new AppError(error.message, 400);
    }
    throw new AppError(`Failed to create distributor: ${error.message}`, 400);
  }

  return data as DistributorDetailsResponse;
};

/**
 * Update an existing distributor
 * Uses PostgreSQL RPC function - no custom JS logic
 */
export const updateDistributor = async (
  distributorId: string,
  updates: UpdateDistributorData
): Promise<DistributorDetailsResponse> => {
  if (!supabaseAdmin) {
    throw new AppError('Supabase admin client not configured', 500);
  }

  const { data, error } = await supabaseAdmin.rpc('update_admin_distributor', {
    p_distributor_id: distributorId,
    p_company_name: updates.companyName || null,
    p_contact_person: updates.contactPerson !== undefined ? updates.contactPerson : null,
    p_email: updates.email !== undefined ? updates.email : null,
    p_phone: updates.phone !== undefined ? updates.phone : null,
    p_address: updates.address !== undefined ? updates.address : null,
    p_city: updates.city !== undefined ? updates.city : null,
    p_state: updates.state !== undefined ? updates.state : null,
    p_zip_code: updates.zipCode !== undefined ? updates.zipCode : null,
    p_license_number: updates.licenseNumber !== undefined ? updates.licenseNumber : null,
    p_specializations: updates.specializations !== undefined ? updates.specializations : null,
  });

  if (error) {
    if (error.message.includes('not found')) {
      throw new AppError('Distributor not found', 404);
    }
    throw new AppError(`Failed to update distributor: ${error.message}`, 400);
  }

  return data as DistributorDetailsResponse;
};

/**
 * Update distributor status (activate/deactivate)
 * Uses PostgreSQL RPC function - no custom JS logic
 */
export const updateDistributorStatus = async (
  distributorId: string,
  status: 'active' | 'inactive'
): Promise<DistributorDetailsResponse> => {
  if (!supabaseAdmin) {
    throw new AppError('Supabase admin client not configured', 500);
  }

  const { data, error } = await supabaseAdmin.rpc('update_admin_distributor_status', {
    p_distributor_id: distributorId,
    p_status: status,
  });

  if (error) {
    if (error.message.includes('not found')) {
      throw new AppError('Distributor not found', 404);
    }
    if (error.message.includes('Invalid status')) {
      throw new AppError(error.message, 400);
    }
    throw new AppError(`Failed to update distributor status: ${error.message}`, 400);
  }

  return data as DistributorDetailsResponse;
};

/**
 * Delete a distributor
 * Uses PostgreSQL RPC function - no custom JS logic
 */
export const deleteDistributor = async (
  distributorId: string
): Promise<{ success: boolean; message: string; deletedId: string; deletedAt: string }> => {
  if (!supabaseAdmin) {
    throw new AppError('Supabase admin client not configured', 500);
  }

  const { data, error } = await supabaseAdmin.rpc('delete_admin_distributor', {
    p_distributor_id: distributorId,
  });

  if (error) {
    if (error.message.includes('not found')) {
      throw new AppError('Distributor not found', 404);
    }
    if (error.message.includes('Cannot delete')) {
      throw new AppError(error.message, 400);
    }
    throw new AppError(`Failed to delete distributor: ${error.message}`, 400);
  }

  return data;
};

/**
 * Get unique products for a distributor
 * Returns unique NDCs with only the latest record per NDC based on report_date
 * Uses PostgreSQL RPC function - no custom JS logic
 */
export const getDistributorUniqueProducts = async (
  distributorId: string,
  page: number = 1,
  limit: number = 50
): Promise<DistributorUniqueProductsResponse> => {
  if (!supabaseAdmin) {
    throw new AppError('Supabase admin client not configured', 500);
  }

  const { data, error } = await supabaseAdmin.rpc('get_distributor_unique_products', {
    p_distributor_id: distributorId,
    p_page: page,
    p_limit: limit,
  });

  if (error) {
    if (error.message.includes('not found')) {
      throw new AppError('Distributor not found', 404);
    }
    throw new AppError(`Failed to fetch distributor products: ${error.message}`, 400);
  }

  return data as DistributorUniqueProductsResponse;
};
