import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { DebitMemo, UnpaidSummary, AskVsReceivedRow, ManufacturerPaymentSummary, CreditMemoAnalysisResult } from '@/lib/types';

// ── State ─────────────────────────────────────────────────────

export interface PaymentTrackingState {
    unpaidMemos: (DebitMemo & { daysOutstanding?: number; outstandingAmount?: number })[];
    unpaidPagination: { page: number; limit: number; total: number; totalPages: number } | null;
    unpaidSummary: UnpaidSummary | null;
    paidMemos: DebitMemo[];
    paidPagination: { page: number; limit: number; total: number; totalPages: number } | null;
    askVsReceived: AskVsReceivedRow[];
    askVsReceivedTotals: Record<string, any> | null;
    askVsReceivedPagination: { page: number; limit: number; total: number; totalPages: number } | null;
    manufacturerSummary: ManufacturerPaymentSummary[];
    manufacturerPagination: { page: number; limit: number; total: number; totalPages: number } | null;
    isLoading: boolean;
    isActionLoading: boolean;
    error: string | null;
    /** FCR-56: latest AI-driven credit-memo analysis result (per record-payment / update-payment call) */
    lastAiAnalysis: CreditMemoAnalysisResult | null;
}

const initialState: PaymentTrackingState = {
    unpaidMemos: [],
    unpaidPagination: null,
    unpaidSummary: null,
    paidMemos: [],
    paidPagination: null,
    askVsReceived: [],
    askVsReceivedTotals: null,
    askVsReceivedPagination: null,
    manufacturerSummary: [],
    manufacturerPagination: null,
    isLoading: false,
    isActionLoading: false,
    error: null,
    lastAiAnalysis: null,
};

// ── Thunks ────────────────────────────────────────────────────

export const fetchUnpaidMemos = createAsyncThunk<
    { data: DebitMemo[]; pagination: any; summary: UnpaidSummary },
    { manufacturer?: string; destination?: string; search?: string; page?: number; limit?: number } | void,
    { rejectValue: string }
>('paymentTracking/fetchUnpaid', async (params, { rejectWithValue }) => {
    try {
        const { apiClient } = await import('@/lib/api/apiClient');
        const q: Record<string, string> = {};
        if (params?.manufacturer) q.manufacturer = params.manufacturer;
        if (params?.destination) q.destination = params.destination;
        if (params?.search) q.search = params.search;
        if (params?.page) q.page = String(params.page);
        if (params?.limit) q.limit = String(params.limit);
        const res = await apiClient.get<{
            status: string; data: DebitMemo[]; pagination: any; summary: UnpaidSummary;
        }>('/admin/debit-memos/unpaid', true, q);
        return { data: res.data, pagination: res.pagination, summary: res.summary };
    } catch (err: any) {
        return rejectWithValue(err?.message || 'Failed to fetch unpaid memos');
    }
});

export const recordPayment = createAsyncThunk<
    { memo: DebitMemo; aiAnalysis: CreditMemoAnalysisResult | null },
    { memoId: string; amountReceived: number; paymentDate: string; reference: string; notes: string; creditMemoFile: File },
    { rejectValue: string }
>('paymentTracking/recordPayment', async ({ memoId, creditMemoFile, paymentDate, reference, notes, amountReceived }, { rejectWithValue }) => {
    try {
        const { apiClient } = await import('@/lib/api/apiClient');
        const formData = new FormData();
        formData.append('amountReceived', String(amountReceived));
        formData.append('paymentDate', new Date(paymentDate).toISOString());
        formData.append('reference', reference);
        formData.append('notes', notes);
        formData.append('creditMemo', creditMemoFile);
        const res = await apiClient.postFormData<{ status: string; data: DebitMemo; aiAnalysis: CreditMemoAnalysisResult | null }>(
            `/admin/debit-memos/${memoId}/record-payment`, formData, true
        );
        return { memo: res.data, aiAnalysis: res.aiAnalysis ?? null };
    } catch (err: any) {
        return rejectWithValue(err?.message || 'Failed to record payment');
    }
});

export const updatePayment = createAsyncThunk<
    { memo: DebitMemo; aiAnalysis: CreditMemoAnalysisResult | null },
    { memoId: string; amountReceived: number; paymentDate: string; reference: string; notes: string; creditMemoFile?: File },
    { rejectValue: string }
