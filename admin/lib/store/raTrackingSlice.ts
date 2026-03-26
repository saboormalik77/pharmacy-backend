import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { DebitMemo, RARequest, RAEmailTemplate, RATrackingSummary } from '@/lib/types';

// ── State ─────────────────────────────────────────────────────

export interface RATrackingState {
    memos: DebitMemo[];
    pagination: { page: number; limit: number; total: number; totalPages: number } | null;
    summary: RATrackingSummary | null;
    emailPreview: RAEmailTemplate | null;
    isLoading: boolean;
    isActionLoading: boolean;
    isPreviewLoading: boolean;
    error: string | null;
}

const initialState: RATrackingState = {
    memos: [],
    pagination: null,
    summary: null,
    emailPreview: null,
    isLoading: false,
    isActionLoading: false,
    isPreviewLoading: false,
    error: null,
};

// ── Thunks ────────────────────────────────────────────────────

export const fetchRATracking = createAsyncThunk<
    { data: DebitMemo[]; pagination: any; summary: RATrackingSummary },
    { raStatus?: string; destination?: string; dateFrom?: string; dateTo?: string; search?: string; page?: number; limit?: number } | void,
    { rejectValue: string }
>('raTracking/fetchAll', async (params, { rejectWithValue }) => {
    try {
        const { apiClient } = await import('@/lib/api/apiClient');
        const q: Record<string, string> = {};
        if (params?.raStatus) q.ra_status = params.raStatus;
        if (params?.destination) q.destination = params.destination;
        if (params?.dateFrom) q.date_from = params.dateFrom;
        if (params?.dateTo) q.date_to = params.dateTo;
        if (params?.search) q.search = params.search;
        if (params?.page) q.page = String(params.page);
        if (params?.limit) q.limit = String(params.limit);
        const res = await apiClient.get<{ status: string; data: DebitMemo[]; pagination: any; summary: RATrackingSummary }>(
            '/admin/ra-tracking', true, q
        );
        return { data: res.data, pagination: res.pagination, summary: res.summary };
    } catch (err: any) {
        return rejectWithValue(err?.message || 'Failed to fetch RA tracking');
    }
});

export const fetchOutstandingRAs = createAsyncThunk<
    { data: DebitMemo[]; pagination: any },
    { search?: string; page?: number; limit?: number } | void,
    { rejectValue: string }
>('raTracking/fetchOutstanding', async (params, { rejectWithValue }) => {
    try {
        const { apiClient } = await import('@/lib/api/apiClient');
        const q: Record<string, string> = {};
        if (params?.search) q.search = params.search;
        if (params?.page) q.page = String(params.page);
        if (params?.limit) q.limit = String(params.limit);
        const res = await apiClient.get<{ status: string; data: DebitMemo[]; pagination: any }>(
            '/admin/ra-tracking/outstanding', true, q
        );
        return { data: res.data, pagination: res.pagination };
    } catch (err: any) {
        return rejectWithValue(err?.message || 'Failed to fetch outstanding RAs');
    }
});

export const fetchOverdueRAs = createAsyncThunk<
    { data: DebitMemo[]; pagination: any },
    { search?: string; page?: number; limit?: number } | void,
    { rejectValue: string }
>('raTracking/fetchOverdue', async (params, { rejectWithValue }) => {
    try {
        const { apiClient } = await import('@/lib/api/apiClient');
        const q: Record<string, string> = {};
        if (params?.search) q.search = params.search;
        if (params?.page) q.page = String(params.page);
        if (params?.limit) q.limit = String(params.limit);
        const res = await apiClient.get<{ status: string; data: DebitMemo[]; pagination: any }>(
            '/admin/ra-tracking/overdue', true, q
        );
        return { data: res.data, pagination: res.pagination };
    } catch (err: any) {
        return rejectWithValue(err?.message || 'Failed to fetch overdue RAs');
    }
});

export const sendRARequest = createAsyncThunk<
    { memo: DebitMemo; request: RARequest },
    { memoId: string; sentBy?: string; emailOverride?: string },
    { rejectValue: string }
