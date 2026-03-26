import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { ReturnBatch, ReturnTransaction, DebitMemo, DebitMemoItem } from '@/lib/types';

// ── Workflow state type ───────────────────────────────────────

export interface BatchWorkflowState {
    cardinalGenerated: boolean;
    cardinalSent: boolean;
    debitMemosCreated: boolean;
    raRequested: boolean;
}

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
    workflowState: BatchWorkflowState | null;
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
    workflowState: null,
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

// ── Batch Management thunks (FCR-32) ─────────────────────────

export const deleteBatch = createAsyncThunk<
    { message: string; deletedBatch: ReturnBatch; unassignedReturns: number },
    string,
    { rejectValue: string }
>('batch/delete', async (batchId, { rejectWithValue }) => {
    try {
        const { apiClient } = await import('@/lib/api/apiClient');
        const res = await apiClient.delete<{ 
            status: string; 
            message: string; 
            data: { deletedBatch: ReturnBatch; unassignedReturns: number } 
        }>(`/admin/batches/${batchId}`, true);
        return {
            message: res.message,
            deletedBatch: res.data.deletedBatch,
            unassignedReturns: res.data.unassignedReturns
        };
    } catch (error: any) {
        return rejectWithValue(error.response?.data?.message || 'Failed to delete batch');
    }
});

export const unassignReturnsFromBatch = createAsyncThunk<
    { batch: ReturnBatch; unassignedCount: number; skippedCount: number; message: string },
    { batchId: string; transactionIds: string[] },
    { rejectValue: string }
>('batch/unassignReturns', async ({ batchId, transactionIds }, { rejectWithValue }) => {
    try {
        const { apiClient } = await import('@/lib/api/apiClient');
        const res = await apiClient.post<{ 
            status: string; 
            message: string; 
            data: { batch: ReturnBatch; unassignedCount: number; skippedCount: number } 
        }>(`/admin/batches/${batchId}/unassign`, { transactionIds }, true);
        return {
            batch: res.data.batch,
            unassignedCount: res.data.unassignedCount,
            skippedCount: res.data.skippedCount,
            message: res.message
        };
    } catch (error: any) {
        return rejectWithValue(error.response?.data?.message || 'Failed to unassign returns');
    }
});

export const unassignSingleReturn = createAsyncThunk<
    { batch: ReturnBatch; return: ReturnTransaction; message: string },
    string,
    { rejectValue: string }
>('batch/unassignSingleReturn', async (transactionId, { rejectWithValue }) => {
    try {
        const { apiClient } = await import('@/lib/api/apiClient');
        const res = await apiClient.post<{ 
            status: string; 
            message: string; 
            data: { batch: ReturnBatch; return: ReturnTransaction } 
        }>(`/return-transactions/${transactionId}/unassign`, {}, true);
        return {
            batch: res.data.batch,
            return: res.data.return,
            message: res.message
        };
    } catch (error: any) {
        return rejectWithValue(error.response?.data?.message || 'Failed to unassign return');
    }
});

export const getBatchPermissions = createAsyncThunk<
    {
        batchId: string;
        status: string;
        canDelete: boolean;
        canUnassignReturns: boolean;
        canAssignReturns: boolean;
        canClose: boolean;
        canSubmitCardinal: boolean;
        hasDebitMemos: boolean;
        debitMemoCount: number;
    },
    string,
    { rejectValue: string }
>('batch/getPermissions', async (batchId, { rejectWithValue }) => {
    try {
        const { apiClient } = await import('@/lib/api/apiClient');
        const res = await apiClient.get<{ 
            status: string; 
            data: {
                batchId: string;
                status: string;
                canDelete: boolean;
                canUnassignReturns: boolean;
                canAssignReturns: boolean;
                canClose: boolean;
                canSubmitCardinal: boolean;
                hasDebitMemos: boolean;
                debitMemoCount: number;
            }
        }>(`/admin/batches/${batchId}/permissions`, true);
        return res.data;
    } catch (error: any) {
        return rejectWithValue(error.response?.data?.message || 'Failed to get batch permissions');
    }
});

// ── Batch workflow thunks (FCR-36) ────────────────────────────

export const fetchBatchWorkflow = createAsyncThunk<
    BatchWorkflowState,
    string,
    { rejectValue: string }
>('batch/fetchWorkflow', async (batchId, { rejectWithValue }) => {
    try {
        const { apiClient } = await import('@/lib/api/apiClient');
        const res = await apiClient.get<{ status: string; data: BatchWorkflowState }>(
            `/admin/batches/${batchId}/workflow`, true
        );
        return res.data;
    } catch (err: any) {
        return rejectWithValue(err?.message || 'Failed to fetch workflow');
    }
});

export const completeBatchWorkflowStep = createAsyncThunk<
    BatchWorkflowState,
    { batchId: string; step: string; metadata?: Record<string, unknown> },
    { rejectValue: string }
