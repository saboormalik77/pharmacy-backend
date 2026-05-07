import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import {
    NDCPricingRecord,
    NDCPricingUpsertPayload,
    NDCPricingSearchResponse,
    Pagination,
} from '@/lib/types';

// ── State ─────────────────────────────────────────────────────

export interface NDCPricingState {
    items: NDCPricingRecord[];
    current: NDCPricingRecord | null;
    pagination: Pagination | null;
    filters: { search: string };
    isLoading: boolean;
    isActionLoading: boolean;
    error: string | null;
}

const initialState: NDCPricingState = {
    items: [],
    current: null,
    pagination: null,
    filters: { search: '' },
    isLoading: false,
    isActionLoading: false,
    error: null,
};

// ── Thunks ────────────────────────────────────────────────────

export interface FetchNDCPricingParams {
    search?: string;
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
}

export const fetchNDCPricing = createAsyncThunk(
    'ndcPricing/fetch',
    async (params: FetchNDCPricingParams = {}, { rejectWithValue }) => {
        try {
            const { apiClient } = await import('@/lib/api/apiClient');
            const query: Record<string, string | number | undefined> = {};
            if (params.search) query.search = params.search;
            if (params.page !== undefined) query.page = params.page;
            if (params.limit !== undefined) query.limit = params.limit;
            if (params.sortBy) query.sortBy = params.sortBy;
            if (params.sortOrder) query.sortOrder = params.sortOrder;

            const response = await apiClient.get<{
                status: string;
                data: NDCPricingSearchResponse;
            }>('/admin/ndc-pricing/search', true, query);
            return response.data;
        } catch (error: any) {
            return rejectWithValue(error?.message || 'Failed to fetch NDC pricing');
        }
    }
);

export const fetchNDCPricingByNdc = createAsyncThunk(
    'ndcPricing/fetchByNdc',
    async (ndc: string, { rejectWithValue }) => {
        try {
            const { apiClient } = await import('@/lib/api/apiClient');
            const response = await apiClient.get<{
                status: string;
                data: NDCPricingRecord;
            }>(`/admin/ndc-pricing/${encodeURIComponent(ndc)}`, true);
            return response.data;
        } catch (error: any) {
            return rejectWithValue(error?.message || 'Failed to fetch NDC pricing');
        }
    }
);

export const upsertNDCPricing = createAsyncThunk(
    'ndcPricing/upsert',
    async (payload: NDCPricingUpsertPayload, { rejectWithValue }) => {
        try {
            const { apiClient } = await import('@/lib/api/apiClient');
            const response = await apiClient.post<{
                status: string;
                data: NDCPricingRecord;
            }>('/admin/ndc-pricing', payload, true);
            return response.data;
        } catch (error: any) {
            return rejectWithValue(error?.message || 'Failed to save NDC pricing');
        }
    }
);

export const deleteNDCPricing = createAsyncThunk(
    'ndcPricing/delete',
    async (id: string, { rejectWithValue }) => {
        try {
            const { apiClient } = await import('@/lib/api/apiClient');
            await apiClient.delete<{ status: string }>(`/admin/ndc-pricing/${id}`, true);
            return id;
        } catch (error: any) {
            return rejectWithValue(error?.message || 'Failed to delete NDC pricing');
        }
    }
);

export const importFromReports = createAsyncThunk(
    'ndcPricing/import',
    async (_, { rejectWithValue }) => {
        try {
            const { apiClient } = await import('@/lib/api/apiClient');
            const response = await apiClient.post<{
                status: string;
                data: { imported: number };
            }>('/admin/ndc-pricing/import', {}, true);
            return response.data;
        } catch (error: any) {
            return rejectWithValue(error?.message || 'Failed to import pricing');
        }
    }
);

// ── Slice ─────────────────────────────────────────────────────

const ndcPricingSlice = createSlice({
    name: 'ndcPricing',
    initialState,
    reducers: {
        setFilters: (state, action: PayloadAction<Partial<NDCPricingState['filters']>>) => {
            state.filters = { ...state.filters, ...action.payload };
        },
        clearError: (state) => { state.error = null; },
        clearCurrent: (state) => { state.current = null; },
    },
    extraReducers: (builder) => {
        builder
            .addCase(fetchNDCPricing.pending, (state) => { state.isLoading = true; state.error = null; })
            .addCase(fetchNDCPricing.fulfilled, (state, action) => {
                state.isLoading = false;
                state.items = action.payload.items || [];
                state.pagination = action.payload.pagination || null;
            })
            .addCase(fetchNDCPricing.rejected, (state, action) => { state.isLoading = false; state.error = action.payload as string; })

            .addCase(fetchNDCPricingByNdc.pending, (state) => { state.isLoading = true; state.error = null; })
            .addCase(fetchNDCPricingByNdc.fulfilled, (state, action) => {
                state.isLoading = false;
                state.current = action.payload;
            })
            .addCase(fetchNDCPricingByNdc.rejected, (state, action) => { state.isLoading = false; state.error = action.payload as string; })

            .addCase(upsertNDCPricing.pending, (state) => { state.isActionLoading = true; state.error = null; })
            .addCase(upsertNDCPricing.fulfilled, (state, action) => {
                state.isActionLoading = false;
                if (action.payload) {
                    const idx = state.items.findIndex(i => i.id === action.payload.id);
                    if (idx >= 0) {
                        state.items[idx] = action.payload;
                    } else {
                        state.items = [action.payload, ...state.items];
                    }
                    state.current = action.payload;
                }
            })
            .addCase(upsertNDCPricing.rejected, (state, action) => { state.isActionLoading = false; state.error = action.payload as string; })

            .addCase(deleteNDCPricing.pending, (state) => { state.isActionLoading = true; })
            .addCase(deleteNDCPricing.fulfilled, (state, action) => {
                state.isActionLoading = false;
                state.items = state.items.filter(i => i.id !== action.payload);
                if (state.current?.id === action.payload) state.current = null;
            })
            .addCase(deleteNDCPricing.rejected, (state, action) => { state.isActionLoading = false; state.error = action.payload as string; })

            .addCase(importFromReports.pending, (state) => { state.isActionLoading = true; state.error = null; })
            .addCase(importFromReports.fulfilled, (state) => { state.isActionLoading = false; })
            .addCase(importFromReports.rejected, (state, action) => { state.isActionLoading = false; state.error = action.payload as string; });
    },
});

export const { setFilters, clearError, clearCurrent } = ndcPricingSlice.actions;
export default ndcPricingSlice.reducer;