>('paymentTracking/updatePayment', async ({ memoId, creditMemoFile, paymentDate, reference, notes, amountReceived }, { rejectWithValue }) => {
    try {
        const { apiClient } = await import('@/lib/api/apiClient');
        const formData = new FormData();
        formData.append('amountReceived', String(amountReceived));
        formData.append('paymentDate', new Date(paymentDate).toISOString());
        formData.append('reference', reference);
        formData.append('notes', notes);
        if (creditMemoFile) {
            formData.append('creditMemo', creditMemoFile);
        }
        const res = await apiClient.patchFormData<{ status: string; data: DebitMemo; aiAnalysis: CreditMemoAnalysisResult | null }>(
            `/admin/debit-memos/${memoId}/update-payment`, formData, true
        );
        return { memo: res.data, aiAnalysis: res.aiAnalysis ?? null };
    } catch (err: any) {
        return rejectWithValue(err?.message || 'Failed to update payment');
    }
});

export const sendPaymentReminder = createAsyncThunk<
    any,
    { memoId: string; sentBy?: string; emailOverride?: string },
    { rejectValue: string }
>('paymentTracking/sendReminder', async ({ memoId, ...body }, { rejectWithValue }) => {
    try {
        const { apiClient } = await import('@/lib/api/apiClient');
        const res = await apiClient.post<{ status: string; data: any }>(
            `/admin/debit-memos/${memoId}/send-reminder`, body, true
        );
        return res.data;
    } catch (err: any) {
        return rejectWithValue(err?.message || 'Failed to send reminder');
    }
});

export const fetchPaidMemos = createAsyncThunk<
    { data: DebitMemo[]; pagination: any },
    { destination?: string; search?: string; page?: number; limit?: number } | void,
    { rejectValue: string }
>('paymentTracking/fetchPaid', async (params, { rejectWithValue }) => {
    try {
        const { apiClient } = await import('@/lib/api/apiClient');
        const q: Record<string, string> = { payment_status: 'paid,partial' };
        if (params?.destination) q.destination = params.destination;
        if (params?.search) q.search = params.search;
        if (params?.page) q.page = String(params.page);
        if (params?.limit) q.limit = String(params.limit);
        const res = await apiClient.get<{
            status: string; data: DebitMemo[]; pagination: any;
        }>('/admin/debit-memos', true, q);
        return { data: res.data ?? [], pagination: res.pagination ?? null };
    } catch (err: any) {
        return rejectWithValue(err?.message || 'Failed to fetch paid memos');
    }
});

export const fetchAskVsReceived = createAsyncThunk<
    { data: AskVsReceivedRow[]; totals: any; pagination?: any },
    { groupBy?: string; period?: string; page?: number; limit?: number } | void,
    { rejectValue: string }
>('paymentTracking/askVsReceived', async (params, { rejectWithValue }) => {
    try {
        const { apiClient } = await import('@/lib/api/apiClient');
        const q: Record<string, string> = {};
        if (params?.groupBy) q.group_by = params.groupBy;
        if (params?.period) q.period = params.period;
        if (params?.page) q.page = String(params.page);
        if (params?.limit) q.limit = String(params.limit);
        const res = await apiClient.get<{
            status: string; data: AskVsReceivedRow[]; totals: any; pagination?: any;
        }>('/admin/analytics/ask-vs-received', true, q);
        return { data: res.data, totals: res.totals, pagination: res.pagination };
    } catch (err: any) {
        return rejectWithValue(err?.message || 'Failed to fetch ask vs received');
    }
});

export const fetchManufacturerSummary = createAsyncThunk<
    { data: ManufacturerPaymentSummary[]; pagination: any },
    { search?: string; page?: number; limit?: number } | void,
    { rejectValue: string }
>('paymentTracking/manufacturerSummary', async (params, { rejectWithValue }) => {
    try {
        const { apiClient } = await import('@/lib/api/apiClient');
        const q: Record<string, string> = {};
        if (params?.search) q.search = params.search;
        if (params?.page) q.page = String(params.page);
        if (params?.limit) q.limit = String(params.limit);
        const res = await apiClient.get<{
            status: string; data: ManufacturerPaymentSummary[]; pagination: any;
        }>('/admin/analytics/manufacturer-payments', true, q);
        return { data: res.data, pagination: res.pagination };
    } catch (err: any) {
        return rejectWithValue(err?.message || 'Failed to fetch manufacturer summary');
    }
});

// ── Slice ─────────────────────────────────────────────────────

