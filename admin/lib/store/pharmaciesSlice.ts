import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { 
  PharmaciesResponse, 
  Pharmacy, 
  PharmacyUpdatePayload, 
  PharmacyStatusUpdatePayload 
} from '@/lib/types';

export interface PharmaciesState {
  pharmacies: Pharmacy[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  } | null;
  filters: {
    search: string;
    status: 'all' | 'pending' | 'active' | 'suspended' | 'blacklisted';
  };
  isLoading: boolean;
  error: string | null;
  pendingInvites: any[];
  invitesLoading: boolean;
  invitesError: string | null;
}

const initialState: PharmaciesState = {
  pharmacies: [],
  pagination: null,
  filters: {
    search: '',
    status: 'all',
  },
  isLoading: false,
  error: null,
  pendingInvites: [],
  invitesLoading: false,
  invitesError: null,
};

export interface FetchPharmaciesParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: 'all' | 'pending' | 'active' | 'suspended' | 'blacklisted';
}

// Async thunk for fetching pharmacies
export const fetchPharmacies = createAsyncThunk(
  'pharmacies/fetch',
  async (params: FetchPharmaciesParams = {}, { rejectWithValue }) => {
    try {
      const { apiClient } = await import('@/lib/api/apiClient');
      
      const queryParams: Record<string, string | number | undefined> = {};

      if (params.page !== undefined) {
        queryParams.page = params.page;
      }
      if (params.limit !== undefined) {
        queryParams.limit = params.limit;
      }
      if (params.search) {
        queryParams.search = params.search;
      }
      if (params.status && params.status !== 'all') {
        queryParams.status = params.status;
      }

      const data: PharmaciesResponse = await apiClient.get<PharmaciesResponse>(
        '/admin/pharmacies',
        true,
        queryParams
      );

      return data.data;
    } catch (error: any) {
      const errorMessage = error?.message || 'An error occurred while fetching pharmacies';
      return rejectWithValue(errorMessage);
    }
  }
);

// Async thunk for updating pharmacy
export const updatePharmacy = createAsyncThunk(
  'pharmacies/update',
  async (
    { id, payload }: { id: string; payload: PharmacyUpdatePayload },
    { rejectWithValue }
  ) => {
    try {
      const { apiClient } = await import('@/lib/api/apiClient');
      
      // Only send fields that are actually provided (not undefined)
      const updateData: Partial<PharmacyUpdatePayload> = {};
      Object.entries(payload).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          updateData[key as keyof PharmacyUpdatePayload] = value;
        }
      });

      const response = await apiClient.put<{ status: string; data: Pharmacy }>(
        `/admin/pharmacies/${id}`,
        updateData,
        true
      );

      return response.data;
    } catch (error: any) {
      const errorMessage = error?.message || 'An error occurred while updating pharmacy';
      return rejectWithValue(errorMessage);
    }
  }
);

// Async thunk for creating a pharmacy (admin-initiated)
export const createPharmacy = createAsyncThunk(
  'pharmacies/create',
  async (payload: Record<string, any>, { rejectWithValue }) => {
    try {
      const { apiClient } = await import('@/lib/api/apiClient');
      const response = await apiClient.post<{ status: string; data: any; message: string }>(
        '/admin/pharmacies',
        payload,
        true
      );
      return response;
    } catch (error: any) {
      return rejectWithValue(error?.message || 'Failed to create pharmacy');
    }
  }
);

// Async thunk for fetching pending invites
export const fetchPendingInvites = createAsyncThunk(
  'pharmacies/fetchPendingInvites',
  async (_, { rejectWithValue }) => {
    try {
      const { apiClient } = await import('@/lib/api/apiClient');
      const response = await apiClient.get<{ status: string; data: { invites: any[] } }>(
        '/admin/pharmacies/invites',
        true
      );
      return response.data.invites;
    } catch (error: any) {
      return rejectWithValue(error?.message || 'Failed to fetch pending invites');
    }
  }
);

