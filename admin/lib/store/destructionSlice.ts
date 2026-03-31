import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { DestructionRecord, DestructionStats } from '@/lib/types';

interface DestructionState {
  records: DestructionRecord[];
  stats: DestructionStats | null;
  pagination: { total: number; page: number; limit: number } | null;
  isLoading: boolean;
  isActionLoading: boolean;
  error: string | null;
}

const initialState: DestructionState = {
  records: [],
  stats: null,
  pagination: null,
  isLoading: false,
  isActionLoading: false,
  error: null,
};

export const fetchDestructionRecords = createAsyncThunk<
  { data: DestructionRecord[]; pagination: { total: number; page: number; limit: number } },
  { status?: string; search?: string; pharmacyId?: string; page?: number; limit?: number } | void,
  { rejectValue: string }
>('destruction/fetchRecords', async (params, { rejectWithValue }) => {
  try {
    const { apiClient } = await import('@/lib/api/apiClient');
    const q: Record<string, string> = {};
    if (params?.status) q.status = params.status;
    if (params?.search) q.search = params.search;
    if (params?.pharmacyId) q.pharmacy_id = params.pharmacyId;
    if (params?.page) q.page = String(params.page);
    if (params?.limit) q.limit = String(params.limit);

    const res = await apiClient.get<{
      status: string;
      data: DestructionRecord[];
      meta: { total: number; page: number; limit: number };
    }>('/admin/destruction', true, q);
    return { data: res.data, pagination: res.meta };
  } catch (err: any) {
    return rejectWithValue(err?.message || 'Failed to fetch destruction records');
  }
});

export const fetchDestructionStats = createAsyncThunk<
  DestructionStats,
  { pharmacyId?: string } | void,
  { rejectValue: string }
>('destruction/fetchStats', async (params, { rejectWithValue }) => {
  try {
    const { apiClient } = await import('@/lib/api/apiClient');
    const q: Record<string, string> = {};
    if (params?.pharmacyId) q.pharmacy_id = params.pharmacyId;

    const res = await apiClient.get<{ status: string; data: DestructionStats }>(
      '/admin/destruction/stats',
      true,
      q
    );
    return res.data;
  } catch (err: any) {
    return rejectWithValue(err?.message || 'Failed to fetch destruction stats');
  }
});

export const updateDestructionRecord = createAsyncThunk<
  DestructionRecord,
  {
    id: string;
    payload: {
      status?: 'pending' | 'scheduled' | 'picked_up' | 'destroyed' | 'cancelled';
      federalFormNumber?: string;
      destructionCompany?: string;
      scheduledDate?: string;
      pickedUpAt?: string;
      destroyedAt?: string;
      formUrl?: string;
      weightLbs?: number;
      notes?: string;
    };
  },
  { rejectValue: string }
>('destruction/updateRecord', async ({ id, payload }, { rejectWithValue }) => {
  try {
    const { apiClient } = await import('@/lib/api/apiClient');
    const res = await apiClient.patch<{ status: string; data: DestructionRecord }>(
      `/admin/destruction/${id}`,
      payload,
      true
    );
    return res.data;
  } catch (err: any) {
    return rejectWithValue(err?.message || 'Failed to update destruction record');
  }
});

const destructionSlice = createSlice({
  name: 'destruction',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchDestructionRecords.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchDestructionRecords.fulfilled, (state, action) => {
        state.isLoading = false;
        state.records = action.payload.data;
        state.pagination = action.payload.pagination;
      })
      .addCase(fetchDestructionRecords.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      .addCase(fetchDestructionStats.fulfilled, (state, action) => {
        state.stats = action.payload;
      })
      .addCase(updateDestructionRecord.pending, (state) => {
        state.isActionLoading = true;
        state.error = null;
      })
      .addCase(updateDestructionRecord.fulfilled, (state, action) => {
        state.isActionLoading = false;
        state.records = state.records.map((r) => (r.id === action.payload.id ? action.payload : r));
      })
      .addCase(updateDestructionRecord.rejected, (state, action) => {
        state.isActionLoading = false;
        state.error = action.payload as string;
      });
  },
});

export const { clearError } = destructionSlice.actions;
export default destructionSlice.reducer;
