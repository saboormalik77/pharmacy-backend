import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import {
  Processor,
  ProcessorsResponse,
  ProcessorCreatePayload,
  ProcessorUpdatePayload,
  AssignedStore,
} from '@/lib/types';

// ── State ─────────────────────────────────────────────────────

export interface ProcessorsState {
  processors: Processor[];
  selectedProcessorStores: AssignedStore[];
  pagination: {
    page: number;
    limit: number;
    totalCount: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  } | null;
  filters: {
    search: string;
    status: 'all' | 'active' | 'inactive';
  };
  isLoading: boolean;
  isStoresLoading: boolean;
  error: string | null;
}

const initialState: ProcessorsState = {
  processors: [],
  selectedProcessorStores: [],
  pagination: null,
  filters: { search: '', status: 'all' },
  isLoading: false,
  isStoresLoading: false,
  error: null,
};

// ── Thunks ────────────────────────────────────────────────────

export interface FetchProcessorsParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: 'all' | 'active' | 'inactive';
}

export const fetchProcessors = createAsyncThunk(
  'processors/fetch',
  async (params: FetchProcessorsParams = {}, { rejectWithValue }) => {
    try {
      const { apiClient } = await import('@/lib/api/apiClient');
      const { cookieUtils } = await import('@/lib/utils/cookies');
      const token = cookieUtils.getAuthToken();
      if (!token) return rejectWithValue('Authentication required. Please login again.');

      const query: Record<string, string | number | undefined> = {};
      if (params.page !== undefined) query.page = params.page;
      if (params.limit !== undefined) query.limit = params.limit;
      if (params.search) query.search = params.search;
      if (params.status && params.status !== 'all') query.status = params.status;

      const data: ProcessorsResponse = await apiClient.get<ProcessorsResponse>(
        '/admin/processors',
        true,
        query
      );
      return data.data;
    } catch (error: any) {
      return rejectWithValue(error?.message || 'Failed to fetch processors');
    }
  }
);

export const createProcessor = createAsyncThunk(
  'processors/create',
  async (payload: ProcessorCreatePayload, { rejectWithValue }) => {
    try {
      const { apiClient } = await import('@/lib/api/apiClient');
      const { cookieUtils } = await import('@/lib/utils/cookies');
      if (!cookieUtils.getAuthToken()) return rejectWithValue('Authentication required.');

      const response = await apiClient.post<{ status: string; data: { processor: Processor } }>(
        '/admin/processors',
        payload,
        true
      );
      return response.data.processor;
    } catch (error: any) {
      return rejectWithValue(error?.message || 'Failed to create processor');
    }
  }
);

export const updateProcessor = createAsyncThunk(
  'processors/update',
  async ({ id, payload }: { id: string; payload: ProcessorUpdatePayload }, { rejectWithValue }) => {
    try {
      const { apiClient } = await import('@/lib/api/apiClient');
      const { cookieUtils } = await import('@/lib/utils/cookies');
      if (!cookieUtils.getAuthToken()) return rejectWithValue('Authentication required.');

      const response = await apiClient.patch<{ status: string; data: { processor: Processor } }>(
        `/admin/processors/${id}`,
        payload,
        true
      );
      return response.data.processor;
    } catch (error: any) {
      return rejectWithValue(error?.message || 'Failed to update processor');
    }
  }
);

export const deactivateProcessor = createAsyncThunk(
  'processors/deactivate',
  async (id: string, { rejectWithValue }) => {
    try {
      const { apiClient } = await import('@/lib/api/apiClient');
      const { cookieUtils } = await import('@/lib/utils/cookies');
      if (!cookieUtils.getAuthToken()) return rejectWithValue('Authentication required.');

      await apiClient.delete<{ status: string }>(`/admin/processors/${id}`, true);
      return id;
    } catch (error: any) {
      return rejectWithValue(error?.message || 'Failed to deactivate processor');
    }
  }
);

export const fetchProcessorStores = createAsyncThunk(
  'processors/fetchStores',
  async (processorId: string, { rejectWithValue }) => {
    try {
      const { apiClient } = await import('@/lib/api/apiClient');
      const { cookieUtils } = await import('@/lib/utils/cookies');
      if (!cookieUtils.getAuthToken()) return rejectWithValue('Authentication required.');

      const response = await apiClient.get<{ status: string; data: { stores: AssignedStore[]; total: number } }>(
        `/admin/processors/${processorId}/stores`,
        true
      );
      return response.data.stores;
    } catch (error: any) {
      return rejectWithValue(error?.message || 'Failed to fetch processor stores');
    }
  }
);

