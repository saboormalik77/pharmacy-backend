import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import {
    WineCellarItem,
    WineCellarStats,
    WineCellarListResponse,
    WineCellarSurfaceResult,
} from '@/lib/types';

// ── State ─────────────────────────────────────────────────────

export interface WineCellarState {
    items: WineCellarItem[];
    stats: WineCellarStats | null;
    summary: WineCellarListResponse['summary'] | null;
    pagination: WineCellarListResponse['pagination'] | null;
    isLoading: boolean;
    isStatsLoading: boolean;
    isActionLoading: boolean;
    error: string | null;
}

const initialState: WineCellarState = {
    items: [],
    stats: null,
    summary: null,
    pagination: null,
    isLoading: false,
    isStatsLoading: false,
    isActionLoading: false,
    error: null,
};

// ── Thunks ────────────────────────────────────────────────────

export interface FetchWineCellarParams {
    pharmacyId?: string;
    status?: string;
    search?: string;
    expectedMonth?: string;
    page?: number;
    limit?: number;
}

export const fetchWineCellarItems = createAsyncThunk<
    WineCellarListResponse,
    FetchWineCellarParams | void,
    { rejectValue: string }
>('wineCellar/fetchItems', async (params, { rejectWithValue }) => {
    try {
        const { apiClient } = await import('@/lib/api/apiClient');
        const query: Record<string, string> = {};
        if (params) {
            if (params.pharmacyId) query.pharmacy_id = params.pharmacyId;
            if (params.status) query.status = params.status;
            if (params.search) query.search = params.search;
            if (params.expectedMonth) query.expected_month = params.expectedMonth;
            if (params.page) query.page = String(params.page);
            if (params.limit) query.limit = String(params.limit);
        }
        const res = await apiClient.get<{ status: string; data: WineCellarListResponse }>(
            '/admin/wine-cellar', true, query
        );
        return res.data;
    } catch (err: any) {
        return rejectWithValue(err?.message || 'Failed to fetch wine cellar items');
    }
});

export const fetchWineCellarStats = createAsyncThunk<
    WineCellarStats,
    string | void,
    { rejectValue: string }
>('wineCellar/fetchStats', async (pharmacyId, { rejectWithValue }) => {
    try {
        const { apiClient } = await import('@/lib/api/apiClient');
        const query: Record<string, string> = {};
        if (pharmacyId) query.pharmacy_id = pharmacyId;
        const res = await apiClient.get<{ status: string; data: WineCellarStats }>(
            '/admin/wine-cellar/stats', true, query
        );
        return res.data;
    } catch (err: any) {
        return rejectWithValue(err?.message || 'Failed to fetch wine cellar stats');
    }
});

export const updateWineCellarItem = createAsyncThunk<
    WineCellarItem,
    { id: string; payload: Record<string, any> },
    { rejectValue: string }
>('wineCellar/updateItem', async ({ id, payload }, { rejectWithValue }) => {
    try {
        const { apiClient } = await import('@/lib/api/apiClient');
        const res = await apiClient.patch<{ status: string; data: WineCellarItem }>(
            `/admin/wine-cellar/${encodeURIComponent(id)}`, payload, true
        );
        return res.data;
    } catch (err: any) {
        return rejectWithValue(err?.message || 'Failed to update wine cellar item');
    }
});

export const markWineCellarReturned = createAsyncThunk<
    WineCellarItem,
    { id: string; transactionId: string },
    { rejectValue: string }
>('wineCellar/markReturned', async ({ id, transactionId }, { rejectWithValue }) => {
    try {
        const { apiClient } = await import('@/lib/api/apiClient');
        const res = await apiClient.post<{ status: string; data: WineCellarItem }>(
            `/admin/wine-cellar/${encodeURIComponent(id)}/return`, { transactionId }, true
        );
        return res.data;
    } catch (err: any) {
        return rejectWithValue(err?.message || 'Failed to mark item as returned');
    }
});

export const checkAndSurfaceReady = createAsyncThunk<
    WineCellarSurfaceResult,
    void,
    { rejectValue: string }
>('wineCellar/checkReady', async (_, { rejectWithValue }) => {
    try {
        const { apiClient } = await import('@/lib/api/apiClient');
        const res = await apiClient.post<{ status: string; data: WineCellarSurfaceResult }>(
            '/admin/wine-cellar/check-ready', {}, true
        );
        return res.data;
    } catch (err: any) {
        return rejectWithValue(err?.message || 'Failed to check ready items');
    }
});

// ── Slice ─────────────────────────────────────────────────────

const wineCellarSlice = createSlice({
    name: 'wineCellar',
    initialState,
    reducers: {},
    extraReducers: (builder) => {
        // fetchWineCellarItems
        builder
            .addCase(fetchWineCellarItems.pending, (state) => {
                state.isLoading = true;
                state.error = null;
            })
            .addCase(fetchWineCellarItems.fulfilled, (state, action) => {
                state.isLoading = false;
                state.items = action.payload.items;
                state.summary = action.payload.summary;
                state.pagination = action.payload.pagination;
            })
            .addCase(fetchWineCellarItems.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.payload || 'Failed to fetch wine cellar items';
            });

        // fetchWineCellarStats
        builder
            .addCase(fetchWineCellarStats.pending, (state) => {
                state.isStatsLoading = true;
            })
            .addCase(fetchWineCellarStats.fulfilled, (state, action) => {
                state.isStatsLoading = false;
                state.stats = action.payload;
            })
            .addCase(fetchWineCellarStats.rejected, (state) => {
                state.isStatsLoading = false;
            });

        // updateWineCellarItem
        builder
            .addCase(updateWineCellarItem.pending, (state) => {
                state.isActionLoading = true;
            })
            .addCase(updateWineCellarItem.fulfilled, (state, action) => {
                state.isActionLoading = false;
                const idx = state.items.findIndex((i) => i.id === action.payload.id);
                if (idx !== -1) state.items[idx] = action.payload;
            })
            .addCase(updateWineCellarItem.rejected, (state) => {
                state.isActionLoading = false;
            });

        // markWineCellarReturned
        builder
            .addCase(markWineCellarReturned.pending, (state) => {
                state.isActionLoading = true;
            })
            .addCase(markWineCellarReturned.fulfilled, (state, action) => {
                state.isActionLoading = false;
                const idx = state.items.findIndex((i) => i.id === action.payload.id);
                if (idx !== -1) state.items[idx] = action.payload;
            })
            .addCase(markWineCellarReturned.rejected, (state) => {
                state.isActionLoading = false;
            });

        // checkAndSurfaceReady
        builder
            .addCase(checkAndSurfaceReady.pending, (state) => {
                state.isActionLoading = true;
            })
            .addCase(checkAndSurfaceReady.fulfilled, (state) => {
                state.isActionLoading = false;
            })
            .addCase(checkAndSurfaceReady.rejected, (state) => {
                state.isActionLoading = false;
            });
    },
});

export default wineCellarSlice.reducer;
