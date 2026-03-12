import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import {
    ReturnTransaction,
    ReturnTransactionItem,
    WarehouseDiscrepancy,
    VerificationSummary,
} from '@/lib/types';

// ── State ─────────────────────────────────────────────────────

export interface WarehouseState {
    pendingReturns: ReturnTransaction[];
    receivedReturns: ReturnTransaction[];
    pendingPagination: { page: number; limit: number; total: number; totalPages: number } | null;
    receivedPagination: { page: number; limit: number; total: number; totalPages: number } | null;
    currentReturn: ReturnTransaction | null;
    currentItems: ReturnTransactionItem[];
    discrepancies: WarehouseDiscrepancy[];
    verificationSummary: VerificationSummary | null;
    isLoading: boolean;
    isActionLoading: boolean;
    error: string | null;
}

const initialState: WarehouseState = {
    pendingReturns: [],
    receivedReturns: [],
    pendingPagination: null,
    receivedPagination: null,
    currentReturn: null,
    currentItems: [],
    discrepancies: [],
    verificationSummary: null,
    isLoading: false,
    isActionLoading: false,
    error: null,
};

// ── Thunks ────────────────────────────────────────────────────

export const receiveReturn = createAsyncThunk<
    ReturnTransaction,
    string,
    { rejectValue: string }
>('warehouse/receiveReturn', async (fedexTracking, { rejectWithValue }) => {
    try {
        const { apiClient } = await import('@/lib/api/apiClient');
        const res = await apiClient.post<{ status: string; data: ReturnTransaction; message: string }>(
            '/admin/warehouse/receive', { fedexTracking }, true
        );
        return res.data;
    } catch (err: any) {
        return rejectWithValue(err?.message || 'Failed to receive return');
    }
});

export const fetchPendingReturns = createAsyncThunk<
    { data: ReturnTransaction[]; pagination: any },
    { search?: string; page?: number; limit?: number } | void,
    { rejectValue: string }
>('warehouse/fetchPending', async (params, { rejectWithValue }) => {
    try {
        const { apiClient } = await import('@/lib/api/apiClient');
        const query: Record<string, string> = {};
        if (params) {
            if (params.search) query.search = params.search;
            if (params.page) query.page = String(params.page);
            if (params.limit) query.limit = String(params.limit);
        }
        const res = await apiClient.get<{ status: string; data: ReturnTransaction[]; pagination: any }>(
            '/admin/warehouse/pending', true, query
        );
        return { data: res.data, pagination: res.pagination };
    } catch (err: any) {
        return rejectWithValue(err?.message || 'Failed to fetch pending returns');
    }
});

export const fetchReceivedReturns = createAsyncThunk<
    { data: ReturnTransaction[]; pagination: any },
    { search?: string; page?: number; limit?: number } | void,
    { rejectValue: string }
>('warehouse/fetchReceived', async (params, { rejectWithValue }) => {
    try {
        const { apiClient } = await import('@/lib/api/apiClient');
        const query: Record<string, string> = {};
        if (params) {
            if (params.search) query.search = params.search;
            if (params.page) query.page = String(params.page);
            if (params.limit) query.limit = String(params.limit);
        }
        const res = await apiClient.get<{ status: string; data: ReturnTransaction[]; pagination: any }>(
            '/admin/warehouse/received', true, query
        );
        return { data: res.data, pagination: res.pagination };
    } catch (err: any) {
        return rejectWithValue(err?.message || 'Failed to fetch received returns');
    }
});

export const verifyReturn = createAsyncThunk<
    { transaction: ReturnTransaction; verification: VerificationSummary },
    { id: string; piecesReceived?: number; verifiedIntegrity?: boolean; notes?: string },
    { rejectValue: string }
>('warehouse/verifyReturn', async ({ id, ...payload }, { rejectWithValue }) => {
    try {
        const { apiClient } = await import('@/lib/api/apiClient');
        const res = await apiClient.post<{
            status: string;
            data: ReturnTransaction;
            verification: VerificationSummary;
        }>(`/admin/warehouse/${id}/verify`, payload, true);
        return { transaction: res.data, verification: res.verification };
    } catch (err: any) {
        return rejectWithValue(err?.message || 'Failed to verify return');
    }
});

export const verifyItem = createAsyncThunk<
    ReturnTransactionItem,
    { transactionId: string; itemId: string; verified?: boolean; actualQuantity?: number; conditionNotes?: string },
    { rejectValue: string }
>('warehouse/verifyItem', async ({ transactionId, itemId, ...payload }, { rejectWithValue }) => {
    try {
        const { apiClient } = await import('@/lib/api/apiClient');
        const res = await apiClient.patch<{ status: string; data: ReturnTransactionItem }>(
            `/admin/warehouse/${transactionId}/items/${itemId}/verify`, payload, true
        );
        return res.data;
    } catch (err: any) {
        return rejectWithValue(err?.message || 'Failed to verify item');
    }
});

export const reportDiscrepancy = createAsyncThunk<
    WarehouseDiscrepancy,
    { transactionId: string; type: string; itemId?: string; ndc?: string; productName?: string; expectedQuantity?: number; actualQuantity?: number; notes?: string },
    { rejectValue: string }
>('warehouse/reportDiscrepancy', async ({ transactionId, ...payload }, { rejectWithValue }) => {
    try {
        const { apiClient } = await import('@/lib/api/apiClient');
        const res = await apiClient.post<{ status: string; data: WarehouseDiscrepancy }>(
            `/admin/warehouse/${transactionId}/discrepancy`, payload, true
        );
        return res.data;
    } catch (err: any) {
        return rejectWithValue(err?.message || 'Failed to report discrepancy');
    }
});

