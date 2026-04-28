import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import {
    ReturnTransaction,
    ReturnTransactionItem,
    WarehouseDiscrepancy,
    VerificationSummary,
    SurplusItem,
    VerificationV2Summary,
    StartVerificationResult,
    CompleteVerificationSummary,
    WarehouseSurplusItem,
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
    v2Summary: VerificationV2Summary | null;
    allSurplus: WarehouseSurplusItem[];
    allSurplusPagination: { total: number; totalPages: number } | null;
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
    v2Summary: null,
    allSurplus: [],
    allSurplusPagination: null,
    isLoading: false,
    isActionLoading: false,
    error: null,
};

// ── Thunks ────────────────────────────────────────────────────

export interface ScanProgress {
    totalPackages: number;
    scannedCount: number;
    allScanned: boolean;
    scannedKeys?: string[];
}

export interface ScanBoxResult {
    transaction: ReturnTransaction;
    scanProgress: ScanProgress;
    alreadyScanned: boolean;
    message: string;
}

export const scanBox = createAsyncThunk<
    ScanBoxResult,
    string,
    { rejectValue: string }
>('warehouse/scanBox', async (trackingNumber, { rejectWithValue }) => {
    try {
        const { apiClient } = await import('@/lib/api/apiClient');
        const res = await apiClient.post<{
            status: string;
            data: ReturnTransaction;
            scanProgress: ScanProgress;
            alreadyScanned: boolean;
            message: string;
        }>('/admin/warehouse/scan-box', { trackingNumber }, true);
        return {
            transaction: res.data,
            scanProgress: res.scanProgress,
            alreadyScanned: res.alreadyScanned,
            message: res.message,
        };
    } catch (err: any) {
        return rejectWithValue(err?.message || 'Failed to scan box');
    }
});

// Legacy: kept for backward compatibility
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
    { search?: string; page?: number; limit?: number; verificationStatus?: string } | void,
    { rejectValue: string }