>('raTracking/sendRequest', async ({ memoId, sentBy, emailOverride }, { rejectWithValue }) => {
    try {
        const { apiClient } = await import('@/lib/api/apiClient');
        const res = await apiClient.post<{ status: string; data: { memo: DebitMemo; request: RARequest } }>(
            `/admin/debit-memos/${memoId}/request-ra`,
            { sentBy, emailOverride },
            true
        );
        return res.data;
    } catch (err: any) {
        return rejectWithValue(err?.message || 'Failed to send RA request');
    }
});

export const receiveRA = createAsyncThunk<
    DebitMemo,
    { memoId: string; raNumber: string; pdfUrl?: string },
    { rejectValue: string }
>('raTracking/receive', async ({ memoId, raNumber, pdfUrl }, { rejectWithValue }) => {
    try {
        const { apiClient } = await import('@/lib/api/apiClient');
        const res = await apiClient.post<{ status: string; data: DebitMemo }>(
            `/admin/debit-memos/${memoId}/receive-ra`,
            { raNumber, pdfUrl },
            true
        );
        return res.data;
    } catch (err: any) {
        return rejectWithValue(err?.message || 'Failed to record RA received');
    }
});

export const resendRA = createAsyncThunk<
    { memo: DebitMemo; request: RARequest },
    { memoId: string; sentBy?: string; emailOverride?: string },
    { rejectValue: string }
>('raTracking/resend', async ({ memoId, sentBy, emailOverride }, { rejectWithValue }) => {
    try {
        const { apiClient } = await import('@/lib/api/apiClient');
        const res = await apiClient.post<{ status: string; data: { memo: DebitMemo; request: RARequest } }>(
            `/admin/debit-memos/${memoId}/resend-ra`,
            { sentBy, emailOverride },
            true
        );
        return res.data;
    } catch (err: any) {
        return rejectWithValue(err?.message || 'Failed to resend RA request');
    }
});

export const shipMemo = createAsyncThunk<
    DebitMemo,
    { memoId: string; outboundTracking: string; shippedAt?: string },
    { rejectValue: string }
>('raTracking/ship', async ({ memoId, outboundTracking, shippedAt }, { rejectWithValue }) => {
    try {
        const { apiClient } = await import('@/lib/api/apiClient');
        const res = await apiClient.post<{ status: string; data: DebitMemo }>(
            `/admin/debit-memos/${memoId}/ship`,
            { outboundTracking, shippedAt },
            true
        );
        return res.data;
    } catch (err: any) {
        return rejectWithValue(err?.message || 'Failed to record shipment');
    }
});

export const createDebitMemoFedexShipment = createAsyncThunk<
    {
        memo: { id: string; memoNumber: string; destination: string };
        shipment: {
            masterTrackingNumber: string;
            shipmentId: string;
            packageCount: number;
            packages: { trackingNumber: string; hasLabel: boolean }[];
        };
        labels: Record<string, string>;
    },
    { memoId: string; boxCount?: number; packageWeight?: number; serviceType?: string },
    { rejectValue: string }
>('raTracking/createFedexShipment', async ({ memoId, boxCount, packageWeight, serviceType }, { rejectWithValue }) => {
    try {
        const { apiClient } = await import('@/lib/api/apiClient');
        const res = await apiClient.post<{ status: string; data: any }>(
            `/admin/debit-memos/${memoId}/create-fedex-shipment`,
            { boxCount, packageWeight, serviceType },
            true
        );
        return res.data;
    } catch (err: any) {
        return rejectWithValue(err?.message || 'Failed to create FedEx shipment');
    }
});

export const fetchEmailPreview = createAsyncThunk<
    RAEmailTemplate,
    { memoId: string; type?: 'request' | 'reminder'; emailOverride?: string },
    { rejectValue: string }
>('raTracking/emailPreview', async ({ memoId, type, emailOverride }, { rejectWithValue }) => {
    try {
        const { apiClient } = await import('@/lib/api/apiClient');
        const q: Record<string, string> = {};
        if (type) q.type = type;
        if (emailOverride) q.emailOverride = emailOverride;
        const res = await apiClient.get<{ status: string; data: RAEmailTemplate }>(
            `/admin/debit-memos/${memoId}/email-preview`, true, q
        );
        return res.data;
    } catch (err: any) {
        return rejectWithValue(err?.message || 'Failed to load email preview');
    }
});