export const assignStoresToProcessor = createAsyncThunk(
  'processors/assignStores',
  async ({ processorId, pharmacyIds }: { processorId: string; pharmacyIds: string[] }, { rejectWithValue }) => {
    try {
      const { apiClient } = await import('@/lib/api/apiClient');
      const { cookieUtils } = await import('@/lib/utils/cookies');
      if (!cookieUtils.getAuthToken()) return rejectWithValue('Authentication required.');

      await apiClient.post<{ status: string }>(
        `/admin/processors/${processorId}/assign-stores`,
        { pharmacyIds },
        true
      );
      return processorId;
    } catch (error: any) {
      return rejectWithValue(error?.message || 'Failed to assign stores');
    }
  }
);

export const unassignStoreFromProcessor = createAsyncThunk(
  'processors/unassignStore',
  async ({ processorId, pharmacyId }: { processorId: string; pharmacyId: string }, { rejectWithValue }) => {
    try {
      const { apiClient } = await import('@/lib/api/apiClient');
      const { cookieUtils } = await import('@/lib/utils/cookies');
      if (!cookieUtils.getAuthToken()) return rejectWithValue('Authentication required.');

      await apiClient.delete<{ status: string }>(
        `/admin/processors/${processorId}/stores/${pharmacyId}`,
        true
      );
      return pharmacyId;
    } catch (error: any) {
      return rejectWithValue(error?.message || 'Failed to unassign store');
    }
  }
);

// ── Slice ─────────────────────────────────────────────────────

const processorsSlice = createSlice({
  name: 'processors',
  initialState,
  reducers: {
    setFilters: (state, action: PayloadAction<Partial<ProcessorsState['filters']>>) => {
      state.filters = { ...state.filters, ...action.payload };
    },
    clearError: (state) => {
      state.error = null;
    },
    clearSelectedStores: (state) => {
      state.selectedProcessorStores = [];
    },
  },
  extraReducers: (builder) => {
    builder
      // fetchProcessors
      .addCase(fetchProcessors.pending, (state) => { state.isLoading = true; state.error = null; })
      .addCase(fetchProcessors.fulfilled, (state, action) => {
        state.isLoading = false;
        state.processors = action.payload.processors || [];
        const p = action.payload.pagination;
        state.pagination = p
          ? { page: p.page, limit: p.limit, totalCount: p.total, totalPages: p.totalPages, hasNextPage: p.page < p.totalPages, hasPreviousPage: p.page > 1 }
          : null;
        state.error = null;
      })
      .addCase(fetchProcessors.rejected, (state, action) => { state.isLoading = false; state.error = action.payload as string; })

      // createProcessor
      .addCase(createProcessor.pending, (state) => { state.isLoading = true; state.error = null; })
      .addCase(createProcessor.fulfilled, (state, action) => {
        state.isLoading = false;
        if (action.payload) state.processors = [action.payload, ...state.processors];
        state.error = null;
      })
      .addCase(createProcessor.rejected, (state, action) => { state.isLoading = false; state.error = action.payload as string; })

      // updateProcessor
      .addCase(updateProcessor.pending, (state) => { state.isLoading = true; state.error = null; })
      .addCase(updateProcessor.fulfilled, (state, action) => {
        state.isLoading = false;
        if (action.payload) {
          state.processors = state.processors.map(p => p.id === action.payload.id ? action.payload : p);
        }
        state.error = null;
      })
      .addCase(updateProcessor.rejected, (state, action) => { state.isLoading = false; state.error = action.payload as string; })

      // deactivateProcessor
      .addCase(deactivateProcessor.pending, (state) => { state.isLoading = true; state.error = null; })
      .addCase(deactivateProcessor.fulfilled, (state, action) => {
        state.isLoading = false;
        state.processors = state.processors.map(p =>
          p.id === action.payload ? { ...p, status: 'inactive' as const } : p
        );
        state.error = null;
      })
      .addCase(deactivateProcessor.rejected, (state, action) => { state.isLoading = false; state.error = action.payload as string; })

      // fetchProcessorStores
      .addCase(fetchProcessorStores.pending, (state) => { state.isStoresLoading = true; })
      .addCase(fetchProcessorStores.fulfilled, (state, action) => {
        state.isStoresLoading = false;
        state.selectedProcessorStores = action.payload || [];
      })
      .addCase(fetchProcessorStores.rejected, (state) => { state.isStoresLoading = false; })

      // unassignStore
      .addCase(unassignStoreFromProcessor.fulfilled, (state, action) => {
        state.selectedProcessorStores = state.selectedProcessorStores.filter(
          s => s.pharmacyId !== action.payload
        );
      });
  },
});

export const { setFilters, clearError, clearSelectedStores } = processorsSlice.actions;
export default processorsSlice.reducer;