>('warehouse/fetchReceived', async (params, { rejectWithValue }) => {
    try {
        const { apiClient } = await import('@/lib/api/apiClient');
        const query: Record<string, string> = {};
        if (params) {
            if (params.search) query.search = params.search;
            if (params.page) query.page = String(params.page);
            if (params.limit) query.limit = String(params.limit);
            if (params.verificationStatus) query.verificationStatus = params.verificationStatus;
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

// ── V2 Verification Thunks ────────────────────────────────────

export const startVerification = createAsyncThunk<
    StartVerificationResult,
    { transactionId: string; boxCount: number },
    { rejectValue: string }
>('warehouse/startVerification', async ({ transactionId, boxCount }, { rejectWithValue }) => {
    try {
        const { apiClient } = await import('@/lib/api/apiClient');
        const res = await apiClient.post<{ status: string; data: StartVerificationResult }>(
            `/admin/warehouse/${transactionId}/start-verification`, { boxCount }, true
        );
        return res.data;
    } catch (err: any) {
        return rejectWithValue(err?.message || 'Failed to start verification');
    }
});

export const fetchVerificationSummary = createAsyncThunk<
    VerificationV2Summary,
    string,
    { rejectValue: string }
>('warehouse/fetchVerificationSummary', async (transactionId, { rejectWithValue }) => {
    try {
        const { apiClient } = await import('@/lib/api/apiClient');
        const res = await apiClient.get<{ status: string; data: VerificationV2Summary }>(
            `/admin/warehouse/${transactionId}/verification-summary`, true
        );
        return res.data;
    } catch (err: any) {
        return rejectWithValue(err?.message || 'Failed to fetch verification summary');
    }
});

export const verifyItemV2 = createAsyncThunk<
    any,
    {
        transactionId: string;
        itemId: string;
        verificationStatus: string;
        actualQuantity?: number;
        conditionNotes?: string;
        nonReturnableReason?: string;
    },
    { rejectValue: string }
>('warehouse/verifyItemV2', async ({ transactionId, itemId, ...payload }, { rejectWithValue }) => {
    try {
        const { apiClient } = await import('@/lib/api/apiClient');
        const res = await apiClient.patch<{ status: string; data: any }>(
            `/admin/warehouse/${transactionId}/items/${itemId}/verify-v2`, payload, true
        );
        return res.data;
    } catch (err: any) {
        return rejectWithValue(err?.message || 'Failed to verify item');
    }
});

export const addSurplus = createAsyncThunk<
    { surplus: SurplusItem; discrepancyId: string },
    {
        transactionId: string;
        ndc?: string;
        productName?: string;
        manufacturer?: string;
        lotNumber?: string;
        expirationDate?: string;
        quantity?: number;
        warehouseLocation: string;
        condition?: 'good' | 'damaged' | 'unknown';
        notes?: string;
    },
    { rejectValue: string }
>('warehouse/addSurplus', async ({ transactionId, ...payload }, { rejectWithValue }) => {
    try {
        const { apiClient } = await import('@/lib/api/apiClient');
        const res = await apiClient.post<{
            status: string;
            data: SurplusItem;
            discrepancyId: string;
        }>(`/admin/warehouse/${transactionId}/surplus`, payload, true);
        return { surplus: res.data, discrepancyId: res.discrepancyId };
    } catch (err: any) {
        return rejectWithValue(err?.message || 'Failed to add surplus item');
    }
});

export const fetchSurplusForReturn = createAsyncThunk<
    SurplusItem[],
    { transactionId: string; status?: string },
    { rejectValue: string }
>('warehouse/fetchSurplusForReturn', async ({ transactionId, status }, { rejectWithValue }) => {
    try {
        const { apiClient } = await import('@/lib/api/apiClient');
        const query: Record<string, string> = {};
        if (status) query.status = status;
        const res = await apiClient.get<{ status: string; data: SurplusItem[] }>(
            `/admin/warehouse/${transactionId}/surplus`, true, query
        );
        return res.data;
    } catch (err: any) {
        return rejectWithValue(err?.message || 'Failed to fetch surplus items');
    }
});

export const fetchAllSurplus = createAsyncThunk<
    { data: WarehouseSurplusItem[]; total: number; totalPages: number },
    { search?: string; status?: string; page?: number; limit?: number } | void,
    { rejectValue: string }
>('warehouse/fetchAllSurplus', async (params, { rejectWithValue }) => {
    try {
        const { apiClient } = await import('@/lib/api/apiClient');
        const query: Record<string, string> = {};
        if (params) {
            if (params.search) query.search = params.search;
            if (params.status) query.status = params.status;
            if (params.page) query.page = String(params.page);
            if (params.limit) query.limit = String(params.limit);
        }
        const res = await apiClient.get<{ status: string; data: WarehouseSurplusItem[]; total: number; totalPages: number }>(
            '/admin/warehouse/surplus', true, query
        );
        return { data: res.data, total: res.total, totalPages: res.totalPages };
    } catch (err: any) {
        return rejectWithValue(err?.message || 'Failed to fetch surplus items');
    }
});

export const completeVerification = createAsyncThunk<
    { data: any; summary: CompleteVerificationSummary },
    { transactionId: string; notes?: string },
    { rejectValue: string }
>('warehouse/completeVerification', async ({ transactionId, notes }, { rejectWithValue }) => {
    try {
        const { apiClient } = await import('@/lib/api/apiClient');
        const res = await apiClient.post<{ status: string; data: any; summary: CompleteVerificationSummary }>(
            `/admin/warehouse/${transactionId}/complete-verification`, notes ? { notes } : {}, true
        );
        return { data: res.data, summary: res.summary };
    } catch (err: any) {
        return rejectWithValue(err?.message || 'Failed to complete verification');
    }
});

export const resolveDiscrepancy = createAsyncThunk<
    WarehouseDiscrepancy,
    { discrepancyId: string; resolution: 'resolved' | 'dismissed'; resolutionNotes?: string },
    { rejectValue: string }
>('warehouse/resolveDiscrepancy', async ({ discrepancyId, resolution, resolutionNotes }, { rejectWithValue }) => {
    try {
        const { apiClient } = await import('@/lib/api/apiClient');
        const res = await apiClient.patch<{ status: string; data: WarehouseDiscrepancy }>(
            `/admin/warehouse/discrepancies/${discrepancyId}/resolve`,
            { resolution, resolutionNotes: resolutionNotes || undefined }, true
        );
        return res.data;
    } catch (err: any) {
        return rejectWithValue(err?.message || 'Failed to resolve discrepancy');
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
            // scanBox
            .addCase(scanBox.pending, (state) => { state.isActionLoading = true; state.error = null; })
            .addCase(scanBox.fulfilled, (state, action) => { state.isActionLoading = false; state.currentReturn = action.payload.transaction; })
            .addCase(scanBox.rejected, (state, action) => { state.isActionLoading = false; state.error = action.payload as string; })

            // receiveReturn (legacy)
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
            .addCase(fetchTransactionForVerification.rejected, (state, action) => { state.isLoading = false; state.error = action.payload as string; })

            // V2: startVerification
            .addCase(startVerification.pending, (state) => { state.isActionLoading = true; state.error = null; })
            .addCase(startVerification.fulfilled, (state) => { state.isActionLoading = false; })
            .addCase(startVerification.rejected, (state, action) => { state.isActionLoading = false; state.error = action.payload as string; })

            // V2: fetchVerificationSummary
            .addCase(fetchVerificationSummary.pending, (state) => { state.isLoading = true; state.error = null; })
            .addCase(fetchVerificationSummary.fulfilled, (state, action) => { state.isLoading = false; state.v2Summary = action.payload; })
            .addCase(fetchVerificationSummary.rejected, (state, action) => { state.isLoading = false; state.error = action.payload as string; })

            // V2: verifyItemV2
            .addCase(verifyItemV2.pending, (state) => { state.isActionLoading = true; state.error = null; })
            .addCase(verifyItemV2.fulfilled, (state) => { state.isActionLoading = false; })
            .addCase(verifyItemV2.rejected, (state, action) => { state.isActionLoading = false; state.error = action.payload as string; })

            // addSurplus
            .addCase(addSurplus.pending, (state) => { state.isActionLoading = true; state.error = null; })
            .addCase(addSurplus.fulfilled, (state) => { state.isActionLoading = false; })
            .addCase(addSurplus.rejected, (state, action) => { state.isActionLoading = false; state.error = action.payload as string; })

            // completeVerification
            .addCase(completeVerification.pending, (state) => { state.isActionLoading = true; state.error = null; })
            .addCase(completeVerification.fulfilled, (state) => { state.isActionLoading = false; })
            .addCase(completeVerification.rejected, (state, action) => { state.isActionLoading = false; state.error = action.payload as string; })

            // resolveDiscrepancy
            .addCase(resolveDiscrepancy.pending, (state) => { state.isActionLoading = true; state.error = null; })
            .addCase(resolveDiscrepancy.fulfilled, (state, action) => {
                state.isActionLoading = false;
                const updated = action.payload;
                state.discrepancies = state.discrepancies.map(d => d.id === updated.id ? updated : d);
            })
            .addCase(resolveDiscrepancy.rejected, (state, action) => { state.isActionLoading = false; state.error = action.payload as string; })

            // fetchAllSurplus
            .addCase(fetchAllSurplus.pending, (state) => { state.isLoading = true; state.error = null; })
            .addCase(fetchAllSurplus.fulfilled, (state, action) => {
                state.isLoading = false;
                state.allSurplus = action.payload.data;
                state.allSurplusPagination = { total: action.payload.total, totalPages: action.payload.totalPages };
            })
            .addCase(fetchAllSurplus.rejected, (state, action) => { state.isLoading = false; state.error = action.payload as string; });
    },
});

export const { clearError, clearCurrentReturn } = warehouseSlice.actions;
export default warehouseSlice.reducer;
