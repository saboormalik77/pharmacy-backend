import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { 
  DistributorsResponse, 
  Distributor, 
  DistributorUpdatePayload, 
  DistributorStatusUpdatePayload,
  DistributorCreatePayload,
  DistributorsStats
} from '@/lib/types';

export interface DistributorsState {
  distributors: Distributor[];
  stats: DistributorsStats | null;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  } | null;
  filters: {
    search: string;
    status: 'all' | 'active' | 'inactive';
  };
  isLoading: boolean;
  error: string | null;
}

const initialState: DistributorsState = {
  distributors: [],
  stats: null,
  pagination: null,
  filters: {
    search: '',
    status: 'all',
  },
  isLoading: false,
  error: null,
};

export interface FetchDistributorsParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: 'all' | 'active' | 'inactive';
}

// Async thunk for fetching distributors (includes stats in response)
export const fetchDistributors = createAsyncThunk(
  'distributors/fetch',
  async (params: FetchDistributorsParams = {}, { rejectWithValue }) => {
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

      const data: DistributorsResponse = await apiClient.get<DistributorsResponse>(
        '/admin/distributors',
        true,
        queryParams
      );

      return data.data;
    } catch (error: any) {
      const errorMessage = error?.message || 'An error occurred while fetching distributors';
      return rejectWithValue(errorMessage);
    }
  }
);

// Async thunk for creating distributor
export const createDistributor = createAsyncThunk(
  'distributors/create',
  async (payload: DistributorCreatePayload, { rejectWithValue }) => {
    try {
      const { apiClient } = await import('@/lib/api/apiClient');
      
      const response = await apiClient.post<{ status: string; data: Distributor }>(
        '/admin/distributors',
        payload,
        true
      );

      return response.data;
    } catch (error: any) {
      const errorMessage = error?.message || 'An error occurred while creating distributor';
      return rejectWithValue(errorMessage);
    }
  }
);

// Async thunk for updating distributor
export const updateDistributor = createAsyncThunk(
  'distributors/update',
  async (
    { id, payload }: { id: string; payload: DistributorUpdatePayload },
    { rejectWithValue }
  ) => {
    try {
      const { apiClient } = await import('@/lib/api/apiClient');
      
      // Only send fields that are actually provided (not undefined)
      const updateData: Partial<DistributorUpdatePayload> = {};
      Object.entries(payload).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          updateData[key as keyof DistributorUpdatePayload] = value;
        }
      });

      const response = await apiClient.put<{ status: string; data: Distributor }>(
        `/admin/distributors/${id}`,
        updateData,
        true
      );

      return response.data;
    } catch (error: any) {
      const errorMessage = error?.message || 'An error occurred while updating distributor';
      return rejectWithValue(errorMessage);
    }
  }
);

// Async thunk for updating distributor status
export const updateDistributorStatus = createAsyncThunk(
  'distributors/updateStatus',
  async (
    { id, status }: { id: string; status: 'active' | 'inactive' },
    { rejectWithValue }
  ) => {
    try {
      const { apiClient } = await import('@/lib/api/apiClient');
      
      const response = await apiClient.put<{ status: string; data: Distributor }>(
        `/admin/distributors/${id}/status`,
        { status },
        true
      );

      return { id, distributor: response.data };
    } catch (error: any) {
      const errorMessage = error?.message || 'An error occurred while updating distributor status';
      return rejectWithValue(errorMessage);
    }
  }
);

const distributorsSlice = createSlice({
  name: 'distributors',
  initialState,
  reducers: {
    setFilters: (state, action: PayloadAction<Partial<DistributorsState['filters']>>) => {
      state.filters = { ...state.filters, ...action.payload };
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    // Fetch distributors (includes stats in response)
    builder
      .addCase(fetchDistributors.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchDistributors.fulfilled, (state, action) => {
        state.isLoading = false;
        state.distributors = action.payload.distributors;
        state.stats = action.payload.stats;
        state.pagination = action.payload.pagination;
        state.filters = action.payload.filters;
        state.error = null;
      })
      .addCase(fetchDistributors.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Create distributor
    builder
      .addCase(createDistributor.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(createDistributor.fulfilled, (state, action) => {
        state.isLoading = false;
        state.distributors.unshift(action.payload);
        // Update stats if available
        if (state.stats) {
          state.stats.totalDistributors += 1;
          if (action.payload.status === 'active') {
            state.stats.activeDistributors += 1;
          } else {
            state.stats.inactiveDistributors += 1;
          }
        }
        state.error = null;
      })
      .addCase(createDistributor.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Update distributor
    builder
      .addCase(updateDistributor.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(updateDistributor.fulfilled, (state, action) => {
        state.isLoading = false;
        const index = state.distributors.findIndex(d => d.id === action.payload.id);
        if (index !== -1) {
          state.distributors[index] = action.payload;
        }
        state.error = null;
      })
      .addCase(updateDistributor.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Update distributor status
    builder
      .addCase(updateDistributorStatus.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(updateDistributorStatus.fulfilled, (state, action) => {
        state.isLoading = false;
        const index = state.distributors.findIndex(d => d.id === action.payload.id);
        if (index !== -1) {
          const oldStatus = state.distributors[index].status;
          state.distributors[index] = action.payload.distributor;
          // Update stats if available
          if (state.stats) {
            if (oldStatus === 'active' && action.payload.distributor.status === 'inactive') {
              state.stats.activeDistributors -= 1;
              state.stats.inactiveDistributors += 1;
            } else if (oldStatus === 'inactive' && action.payload.distributor.status === 'active') {
              state.stats.activeDistributors += 1;
              state.stats.inactiveDistributors -= 1;
            }
          }
        }
        state.error = null;
      })
      .addCase(updateDistributorStatus.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });
  },
});

export const { setFilters, clearError } = distributorsSlice.actions;
export default distributorsSlice.reducer;