const paymentTrackingSlice = createSlice({
    name: 'paymentTracking',
    initialState,
    reducers: {
        clearError: (state) => { state.error = null; },
        clearAiAnalysis: (state) => { state.lastAiAnalysis = null; },
    },
    extraReducers: (builder) => {
        builder
            .addCase(fetchUnpaidMemos.pending, (state) => { state.isLoading = true; state.error = null; })
            .addCase(fetchUnpaidMemos.fulfilled, (state, action) => {
                state.isLoading = false;
                state.unpaidMemos = action.payload.data;
                state.unpaidPagination = action.payload.pagination;
                state.unpaidSummary = action.payload.summary;
            })
            .addCase(fetchUnpaidMemos.rejected, (state, action) => { state.isLoading = false; state.error = action.payload as string; })

            .addCase(fetchPaidMemos.pending, (state) => { state.isLoading = true; state.error = null; })
            .addCase(fetchPaidMemos.fulfilled, (state, action) => {
                state.isLoading = false;
                state.paidMemos = action.payload.data ?? [];
                state.paidPagination = action.payload.pagination ?? null;
            })
            .addCase(fetchPaidMemos.rejected, (state, action) => { state.isLoading = false; state.error = action.payload as string; })

            .addCase(recordPayment.pending, (state) => { state.isActionLoading = true; state.error = null; state.lastAiAnalysis = null; })
            .addCase(recordPayment.fulfilled, (state, action) => {
                state.isActionLoading = false;
                const memo = action.payload.memo;
                state.lastAiAnalysis = action.payload.aiAnalysis;
                // Remove from unpaid list (both paid and partial with received amount leave the unpaid tab)
                state.unpaidMemos = state.unpaidMemos.filter(m => m.id !== memo.id);
                // Add to paid list so it appears immediately without waiting for a re-fetch
                if (memo.paymentStatus === 'paid' || memo.paymentStatus === 'partial') {
                    const alreadyInPaid = state.paidMemos.some(m => m.id === memo.id);
                    if (!alreadyInPaid) {
                        state.paidMemos = [memo, ...state.paidMemos];
                        if (state.paidPagination) {
                            state.paidPagination = { ...state.paidPagination, total: state.paidPagination.total + 1 };
                        }
                    }
                }
            })
            .addCase(recordPayment.rejected, (state, action) => { state.isActionLoading = false; state.error = action.payload as string; })

            .addCase(updatePayment.pending, (state) => { state.isActionLoading = true; state.error = null; state.lastAiAnalysis = null; })
            .addCase(updatePayment.fulfilled, (state, action) => {
                state.isActionLoading = false;
                const memo = action.payload.memo;
                state.lastAiAnalysis = action.payload.aiAnalysis;
                state.paidMemos = state.paidMemos.map(m => m.id === memo.id ? memo : m);
            })
            .addCase(updatePayment.rejected, (state, action) => { state.isActionLoading = false; state.error = action.payload as string; })

            .addCase(sendPaymentReminder.pending, (state) => { state.isActionLoading = true; state.error = null; })
            .addCase(sendPaymentReminder.fulfilled, (state) => { state.isActionLoading = false; })
            .addCase(sendPaymentReminder.rejected, (state, action) => { state.isActionLoading = false; state.error = action.payload as string; })

            .addCase(fetchAskVsReceived.pending, (state) => { state.isLoading = true; state.error = null; })
            .addCase(fetchAskVsReceived.fulfilled, (state, action) => {
                state.isLoading = false;
                state.askVsReceived = action.payload.data;
                state.askVsReceivedTotals = action.payload.totals;
                state.askVsReceivedPagination = action.payload.pagination;
            })
            .addCase(fetchAskVsReceived.rejected, (state, action) => { state.isLoading = false; state.error = action.payload as string; })

            .addCase(fetchManufacturerSummary.pending, (state) => { state.isLoading = true; state.error = null; })
            .addCase(fetchManufacturerSummary.fulfilled, (state, action) => {
                state.isLoading = false;
                state.manufacturerSummary = action.payload.data;
                state.manufacturerPagination = action.payload.pagination;
            })
            .addCase(fetchManufacturerSummary.rejected, (state, action) => { state.isLoading = false; state.error = action.payload as string; });
    },
});

export const { clearError, clearAiAnalysis } = paymentTrackingSlice.actions;
export default paymentTrackingSlice.reducer;