// Async thunk for canceling an invite
export const cancelInvite = createAsyncThunk(
  'pharmacies/cancelInvite',
  async (inviteId: string, { rejectWithValue }) => {
    try {
      const { apiClient } = await import('@/lib/api/apiClient');
      const response = await apiClient.delete<{ status: string; message: string }>(
        `/admin/pharmacies/invites/${inviteId}`,
        true
      );
      return { inviteId, message: response.message };
    } catch (error: any) {
      return rejectWithValue(error?.message || 'Failed to cancel invite');
    }
  }
);

// Async thunk for updating pharmacy status
export const updatePharmacyStatus = createAsyncThunk(
  'pharmacies/updateStatus',
  async (
    { id, status }: { id: string; status: 'active' | 'suspended' | 'blacklisted' | 'pending' },
    { rejectWithValue }
  ) => {
    try {
      const { apiClient } = await import('@/lib/api/apiClient');
      
      const response = await apiClient.put<{ status: string; data: Pharmacy }>(
        `/admin/pharmacies/${id}/status`,
        { status },
        true
      );

      return { id, pharmacy: response.data };
    } catch (error: any) {
      const errorMessage = error?.message || 'An error occurred while updating pharmacy status';
      return rejectWithValue(errorMessage);
    }
  }
);

const pharmaciesSlice = createSlice({
  name: 'pharmacies',
  initialState,
  reducers: {
    setFilters: (state, action: PayloadAction<Partial<PharmaciesState['filters']>>) => {
      state.filters = { ...state.filters, ...action.payload };
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    // Fetch pharmacies
    builder
      .addCase(fetchPharmacies.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchPharmacies.fulfilled, (state, action) => {
        state.isLoading = false;
        state.pharmacies = action.payload.pharmacies;
        state.pagination = action.payload.pagination;
        state.filters = action.payload.filters;
        state.error = null;
      })
      .addCase(fetchPharmacies.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Update pharmacy
    builder
      .addCase(updatePharmacy.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(updatePharmacy.fulfilled, (state, action) => {
        state.isLoading = false;
        const index = state.pharmacies.findIndex(p => p.id === action.payload.id);
        if (index !== -1) {
          state.pharmacies[index] = action.payload;
        }
        state.error = null;
      })
      .addCase(updatePharmacy.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Update pharmacy status
    builder
      .addCase(updatePharmacyStatus.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(updatePharmacyStatus.fulfilled, (state, action) => {
        state.isLoading = false;
        const index = state.pharmacies.findIndex(p => p.id === action.payload.id);
        if (index !== -1) {
          state.pharmacies[index] = action.payload.pharmacy;
        }
        state.error = null;
      })
      .addCase(updatePharmacyStatus.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Fetch pending invites
    builder
      .addCase(fetchPendingInvites.pending, (state) => {
        state.invitesLoading = true;
        state.invitesError = null;
      })
      .addCase(fetchPendingInvites.fulfilled, (state, action) => {
        state.invitesLoading = false;
        state.pendingInvites = action.payload;
        state.invitesError = null;
      })
      .addCase(fetchPendingInvites.rejected, (state, action) => {
        state.invitesLoading = false;
        state.invitesError = action.payload as string;
      });

    // Cancel invite
    builder
      .addCase(cancelInvite.pending, (state) => {
        state.invitesLoading = true;
        state.invitesError = null;
      })
      .addCase(cancelInvite.fulfilled, (state, action) => {
        state.invitesLoading = false;
        state.pendingInvites = state.pendingInvites.filter(invite => invite.id !== action.payload.inviteId);
        state.invitesError = null;
      })
      .addCase(cancelInvite.rejected, (state, action) => {
        state.invitesLoading = false;
        state.invitesError = action.payload as string;
      });
  },
});

export const { setFilters, clearError } = pharmaciesSlice.actions;
export default pharmaciesSlice.reducer;