>('batch/completeWorkflowStep', async ({ batchId, step, metadata }, { rejectWithValue }) => {
    try {
        const { apiClient } = await import('@/lib/api/apiClient');
        const res = await apiClient.post<{ status: string; data: BatchWorkflowState }>(
            `/admin/batches/${batchId}/workflow/complete`,
            { step, metadata },
            true
        );
        return res.data;
    } catch (err: any) {
        return rejectWithValue(err?.message || 'Failed to complete workflow step');
    }
});

export const generateBatchMemos = createAsyncThunk<
    { batch: ReturnBatch; memosGenerated: number },
    string,
    { rejectValue: string }
>('batch/generateMemos', async (batchId, { rejectWithValue }) => {
    try {
        const { apiClient } = await import('@/lib/api/apiClient');
        const res = await apiClient.post<{ status: string; data: ReturnBatch; memosGenerated: number }>(
            `/admin/batches/${batchId}/generate-memos`, {}, true
        );
        return { batch: res.data, memosGenerated: res.memosGenerated };
    } catch (err: any) {
        return rejectWithValue(err?.message || 'Failed to generate debit memos');
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
        clearCurrentBatch: (state) => { state.currentBatch = null; state.batchReturns = []; state.batchMemos = []; state.workflowState = null; },
        clearCurrentMemo: (state) => { state.currentMemo = null; state.memoItems = []; },
        clearWorkflowState: (state) => { state.workflowState = null; },
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
            .addCase(updateDebitMemo.rejected, (state, action) => { state.isActionLoading = false; state.error = action.payload as string; })

            // Batch Management reducers (FCR-32)
            .addCase(deleteBatch.pending, (state) => { state.isActionLoading = true; state.error = null; })
            .addCase(deleteBatch.fulfilled, (state, action) => {
                state.isActionLoading = false;
                state.batches = state.batches.filter(b => b.id !== action.payload.deletedBatch.id);
                // Clear current batch if it was the deleted one
                if (state.currentBatch?.id === action.payload.deletedBatch.id) {
                    state.currentBatch = null;
                    state.batchReturns = [];
                    state.batchMemos = [];
                }
            })
            .addCase(deleteBatch.rejected, (state, action) => { state.isActionLoading = false; state.error = action.payload as string; })

            .addCase(unassignReturnsFromBatch.pending, (state) => { state.isActionLoading = true; state.error = null; })
            .addCase(unassignReturnsFromBatch.fulfilled, (state, action) => {
                state.isActionLoading = false;
                state.currentBatch = action.payload.batch;
                // Remove unassigned returns from batchReturns
                state.batchReturns = state.batchReturns.filter(r => r.batchId === action.payload.batch.id);
            })
            .addCase(unassignReturnsFromBatch.rejected, (state, action) => { state.isActionLoading = false; state.error = action.payload as string; })

            .addCase(unassignSingleReturn.pending, (state) => { state.isActionLoading = true; state.error = null; })
            .addCase(unassignSingleReturn.fulfilled, (state, action) => {
                state.isActionLoading = false;
                // Remove the unassigned return from batchReturns if it was in current batch
                state.batchReturns = state.batchReturns.filter(r => r.id !== action.payload.return.id);
                // Update the batch totals if it's the current batch
                if (state.currentBatch?.id === action.payload.batch.id) {
                    state.currentBatch = action.payload.batch;
                }
            })
            .addCase(unassignSingleReturn.rejected, (state, action) => { state.isActionLoading = false; state.error = action.payload as string; })

            .addCase(getBatchPermissions.pending, (state) => { state.error = null; })
            .addCase(getBatchPermissions.fulfilled, (_state, _action) => {
                // Permissions are handled in components, no state update needed
            })
            .addCase(getBatchPermissions.rejected, (state, action) => { state.error = action.payload as string; })

            .addCase(fetchBatchWorkflow.pending, (state) => { state.error = null; })
            .addCase(fetchBatchWorkflow.fulfilled, (state, action) => { state.workflowState = action.payload; })
            .addCase(fetchBatchWorkflow.rejected, (state, action) => { state.error = action.payload as string; })

            .addCase(completeBatchWorkflowStep.pending, (state) => { state.isActionLoading = true; state.error = null; })
            .addCase(completeBatchWorkflowStep.fulfilled, (state, action) => { state.isActionLoading = false; state.workflowState = action.payload; })
            .addCase(completeBatchWorkflowStep.rejected, (state, action) => { state.isActionLoading = false; state.error = action.payload as string; })

            .addCase(generateBatchMemos.pending, (state) => { state.isActionLoading = true; state.error = null; })
            .addCase(generateBatchMemos.fulfilled, (state, action) => {
                state.isActionLoading = false;
                state.currentBatch = action.payload.batch;
            })
            .addCase(generateBatchMemos.rejected, (state, action) => { state.isActionLoading = false; state.error = action.payload as string; });
    },
});

export const { clearError, clearCurrentBatch, clearCurrentMemo, clearWorkflowState } = batchSlice.actions;
export default batchSlice.reducer;
