import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';

// =====================================================================
// Types
// =====================================================================

export type ServiceRequestStatus = 'pending' | 'scheduled' | 'completed' | 'cancelled';
export type ServiceRequestPurpose =
  | 'return_pickup'
  | 'training'
  | 'inventory_review'
  | 'destruction_pickup'
  | 'other';

export interface ServiceRequest {
  id: string;
  pharmacy_id: string;
  branch_id: string | null;
  requested_date: string;
  purpose: ServiceRequestPurpose;
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
  cancelled_by: string | null;
  created_at: string;
  updated_at: string;

  pharmacy_business_name?: string | null;
  pharmacy_name?: string | null;
  pharmacy_phone?: string | null;
  pharmacy_email?: string | null;
  pharmacy_address?: string | null;
  branch_business_name?: string | null;
  branch_name?: string | null;
  branch_address?: string | null;
  claimed_processor_name?: string | null;
  claimed_processor_email?: string | null;
  is_claimed_by_me?: boolean;
  assigned_processors?: Array<{
    processor_id: string;
    name: string | null;
    email: string | null;
    phone: string | null;
  }>;
}

export interface ServiceRequestListResponse {
  items: ServiceRequest[];
  total: number;
  page: number;
  limit: number;
}

export interface ServiceRequestsState {
  items: ServiceRequest[];
  total: number;
  page: number;
  limit: number;
  statusFilter: string;
  search: string;
  isLoading: boolean;
  isActing: boolean;
  error: string | null;
}

const initialState: ServiceRequestsState = {
  items: [],
  total: 0,
  page: 1,
  limit: 20,
  statusFilter: 'all',
  search: '',
  isLoading: false,
  isActing: false,
  error: null,
};

// =====================================================================
// Helpers
// =====================================================================

async function getClientAndToken() {
  const { apiClient } = await import('@/lib/api/apiClient');
  const { cookieUtils } = await import('@/lib/utils/cookies');
  const token = cookieUtils.getAuthToken();
  return { apiClient, token };
}

// =====================================================================
// Thunks
// =====================================================================

interface FetchParams {
  role: 'processor' | 'admin' | string | undefined;
  page?: number;
  limit?: number;
  status?: string;
  search?: string;
}

export const fetchServiceRequests = createAsyncThunk(
  'serviceRequests/fetch',
  async (params: FetchParams, { rejectWithValue }) => {
    try {
      const { apiClient, token } = await getClientAndToken();
      if (!token) return rejectWithValue('Authentication required.');

      const base = params.role === 'processor'
        ? '/processors/service-requests'
        : '/admin/service-requests';

      const query: Record<string, string | number> = {};
      if (params.page)    query.page = params.page;
      if (params.limit)   query.limit = params.limit;
      if (params.status && params.status !== 'all') query.status = params.status;
      if (params.search)  query.search = params.search;

      const res = await apiClient.get<{ status: string; data: ServiceRequestListResponse }>(
        base, true, query
      );
      return res.data;
    } catch (error: any) {
      return rejectWithValue(error?.message || 'Failed to fetch service requests');
    }
  }
);

// ---- Processor actions ----

export const processorScheduleServiceRequest = createAsyncThunk(
  'serviceRequests/processorSchedule',
  async (
    { id, scheduledDate, notes }: { id: string; scheduledDate: string; notes?: string },
    { rejectWithValue }
  ) => {
    try {
      const { apiClient, token } = await getClientAndToken();
      if (!token) return rejectWithValue('Authentication required.');
      const res = await apiClient.post<{ status: string; data: ServiceRequest }>(
        `/processors/service-requests/${id}/schedule`,
        { scheduled_date: scheduledDate, notes: notes || null },
        true
      );
      return res.data;
    } catch (error: any) {
      return rejectWithValue(error?.message || 'Failed to schedule request');
    }
  }
);

export const processorCompleteServiceRequest = createAsyncThunk(
  'serviceRequests/processorComplete',
  async (
    { id, notes }: { id: string; notes?: string },
    { rejectWithValue }
  ) => {
    try {
      const { apiClient, token } = await getClientAndToken();
      if (!token) return rejectWithValue('Authentication required.');
      const res = await apiClient.post<{ status: string; data: ServiceRequest }>(
        `/processors/service-requests/${id}/complete`,
        { notes: notes || null },
        true
      );
      return res.data;
    } catch (error: any) {
      return rejectWithValue(error?.message || 'Failed to complete request');
    }
  }
);