export const fetchDiscrepancies = createAsyncThunk<
    { data: WarehouseDiscrepancy[]; total: number },
    { transactionId: string; status?: string },
    { rejectValue: string }
>('warehouse/fetchDiscrepancies', async ({ transactionId, status }, { rejectWithValue }) => {
    try {
        const { apiClient } = await import('@/lib/api/apiClient');
        const query: Record<string, string> = {};
        if (status) query.status = status;
        const res = await apiClient.get<{ status: string; data: WarehouseDiscrepancy[]; total: number }>(
            `/admin/warehouse/${transactionId}/discrepancies`, true, query
        );
        return { data: res.data, total: res.total };
    } catch (err: any) {
        return rejectWithValue(err?.message || 'Failed to fetch discrepancies');
    }
});

export const fetchTransactionForVerification = createAsyncThunk<
    { transaction: ReturnTransaction; items: ReturnTransactionItem[] },
    string,
    { rejectValue: string }
>('warehouse/fetchForVerification', async (transactionId, { rejectWithValue }) => {
    try {
        const { apiClient } = await import('@/lib/api/apiClient');
        const [txnRes, itemsRes] = await Promise.all([
            apiClient.get<{ status: string; data: { data: ReturnTransaction } }>(
                `/return-transactions/${transactionId}`, true
            ),
            apiClient.get<{ status: string; data: { items: ReturnTransactionItem[]; summary: any } }>(
                `/return-transactions/${transactionId}/items`, true
            ),
        ]);
        return {
            transaction: txnRes.data.data || txnRes.data as any,
            items: itemsRes.data.items || [],
        };
    } catch (err: any) {
        return rejectWithValue(err?.message || 'Failed to fetch transaction for verification');
    }
});

// ── Slice ─────────────────────────────────────────────────────

const warehouseSlice = createSlice({
    name: 'warehouse',
    initialState,
    reducers: {
        clearError: (state) => { state.error = null; },
        clearCurrentReturn: (state) => {
            state.currentReturn = null;
            state.currentItems = [];
            state.discrepancies = [];
            state.verificationSummary = null;
        },
    },
    extraReducers: (builder) => {
        builder
            // receiveReturn
            .addCase(receiveReturn.pending, (state) => { state.isActionLoading = true; state.error = null; })
            .addCase(receiveReturn.fulfilled, (state, action) => { state.isActionLoading = false; state.currentReturn = action.payload; })
            .addCase(receiveReturn.rejected, (state, action) => { state.isActionLoading = false; state.error = action.payload as string; })

            // fetchPendingReturns
            .addCase(fetchPendingReturns.pending, (state) => { state.isLoading = true; state.error = null; })
            .addCase(fetchPendingReturns.fulfilled, (state, action) => {
                state.isLoading = false;
                state.pendingReturns = action.payload.data;
                state.pendingPagination = action.payload.pagination;
            })
            .addCase(fetchPendingReturns.rejected, (state, action) => { state.isLoading = false; state.error = action.payload as string; })

            // fetchReceivedReturns
            .addCase(fetchReceivedReturns.pending, (state) => { state.isLoading = true; state.error = null; })
            .addCase(fetchReceivedReturns.fulfilled, (state, action) => {
                state.isLoading = false;
                state.receivedReturns = action.payload.data;
                state.receivedPagination = action.payload.pagination;
            })
            .addCase(fetchReceivedReturns.rejected, (state, action) => { state.isLoading = false; state.error = action.payload as string; })

            // verifyReturn
            .addCase(verifyReturn.pending, (state) => { state.isActionLoading = true; state.error = null; })
            .addCase(verifyReturn.fulfilled, (state, action) => {
                state.isActionLoading = false;
                state.currentReturn = action.payload.transaction;
                state.verificationSummary = action.payload.verification;
            })
            .addCase(verifyReturn.rejected, (state, action) => { state.isActionLoading = false; state.error = action.payload as string; })

            // verifyItem
            .addCase(verifyItem.pending, (state) => { state.isActionLoading = true; state.error = null; })
            .addCase(verifyItem.fulfilled, (state, action) => {
                state.isActionLoading = false;
                const updated = action.payload;
                state.currentItems = state.currentItems.map(i => i.id === updated.id ? { ...i, ...updated } : i);
            })
            .addCase(verifyItem.rejected, (state, action) => { state.isActionLoading = false; state.error = action.payload as string; })

            // reportDiscrepancy
            .addCase(reportDiscrepancy.pending, (state) => { state.isActionLoading = true; state.error = null; })
            .addCase(reportDiscrepancy.fulfilled, (state, action) => {
                state.isActionLoading = false;
                state.discrepancies = [action.payload, ...state.discrepancies];
            })
            .addCase(reportDiscrepancy.rejected, (state, action) => { state.isActionLoading = false; state.error = action.payload as string; })

            // fetchDiscrepancies
            .addCase(fetchDiscrepancies.pending, (state) => { state.isLoading = true; state.error = null; })
            .addCase(fetchDiscrepancies.fulfilled, (state, action) => {
                state.isLoading = false;
                state.discrepancies = action.payload.data;
            })
            .addCase(fetchDiscrepancies.rejected, (state, action) => { state.isLoading = false; state.error = action.payload as string; })

            // fetchTransactionForVerification
            .addCase(fetchTransactionForVerification.pending, (state) => { state.isLoading = true; state.error = null; })
            .addCase(fetchTransactionForVerification.fulfilled, (state, action) => {
                state.isLoading = false;
                state.currentReturn = action.payload.transaction;
                state.currentItems = action.payload.items;
            })
            .addCase(fetchTransactionForVerification.rejected, (state, action) => { state.isLoading = false; state.error = action.payload as string; });
    },
});

export const { clearError, clearCurrentReturn } = warehouseSlice.actions;
export default warehouseSlice.reducer;