// ── Slice ─────────────────────────────────────────────────────

const raTrackingSlice = createSlice({
    name: 'raTracking',
    initialState,
    reducers: {
        clearError: (state) => { state.error = null; },
        clearEmailPreview: (state) => { state.emailPreview = null; },
    },
    extraReducers: (builder) => {
        const updateMemoInList = (state: RATrackingState, updated: DebitMemo) => {
            state.memos = state.memos.map(m => m.id === updated.id ? updated : m);
        };

        builder
            .addCase(fetchRATracking.pending, (state) => { state.isLoading = true; state.error = null; })
            .addCase(fetchRATracking.fulfilled, (state, action) => {
                state.isLoading = false;
                state.memos = action.payload.data;
                state.pagination = action.payload.pagination;
                state.summary = action.payload.summary;
            })
            .addCase(fetchRATracking.rejected, (state, action) => { state.isLoading = false; state.error = action.payload as string; })

            .addCase(fetchOutstandingRAs.pending, (state) => { state.isLoading = true; state.error = null; })
            .addCase(fetchOutstandingRAs.fulfilled, (state, action) => { state.isLoading = false; state.memos = action.payload.data; state.pagination = action.payload.pagination; })
            .addCase(fetchOutstandingRAs.rejected, (state, action) => { state.isLoading = false; state.error = action.payload as string; })

            .addCase(fetchOverdueRAs.pending, (state) => { state.isLoading = true; state.error = null; })
            .addCase(fetchOverdueRAs.fulfilled, (state, action) => { state.isLoading = false; state.memos = action.payload.data; state.pagination = action.payload.pagination; })
            .addCase(fetchOverdueRAs.rejected, (state, action) => { state.isLoading = false; state.error = action.payload as string; })

            .addCase(sendRARequest.pending, (state) => { state.isActionLoading = true; state.error = null; })
            .addCase(sendRARequest.fulfilled, (state, action) => { state.isActionLoading = false; updateMemoInList(state, action.payload.memo); })
            .addCase(sendRARequest.rejected, (state, action) => { state.isActionLoading = false; state.error = action.payload as string; })

            .addCase(receiveRA.pending, (state) => { state.isActionLoading = true; state.error = null; })
            .addCase(receiveRA.fulfilled, (state, action) => { state.isActionLoading = false; updateMemoInList(state, action.payload); })
            .addCase(receiveRA.rejected, (state, action) => { state.isActionLoading = false; state.error = action.payload as string; })

            .addCase(resendRA.pending, (state) => { state.isActionLoading = true; state.error = null; })
            .addCase(resendRA.fulfilled, (state, action) => { state.isActionLoading = false; updateMemoInList(state, action.payload.memo); })
            .addCase(resendRA.rejected, (state, action) => { state.isActionLoading = false; state.error = action.payload as string; })

            .addCase(shipMemo.pending, (state) => { state.isActionLoading = true; state.error = null; })
            .addCase(shipMemo.fulfilled, (state, action) => { state.isActionLoading = false; updateMemoInList(state, action.payload); })
            .addCase(shipMemo.rejected, (state, action) => { state.isActionLoading = false; state.error = action.payload as string; })

            .addCase(createDebitMemoFedexShipment.pending, (state) => { state.isActionLoading = true; state.error = null; })
            .addCase(createDebitMemoFedexShipment.fulfilled, (state) => { state.isActionLoading = false; })
            .addCase(createDebitMemoFedexShipment.rejected, (state, action) => { state.isActionLoading = false; state.error = action.payload as string; })

            .addCase(fetchEmailPreview.pending, (state) => { state.isPreviewLoading = true; })
            .addCase(fetchEmailPreview.fulfilled, (state, action) => { state.isPreviewLoading = false; state.emailPreview = action.payload; })
            .addCase(fetchEmailPreview.rejected, (state, action) => { state.isPreviewLoading = false; state.error = action.payload as string; });
    },
});

export const { clearError, clearEmailPreview } = raTrackingSlice.actions;
export default raTrackingSlice.reducer;