export const processorCancelServiceRequest = createAsyncThunk(
  'serviceRequests/processorCancel',
  async (
    { id, reason }: { id: string; reason?: string },
    { rejectWithValue }
  ) => {
    try {
      const { apiClient, token } = await getClientAndToken();
      if (!token) return rejectWithValue('Authentication required.');
      const res = await apiClient.post<{ status: string; data: ServiceRequest }>(
        `/processors/service-requests/${id}/cancel`,
        { reason: reason || null },
        true
      );
      return res.data;
    } catch (error: any) {
      return rejectWithValue(error?.message || 'Failed to cancel request');
    }
  }
);

export const processorReleaseServiceRequest = createAsyncThunk(
  'serviceRequests/processorRelease',
  async (id: string, { rejectWithValue }) => {
    try {
      const { apiClient, token } = await getClientAndToken();
      if (!token) return rejectWithValue('Authentication required.');
      const res = await apiClient.post<{ status: string; data: ServiceRequest }>(
        `/processors/service-requests/${id}/release`,
        {},
        true
      );
      return res.data;
    } catch (error: any) {
      return rejectWithValue(error?.message || 'Failed to release request');
    }
  }
);

// ---- Admin actions ----

export const adminReassignServiceRequest = createAsyncThunk(
  'serviceRequests/adminReassign',
  async (
    { id, processorIds }: { id: string; processorIds: string[] },
    { rejectWithValue }
  ) => {
    try {
      const { apiClient, token } = await getClientAndToken();
      if (!token) return rejectWithValue('Authentication required.');
      const res = await apiClient.post<{ status: string; data: ServiceRequest }>(
        `/admin/service-requests/${id}/reassign`,
        { processor_ids: processorIds },
        true
      );
      return res.data;
    } catch (error: any) {
      return rejectWithValue(error?.message || 'Failed to reassign request');
    }
  }
);

// =====================================================================
// Slice
// =====================================================================

const slice = createSlice({
  name: 'serviceRequests',
  initialState,
  reducers: {
    setPage: (s, a: PayloadAction<number>) => { s.page = a.payload; },
    setStatusFilter: (s, a: PayloadAction<string>) => { s.statusFilter = a.payload; s.page = 1; },
    setSearch: (s, a: PayloadAction<string>) => { s.search = a.payload; s.page = 1; },
    clearError: (s) => { s.error = null; },
  },
  extraReducers: (b) => {
    b
      .addCase(fetchServiceRequests.pending, (s) => {
        s.isLoading = true; s.error = null;
      })
      .addCase(fetchServiceRequests.fulfilled, (s, a: PayloadAction<ServiceRequestListResponse>) => {
        s.isLoading = false;
        s.items = a.payload.items || [];
        s.total = a.payload.total || 0;
        s.page  = a.payload.page  || 1;
        s.limit = a.payload.limit || 20;
      })
      .addCase(fetchServiceRequests.rejected, (s, a) => {
        s.isLoading = false; s.error = (a.payload as string) || (a.error?.message ?? 'Fetch failed');
      });

    // helper: merge updated item by id
    const mergeUpdated = (s: ServiceRequestsState, updated: ServiceRequest | undefined) => {
      if (!updated) return;
      const idx = s.items.findIndex((r) => r.id === updated.id);
      if (idx >= 0) {
        s.items[idx] = { ...s.items[idx], ...updated };
      }
    };

    [
      processorScheduleServiceRequest,
      processorCompleteServiceRequest,
      processorCancelServiceRequest,
      processorReleaseServiceRequest,
      adminReassignServiceRequest,
    ].forEach((thunk) => {
      b
        .addCase(thunk.pending, (s) => { s.isActing = true; s.error = null; })
        .addCase(thunk.fulfilled, (s, a: PayloadAction<ServiceRequest>) => {
          s.isActing = false;
          mergeUpdated(s, a.payload);
        })
        .addCase(thunk.rejected, (s, a) => {
          s.isActing = false;
          s.error = (a.payload as string) || (a.error?.message ?? 'Action failed');
        });
    });
  },
});

export const { setPage, setStatusFilter, setSearch, clearError } = slice.actions;
export default slice.reducer;

export const PURPOSE_LABELS: Record<ServiceRequestPurpose, string> = {
  return_pickup: 'Return Pickup',
  training: 'Training',
  inventory_review: 'Inventory Review',
  destruction_pickup: 'Destruction Pickup',
  other: 'Other',
};
