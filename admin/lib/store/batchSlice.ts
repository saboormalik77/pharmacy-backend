import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { ReturnBatch, ReturnTransaction, DebitMemo, DebitMemoItem } from '@/lib/types';

// ── State ─────────────────────────────────────────────────────

export interface BatchState {
    batches: ReturnBatch[];
    batchPagination: { page: number; limit: number; total: number; totalPages: number } | null;
    currentBatch: ReturnBatch | null;
    batchReturns: ReturnTransaction[];
    batchMemos: DebitMemo[];
    debitMemos: DebitMemo[];
    memoPagination: { page: number; limit: number; total: number; totalPages: number } | null;
    currentMemo: DebitMemo | null;
    memoItems: DebitMemoItem[];
    isLoading: boolean;
    isActionLoading: boolean;
    error: string | null;
}

const initialState: BatchState = {
    batches: [],
    batchPagination: null,
    currentBatch: null,
    batchReturns: [],
    batchMemos: [],
    debitMemos: [],
    memoPagination: null,
    currentMemo: null,
    memoItems: [],
    isLoading: false,
    isActionLoading: false,
    error: null,
};

// ── Batch thunks ──────────────────────────────────────────────

export const fetchBatches = createAsyncThunk<
    { data: ReturnBatch[]; pagination: any },
    { status?: string; page?: number; limit?: number } | void,
    { rejectValue: string }
>('batch/fetchBatches', async (params, { rejectWithValue }) => {
    try {
        const { apiClient } = await import('@/lib/api/apiClient');
        const q: Record<string, string> = {};
        if (params?.status) q.status = params.status;
        if (params?.page) q.page = String(params.page);
        if (params?.limit) q.limit = String(params.limit);
        const res = await apiClient.get<{ status: string; data: ReturnBatch[]; pagination: any }>(
            '/admin/batches', true, q
        );
        return { data: res.data, pagination: res.pagination };
    } catch (err: any) {
        return rejectWithValue(err?.message || 'Failed to fetch batches');
    }
});

export const createBatch = createAsyncThunk<
    ReturnBatch,
    { batchMonth: string; batchName?: string },
    { rejectValue: string }
>('batch/create', async (payload, { rejectWithValue }) => {
    try {
        const { apiClient } = await import('@/lib/api/apiClient');
        const res = await apiClient.post<{ status: string; data: ReturnBatch }>(
            '/admin/batches', payload, true
        );
        return res.data;
    } catch (err: any) {
        return rejectWithValue(err?.message || 'Failed to create batch');
    }
});

export const fetchBatchDetail = createAsyncThunk<
    { batch: ReturnBatch; debitMemos: DebitMemo[]; returns: ReturnTransaction[] },
    string,
    { rejectValue: string }
>('batch/fetchDetail', async (batchId, { rejectWithValue }) => {
    try {
        const { apiClient } = await import('@/lib/api/apiClient');
        const res = await apiClient.get<{ status: string; data: { batch: ReturnBatch; debitMemos: DebitMemo[]; returns: ReturnTransaction[] } }>(
            `/admin/batches/${batchId}`, true
        );
        return res.data;
    } catch (err: any) {
        return rejectWithValue(err?.message || 'Failed to fetch batch');
    }
});

export const assignReturnsToBatch = createAsyncThunk<
    { batch: ReturnBatch; assigned: number },
    { batchId: string; transactionIds: string[] },
    { rejectValue: string }
>('batch/assignReturns', async ({ batchId, transactionIds }, { rejectWithValue }) => {
    try {
        const { apiClient } = await import('@/lib/api/apiClient');
        const res = await apiClient.post<{ status: string; data: ReturnBatch; assigned: number }>(
            `/admin/batches/${batchId}/assign`, { transactionIds }, true
        );
        return { batch: res.data, assigned: res.assigned };
    } catch (err: any) {
        return rejectWithValue(err?.message || 'Failed to assign returns');
    }
});

