import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import {
    ReturnTransaction,
    ReturnTransactionsListResponse,
    ReturnTransactionCreatePayload,
    ReturnTransactionUpdatePayload,
    ReturnTransactionsPagination,
    ProcessorMyStore,
} from '@/lib/types';

// ── State ─────────────────────────────────────────────────────

export interface ReturnTransactionsState {
    transactions: ReturnTransaction[];
    currentTransaction: ReturnTransaction | null;
    myStores: ProcessorMyStore[];
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
        status: string;
        pharmacyId: string;
        dateFrom: string;
        dateTo: string;
    };
    isLoading: boolean;
    isStoresLoading: boolean;
    isActionLoading: boolean;
    error: string | null;
}

const initialState: ReturnTransactionsState = {
    transactions: [],
    currentTransaction: null,
    myStores: [],
    pagination: null,
    filters: { search: '', status: '', pharmacyId: '', dateFrom: '', dateTo: '' },
    isLoading: false,
    isStoresLoading: false,
    isActionLoading: false,
    error: null,
};

// ── Thunks ────────────────────────────────────────────────────

export interface FetchReturnTransactionsParams {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
    pharmacyId?: string;
    dateFrom?: string;
    dateTo?: string;
}

export const fetchMyStores = createAsyncThunk(
    'returnTransactions/fetchMyStores',
    async (_, { rejectWithValue }) => {
        try {
            const { apiClient } = await import('@/lib/api/apiClient');
            const { cookieUtils } = await import('@/lib/utils/cookies');
            if (!cookieUtils.getAuthToken()) return rejectWithValue('Authentication required.');

            const response = await apiClient.get<{
                status: string;
                data: { stores: ProcessorMyStore[]; total: number };
            }>('/processors/my-stores', true);
            return response.data.stores;
        } catch (error: any) {
            return rejectWithValue(error?.message || 'Failed to fetch assigned stores');
        }
    }
);

export const fetchReturnTransactions = createAsyncThunk(
    'returnTransactions/fetch',
    async (params: FetchReturnTransactionsParams = {}, { rejectWithValue }) => {
        try {
            const { apiClient } = await import('@/lib/api/apiClient');
            const { cookieUtils } = await import('@/lib/utils/cookies');
            if (!cookieUtils.getAuthToken()) return rejectWithValue('Authentication required.');

            const query: Record<string, string | number | undefined> = {};
            if (params.page !== undefined) query.page = params.page;
            if (params.limit !== undefined) query.limit = params.limit;
            if (params.search) query.search = params.search;
            if (params.status) query.status = params.status;
            if (params.pharmacyId) query.pharmacy_id = params.pharmacyId;
            if (params.dateFrom) query.date_from = params.dateFrom;
            if (params.dateTo) query.date_to = params.dateTo;

            const response = await apiClient.get<ReturnTransactionsListResponse>(
                '/return-transactions',
                true,
                query
            );
            return response.data;
        } catch (error: any) {
            return rejectWithValue(error?.message || 'Failed to fetch return transactions');
        }
    }
);

export const fetchReturnTransactionById = createAsyncThunk(
    'returnTransactions/fetchById',
    async (id: string, { rejectWithValue }) => {
        try {
            const { apiClient } = await import('@/lib/api/apiClient');
            const { cookieUtils } = await import('@/lib/utils/cookies');
            if (!cookieUtils.getAuthToken()) return rejectWithValue('Authentication required.');

            const response = await apiClient.get<{ status: string; data: ReturnTransaction }>(
                `/return-transactions/${id}`,
                true
            );
            return response.data;
        } catch (error: any) {
            return rejectWithValue(error?.message || 'Failed to fetch return transaction');
        }
    }
);

export const createReturnTransaction = createAsyncThunk(
    'returnTransactions/create',
    async (payload: ReturnTransactionCreatePayload, { rejectWithValue }) => {
        try {
            const { apiClient } = await import('@/lib/api/apiClient');
            const { cookieUtils } = await import('@/lib/utils/cookies');
            if (!cookieUtils.getAuthToken()) return rejectWithValue('Authentication required.');

            const response = await apiClient.post<{ status: string; data: ReturnTransaction }>(
                '/return-transactions',
                payload,
                true
            );
            return response.data;
        } catch (error: any) {
            return rejectWithValue(error?.message || 'Failed to create return transaction');
        }
    }
);

