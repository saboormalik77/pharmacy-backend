import { apiClient } from '../client';

export type ServiceRequestPurpose =
  | 'return_pickup'
  | 'training'
  | 'inventory_review'
  | 'destruction_pickup'
  | 'other';

export type ServiceRequestStatus =
  | 'pending'
  | 'scheduled'
  | 'completed'
  | 'cancelled';

export interface ServiceRequestListItem {
  id: string;
  pharmacy_id: string;
  branch_id: string | null;
  requested_by_user_id: string | null;
  requested_date: string;
  purpose: ServiceRequestPurpose | null;
  special_instructions: string | null;
  status: ServiceRequestStatus;
  scheduled_date: string | null;
  claimed_by_processor_id: string | null;
  claimed_at: string | null;
  scheduler_notes: string | null;
  completed_at: string | null;
  completion_notes: string | null;
  cancelled_at: string | null;
  cancelled_reason: string | null;
  cancelled_by: 'pharmacy' | 'processor' | 'admin' | null;
  created_at: string;
  updated_at: string;
  // Joined (pharmacy list)
  branch_business_name?: string | null;
  branch_name?: string | null;
  claimed_processor_name?: string | null;
  claimed_processor_email?: string | null;
  claimed_processor_phone?: string | null;
}

export interface ServiceRequestListResponse {
  items: ServiceRequestListItem[];
  total: number;
  page: number;
  limit: number;
}

export interface ServiceRequestDetail extends ServiceRequestListItem {
  pharmacy: {
    id: string;
    business_name: string | null;
    pharmacy_name: string | null;
    email: string | null;
    phone: string | null;
    address: string | null;
  } | null;
  branch: {
    id: string;
    business_name: string | null;
    pharmacy_name: string | null;
    address: string | null;
  } | null;
  claimed_processor: {
    processor_id: string;
    name: string | null;
    email: string | null;
    phone: string | null;
  } | null;
  assigned_processors: Array<{
    processor_id: string;
    name: string | null;
    email: string | null;
    phone: string | null;
    status: string | null;
  }>;
}

export interface CreateServiceRequestPayload {
  requested_date: string; // YYYY-MM-DD
  branch_id?: string | null;
  purpose: ServiceRequestPurpose | null;
  special_instructions?: string | null;
}

export interface ListFilters {
  status?: string;
  page?: number;
  limit?: number;
}

const buildQuery = (params: Record<string, string | number | undefined>): string => {
  const qs = Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== '' && v !== null)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
    .join('&');
  return qs ? `?${qs}` : '';
};

export const onSiteServiceService = {
  async list(filters: ListFilters = {}): Promise<ServiceRequestListResponse> {
    try {
      const qs = buildQuery({
        status: filters.status,
        page: filters.page,
        limit: filters.limit,
      });
      const res = await apiClient.get<ServiceRequestListResponse>(`/on-site-service${qs}`);
      if (res.status !== 'success' || !res.data) {
        // Enhanced error for better debugging
        const errorMsg = res.message || 'Failed to load service requests';
        console.error('[OnSiteService] List failed:', { res, filters, qs });
        throw { 
          status: 400, 
          message: errorMsg,
          originalResponse: res 
        };
      }
      return res.data;
    } catch (error: any) {
      console.error('[OnSiteService] List error:', error);
      // Re-throw with better context
      throw {
        status: error.status || 500,
        message: error.message || 'Failed to load service requests',
        originalError: error,
      };
    }
  },

  async getById(id: string): Promise<ServiceRequestDetail> {
    const res = await apiClient.get<ServiceRequestDetail>(`/on-site-service/${id}`);
    if (res.status !== 'success' || !res.data) {
      throw new Error(res.message || 'Failed to load service request');
    }
    return res.data;
  },

  async create(payload: CreateServiceRequestPayload): Promise<ServiceRequestListItem> {
    const res = await apiClient.post<ServiceRequestListItem>('/on-site-service', payload);
    if (res.status !== 'success' || !res.data) {
      throw new Error(res.message || 'Failed to create service request');
    }
    return res.data;
  },

  async cancel(id: string, reason?: string): Promise<ServiceRequestListItem> {
    const res = await apiClient.post<ServiceRequestListItem>(
      `/on-site-service/${id}/cancel`,
      { reason: reason || null }
    );
    if (res.status !== 'success' || !res.data) {
      throw new Error(res.message || 'Failed to cancel service request');
    }
    return res.data;
  },
};

export const purposeLabels: Record<ServiceRequestPurpose, string> = {
  return_pickup: 'Return Pickup',
  training: 'Training',
  inventory_review: 'Inventory Review',
  destruction_pickup: 'Destruction Pickup',
  other: 'Other',
};