export const closeBatch = createAsyncThunk<
    { batch: ReturnBatch; memosGenerated: number },
    string,
    { rejectValue: string }
>('batch/close', async (batchId, { rejectWithValue }) => {
    try {
        const { apiClient } = await import('@/lib/api/apiClient');
        const res = await apiClient.post<{ status: string; data: ReturnBatch; memosGenerated: number }>(
            `/admin/batches/${batchId}/close`, {}, true
        );
        return { batch: res.data, memosGenerated: res.memosGenerated };
    } catch (err: any) {
        return rejectWithValue(err?.message || 'Failed to close batch');
    }
});

export const submitCardinal = createAsyncThunk<
    ReturnBatch,
    string,
    { rejectValue: string }
>('batch/submitCardinal', async (batchId, { rejectWithValue }) => {
    try {
        const { apiClient } = await import('@/lib/api/apiClient');
        const res = await apiClient.post<{ status: string; data: ReturnBatch }>(
            `/admin/batches/${batchId}/submit-cardinal`, {}, true
        );
        return res.data;
    } catch (err: any) {
        return rejectWithValue(err?.message || 'Failed to submit to Cardinal');
    }
});

// ── Debit memo thunks ─────────────────────────────────────────

export const fetchDebitMemos = createAsyncThunk<
    { data: DebitMemo[]; pagination: any },
    { batchId?: string; pharmacyId?: string; destination?: string; paymentStatus?: string; search?: string; page?: number; limit?: number } | void,
    { rejectValue: string }
>('batch/fetchDebitMemos', async (params, { rejectWithValue }) => {
    try {
        const { apiClient } = await import('@/lib/api/apiClient');
        const q: Record<string, string> = {};
        if (params?.batchId) q.batch_id = params.batchId;
        if (params?.pharmacyId) q.pharmacy_id = params.pharmacyId;
        if (params?.destination) q.destination = params.destination;
        if (params?.paymentStatus) q.payment_status = params.paymentStatus;
        if (params?.search) q.search = params.search;
        if (params?.page) q.page = String(params.page);
        if (params?.limit) q.limit = String(params.limit);
        const res = await apiClient.get<{ status: string; data: DebitMemo[]; pagination: any }>(
            '/admin/debit-memos', true, q
        );
        return { data: res.data, pagination: res.pagination };
    } catch (err: any) {
        return rejectWithValue(err?.message || 'Failed to fetch debit memos');
    }
});

export const fetchDebitMemoDetail = createAsyncThunk<
    { memo: DebitMemo; items: DebitMemoItem[] },
    string,
    { rejectValue: string }
>('batch/fetchMemoDetail', async (memoId, { rejectWithValue }) => {
    try {
        const { apiClient } = await import('@/lib/api/apiClient');
        const res = await apiClient.get<{ status: string; data: { memo: DebitMemo; items: DebitMemoItem[] } }>(
            `/admin/debit-memos/${memoId}`, true
        );
        return res.data;
    } catch (err: any) {
        return rejectWithValue(err?.message || 'Failed to fetch debit memo');
    }
});

export const updateDebitMemo = createAsyncThunk<
    DebitMemo,
    { memoId: string; updates: Record<string, any> },
    { rejectValue: string }
>('batch/updateMemo', async ({ memoId, updates }, { rejectWithValue }) => {
    try {
        const { apiClient } = await import('@/lib/api/apiClient');
        const res = await apiClient.patch<{ status: string; data: DebitMemo }>(
            `/admin/debit-memos/${memoId}`, updates, true
        );
        return res.data;
    } catch (err: any) {
        return rejectWithValue(err?.message || 'Failed to update debit memo');
    }
});

// ── Slice ─────────────────────────────────────────────────────