export const updateReturnTransaction = createAsyncThunk(
    'returnTransactions/update',
    async ({ id, payload }: { id: string; payload: ReturnTransactionUpdatePayload }, { rejectWithValue }) => {
        try {
            const { apiClient } = await import('@/lib/api/apiClient');
            const { cookieUtils } = await import('@/lib/utils/cookies');
            if (!cookieUtils.getAuthToken()) return rejectWithValue('Authentication required.');

            const response = await apiClient.patch<{ status: string; data: ReturnTransaction }>(
                `/return-transactions/${id}`,
                payload,
                true
            );
            return response.data;
        } catch (error: any) {
            return rejectWithValue(error?.message || 'Failed to update return transaction');
        }
    }
);

export const pauseReturnTransaction = createAsyncThunk(
    'returnTransactions/pause',
    async (id: string, { rejectWithValue }) => {
        try {
            const { apiClient } = await import('@/lib/api/apiClient');
            const { cookieUtils } = await import('@/lib/utils/cookies');
            if (!cookieUtils.getAuthToken()) return rejectWithValue('Authentication required.');

            const response = await apiClient.post<{ status: string; data: ReturnTransaction }>(
                `/return-transactions/${id}/pause`,
                {},
                true
            );
            return response.data;
        } catch (error: any) {
            return rejectWithValue(error?.message || 'Failed to pause return transaction');
        }
    }
);

export const resumeReturnTransaction = createAsyncThunk(
    'returnTransactions/resume',
    async (id: string, { rejectWithValue }) => {
        try {
            const { apiClient } = await import('@/lib/api/apiClient');
            const { cookieUtils } = await import('@/lib/utils/cookies');
            if (!cookieUtils.getAuthToken()) return rejectWithValue('Authentication required.');

            const response = await apiClient.post<{ status: string; data: ReturnTransaction }>(
                `/return-transactions/${id}/resume`,
                {},
                true
            );
            return response.data;
        } catch (error: any) {
            return rejectWithValue(error?.message || 'Failed to resume return transaction');
        }
    }
);

export const completeReturnTransaction = createAsyncThunk(
    'returnTransactions/complete',
    async (id: string, { rejectWithValue }) => {
        try {
            const { apiClient } = await import('@/lib/api/apiClient');
            const { cookieUtils } = await import('@/lib/utils/cookies');
            if (!cookieUtils.getAuthToken()) return rejectWithValue('Authentication required.');

            const response = await apiClient.post<{ status: string; data: ReturnTransaction }>(
                `/return-transactions/${id}/complete`,
                {},
                true
            );
            return response.data;
        } catch (error: any) {
            return rejectWithValue(error?.message || 'Failed to complete return transaction');
        }
    }
);

export const finalizeReturnTransaction = createAsyncThunk(
    'returnTransactions/finalize',
    async (id: string, { rejectWithValue }) => {
        try {
            const { apiClient } = await import('@/lib/api/apiClient');
            const { cookieUtils } = await import('@/lib/utils/cookies');
            if (!cookieUtils.getAuthToken()) return rejectWithValue('Authentication required.');

            const response = await apiClient.post<{ status: string; data: ReturnTransaction }>(
                `/return-transactions/${id}/finalize`,
                {},
                true
            );
            return response.data;
        } catch (error: any) {
            return rejectWithValue(error?.message || 'Failed to finalize return transaction');
        }
    }
);

export const deleteReturnTransaction = createAsyncThunk(
    'returnTransactions/delete',
    async (id: string, { rejectWithValue }) => {
        try {
            const { apiClient } = await import('@/lib/api/apiClient');
            const { cookieUtils } = await import('@/lib/utils/cookies');
            if (!cookieUtils.getAuthToken()) return rejectWithValue('Authentication required.');

            await apiClient.delete<{ status: string }>(`/return-transactions/${id}`, true);
            return id;
        } catch (error: any) {
            return rejectWithValue(error?.message || 'Failed to delete return transaction');
        }
    }
);

// ── Slice ─────────────────────────────────────────────────────