const batchSlice = createSlice({
    name: 'batch',
    initialState,
    reducers: {
        clearError: (state) => { state.error = null; },
        clearCurrentBatch: (state) => { state.currentBatch = null; state.batchReturns = []; state.batchMemos = []; },
        clearCurrentMemo: (state) => { state.currentMemo = null; state.memoItems = []; },
    },
    extraReducers: (builder) => {
        builder
            .addCase(fetchBatches.pending, (state) => { state.isLoading = true; state.error = null; })
            .addCase(fetchBatches.fulfilled, (state, action) => { state.isLoading = false; state.batches = action.payload.data; state.batchPagination = action.payload.pagination; })
            .addCase(fetchBatches.rejected, (state, action) => { state.isLoading = false; state.error = action.payload as string; })

            .addCase(createBatch.pending, (state) => { state.isActionLoading = true; state.error = null; })
            .addCase(createBatch.fulfilled, (state, action) => { state.isActionLoading = false; state.batches = [action.payload, ...state.batches]; })
            .addCase(createBatch.rejected, (state, action) => { state.isActionLoading = false; state.error = action.payload as string; })

            .addCase(fetchBatchDetail.pending, (state) => { state.isLoading = true; state.error = null; })
            .addCase(fetchBatchDetail.fulfilled, (state, action) => {
                state.isLoading = false;
                state.currentBatch = action.payload.batch;
                state.batchMemos = action.payload.debitMemos;
                state.batchReturns = action.payload.returns;
            })
            .addCase(fetchBatchDetail.rejected, (state, action) => { state.isLoading = false; state.error = action.payload as string; })

            .addCase(assignReturnsToBatch.pending, (state) => { state.isActionLoading = true; state.error = null; })
            .addCase(assignReturnsToBatch.fulfilled, (state, action) => { state.isActionLoading = false; state.currentBatch = action.payload.batch; })
            .addCase(assignReturnsToBatch.rejected, (state, action) => { state.isActionLoading = false; state.error = action.payload as string; })

            .addCase(closeBatch.pending, (state) => { state.isActionLoading = true; state.error = null; })
            .addCase(closeBatch.fulfilled, (state, action) => { state.isActionLoading = false; state.currentBatch = action.payload.batch; })
            .addCase(closeBatch.rejected, (state, action) => { state.isActionLoading = false; state.error = action.payload as string; })

            .addCase(submitCardinal.pending, (state) => { state.isActionLoading = true; state.error = null; })
            .addCase(submitCardinal.fulfilled, (state, action) => { state.isActionLoading = false; state.currentBatch = action.payload; })
            .addCase(submitCardinal.rejected, (state, action) => { state.isActionLoading = false; state.error = action.payload as string; })

            .addCase(fetchDebitMemos.pending, (state) => { state.isLoading = true; state.error = null; })
            .addCase(fetchDebitMemos.fulfilled, (state, action) => { state.isLoading = false; state.debitMemos = action.payload.data; state.memoPagination = action.payload.pagination; })
            .addCase(fetchDebitMemos.rejected, (state, action) => { state.isLoading = false; state.error = action.payload as string; })

            .addCase(fetchDebitMemoDetail.pending, (state) => { state.isLoading = true; state.error = null; })
            .addCase(fetchDebitMemoDetail.fulfilled, (state, action) => { state.isLoading = false; state.currentMemo = action.payload.memo; state.memoItems = action.payload.items; })
            .addCase(fetchDebitMemoDetail.rejected, (state, action) => { state.isLoading = false; state.error = action.payload as string; })

            .addCase(updateDebitMemo.pending, (state) => { state.isActionLoading = true; state.error = null; })
            .addCase(updateDebitMemo.fulfilled, (state, action) => {
                state.isActionLoading = false;
                state.currentMemo = action.payload;
                state.debitMemos = state.debitMemos.map(m => m.id === action.payload.id ? action.payload : m);
            })
            .addCase(updateDebitMemo.rejected, (state, action) => { state.isActionLoading = false; state.error = action.payload as string; });
    },
});

export const { clearError, clearCurrentBatch, clearCurrentMemo } = batchSlice.actions;
export default batchSlice.reducer;