const returnTransactionsSlice = createSlice({
    name: 'returnTransactions',
    initialState,
    reducers: {
        setFilters: (state, action: PayloadAction<Partial<ReturnTransactionsState['filters']>>) => {
            state.filters = { ...state.filters, ...action.payload };
        },
        clearError: (state) => {
            state.error = null;
        },
        clearCurrentTransaction: (state) => {
            state.currentTransaction = null;
        },
    },
    extraReducers: (builder) => {
        builder
            // fetchMyStores
            .addCase(fetchMyStores.pending, (state) => { state.isStoresLoading = true; state.error = null; })
            .addCase(fetchMyStores.fulfilled, (state, action) => {
                state.isStoresLoading = false;
                state.myStores = action.payload || [];
            })
            .addCase(fetchMyStores.rejected, (state, action) => { state.isStoresLoading = false; state.error = action.payload as string; })

            // fetchReturnTransactions
            .addCase(fetchReturnTransactions.pending, (state) => { state.isLoading = true; state.error = null; })
            .addCase(fetchReturnTransactions.fulfilled, (state, action) => {
                state.isLoading = false;
                state.transactions = action.payload.transactions || [];
                const p = action.payload.pagination;
                state.pagination = p
                    ? { page: p.page, limit: p.limit, totalCount: p.total, totalPages: p.totalPages, hasNextPage: p.page < p.totalPages, hasPreviousPage: p.page > 1 }
                    : null;
                state.error = null;
            })
            .addCase(fetchReturnTransactions.rejected, (state, action) => { state.isLoading = false; state.error = action.payload as string; })

            // fetchReturnTransactionById
            .addCase(fetchReturnTransactionById.pending, (state) => { state.isLoading = true; state.error = null; })
            .addCase(fetchReturnTransactionById.fulfilled, (state, action) => {
                state.isLoading = false;
                state.currentTransaction = action.payload;
                state.error = null;
            })
            .addCase(fetchReturnTransactionById.rejected, (state, action) => { state.isLoading = false; state.error = action.payload as string; })

            // createReturnTransaction
            .addCase(createReturnTransaction.pending, (state) => { state.isActionLoading = true; state.error = null; })
            .addCase(createReturnTransaction.fulfilled, (state, action) => {
                state.isActionLoading = false;
                if (action.payload) state.transactions = [action.payload, ...state.transactions];
                state.error = null;
            })
            .addCase(createReturnTransaction.rejected, (state, action) => { state.isActionLoading = false; state.error = action.payload as string; })

            // updateReturnTransaction
            .addCase(updateReturnTransaction.pending, (state) => { state.isActionLoading = true; state.error = null; })
            .addCase(updateReturnTransaction.fulfilled, (state, action) => {
                state.isActionLoading = false;
                if (action.payload) {
                    state.transactions = state.transactions.map(t => t.id === action.payload.id ? action.payload : t);
                    if (state.currentTransaction?.id === action.payload.id) state.currentTransaction = action.payload;
                }
                state.error = null;
            })
            .addCase(updateReturnTransaction.rejected, (state, action) => { state.isActionLoading = false; state.error = action.payload as string; })

            // pause
            .addCase(pauseReturnTransaction.pending, (state) => { state.isActionLoading = true; })
            .addCase(pauseReturnTransaction.fulfilled, (state, action) => {
                state.isActionLoading = false;
                if (action.payload) {
                    state.transactions = state.transactions.map(t => t.id === action.payload.id ? action.payload : t);
                }
            })
            .addCase(pauseReturnTransaction.rejected, (state, action) => { state.isActionLoading = false; state.error = action.payload as string; })

            // resume
            .addCase(resumeReturnTransaction.pending, (state) => { state.isActionLoading = true; })
            .addCase(resumeReturnTransaction.fulfilled, (state, action) => {
                state.isActionLoading = false;
                if (action.payload) {
                    state.transactions = state.transactions.map(t => t.id === action.payload.id ? action.payload : t);
                }
            })
            .addCase(resumeReturnTransaction.rejected, (state, action) => { state.isActionLoading = false; state.error = action.payload as string; })

            // complete
            .addCase(completeReturnTransaction.pending, (state) => { state.isActionLoading = true; })
            .addCase(completeReturnTransaction.fulfilled, (state, action) => {
                state.isActionLoading = false;
                if (action.payload) {
                    state.transactions = state.transactions.map(t => t.id === action.payload.id ? action.payload : t);
                }
            })
            .addCase(completeReturnTransaction.rejected, (state, action) => { state.isActionLoading = false; state.error = action.payload as string; })

            // finalize
            .addCase(finalizeReturnTransaction.pending, (state) => { state.isActionLoading = true; })
            .addCase(finalizeReturnTransaction.fulfilled, (state, action) => {
                state.isActionLoading = false;
                if (action.payload) {
                    state.transactions = state.transactions.map(t => t.id === action.payload.id ? action.payload : t);
                }
            })
            .addCase(finalizeReturnTransaction.rejected, (state, action) => { state.isActionLoading = false; state.error = action.payload as string; })

            // delete
            .addCase(deleteReturnTransaction.pending, (state) => { state.isActionLoading = true; })
            .addCase(deleteReturnTransaction.fulfilled, (state, action) => {
                state.isActionLoading = false;
                state.transactions = state.transactions.filter(t => t.id !== action.payload);
            })
            .addCase(deleteReturnTransaction.rejected, (state, action) => { state.isActionLoading = false; state.error = action.payload as string; });
    },
});

export const { setFilters, clearError, clearCurrentTransaction } = returnTransactionsSlice.actions;
export default returnTransactionsSlice.reducer;
