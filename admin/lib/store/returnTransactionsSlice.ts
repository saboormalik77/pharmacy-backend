import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import {
    ReturnTransaction,
    ReturnTransactionsListResponse,
    ReturnTransactionCreatePayload,
    ReturnTransactionUpdatePayload,
    ReturnTransactionsPagination,
    ProcessorMyStore,
    ReturnTransactionItem,
    ReturnTransactionItemsListResponse,
    AddItemPayload,
    BarcodeScanResponse,
    ReturnabilityCheckResult,
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
    // Items
    items: ReturnTransactionItem[];
    itemsSummary: {
        totalItems: number;
        totalReturnableValue: number;
        totalNonReturnableValue: number;
        totalValue: number;
    } | null;
    isItemsLoading: boolean;
    isItemActionLoading: boolean;
    isScanLoading: boolean;
    // General
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
    items: [],
    itemsSummary: null,
    isItemsLoading: false,
    isItemActionLoading: false,
    isScanLoading: false,
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
    async ({ id, fedexTracking, boxCount, prpNumber, packageTracking }: {
        id: string;
        fedexTracking?: string;
        boxCount?: number;
        prpNumber?: string;
        packageTracking?: Record<string, string>;
    }, { rejectWithValue }) => {
        try {
            const { apiClient } = await import('@/lib/api/apiClient');
            const { cookieUtils } = await import('@/lib/utils/cookies');
            if (!cookieUtils.getAuthToken()) return rejectWithValue('Authentication required.');

            const response = await apiClient.post<{ status: string; data: ReturnTransaction }>(
                `/return-transactions/${id}/finalize`,
                { fedexTracking, boxCount, prpNumber, packageTracking },
                true
            );
            return response.data;
        } catch (error: any) {
            return rejectWithValue(error?.message || 'Failed to finalize return transaction');
        }
    }
);

export const updateFinalizeSteps = createAsyncThunk(
    'returnTransactions/updateFinalizeSteps',
    async ({ id, steps }: { id: string; steps: Record<string, boolean> }, { rejectWithValue }) => {
        try {
            const { apiClient } = await import('@/lib/api/apiClient');
            const { cookieUtils } = await import('@/lib/utils/cookies');
            if (!cookieUtils.getAuthToken()) return rejectWithValue('Authentication required.');

            const response = await apiClient.patch<{ status: string; data: ReturnTransaction }>(
                `/return-transactions/${id}/finalize-steps`, { steps }, true
            );
            return response.data;
        } catch (error: any) {
            return rejectWithValue(error?.message || 'Failed to update finalize steps');
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

// ── FedEx API Thunks ─────────────────────────────────────────

export const createFedexShipment = createAsyncThunk(
    'returnTransactions/createFedexShipment',
    async ({ id, boxCount, packageWeight, serviceType }: {
        id: string;
        boxCount?: number;
        packageWeight?: number;
        serviceType?: string;
    }, { rejectWithValue }) => {
        try {
            const { apiClient } = await import('@/lib/api/apiClient');
            const { cookieUtils } = await import('@/lib/utils/cookies');
            if (!cookieUtils.getAuthToken()) return rejectWithValue('Authentication required.');

            const response = await apiClient.post<{
                status: string;
                data: {
                    transaction: ReturnTransaction;
                    shipment: {
                        masterTrackingNumber: string;
                        shipmentId: string;
                        packageCount: number;
                        packages: { trackingNumber: string; hasLabel: boolean }[];
                    };
                };
            }>(
                `/return-transactions/${id}/create-shipment`,
                { boxCount, packageWeight, serviceType },
                true
            );
            return response.data;
        } catch (error: any) {
            return rejectWithValue(error?.message || 'Failed to create FedEx shipment');
        }
    }
);

export const scheduleFedexPickup = createAsyncThunk(
    'returnTransactions/scheduleFedexPickup',
    async ({ id, readyTime, closeTime, pickupDate }: {
        id: string;
        readyTime?: string;
        closeTime?: string;
        pickupDate?: string;
    }, { rejectWithValue }) => {
        try {
            const { apiClient } = await import('@/lib/api/apiClient');
            const { cookieUtils } = await import('@/lib/utils/cookies');
            if (!cookieUtils.getAuthToken()) return rejectWithValue('Authentication required.');

            const response = await apiClient.post<{
                status: string;
                data: {
                    transaction: ReturnTransaction;
                    pickup: { pickupConfirmationNumber: string; pickupDate: string };
                };
            }>(
                `/return-transactions/${id}/schedule-pickup`,
                { readyTime, closeTime, pickupDate },
                true
            );
            return response.data;
        } catch (error: any) {
            return rejectWithValue(error?.message || 'Failed to schedule FedEx pickup');
        }
    }
);

export const cancelFedexShipment = createAsyncThunk(
    'returnTransactions/cancelFedexShipment',
    async (id: string, { rejectWithValue }) => {
        try {
            const { apiClient } = await import('@/lib/api/apiClient');
            const { cookieUtils } = await import('@/lib/utils/cookies');
            if (!cookieUtils.getAuthToken()) return rejectWithValue('Authentication required.');

            const response = await apiClient.delete<{ status: string; data: ReturnTransaction }>(
                `/return-transactions/${id}/cancel-shipment`,
                true
            );
            return response.data;
        } catch (error: any) {
            return rejectWithValue(error?.message || 'Failed to cancel FedEx shipment');
        }
    }
);

// ── Items Thunks ──────────────────────────────────────────────

export const scanBarcode = createAsyncThunk(
    'returnTransactions/scanBarcode',
    async (scanData: string, { rejectWithValue }) => {
        try {
            const { apiClient } = await import('@/lib/api/apiClient');
            const { cookieUtils } = await import('@/lib/utils/cookies');
            if (!cookieUtils.getAuthToken()) return rejectWithValue('Authentication required.');

            const response = await apiClient.post<{ status: string; data: BarcodeScanResponse }>(
                '/barcode/scan',
                { scanData },
                true
            );
            return response.data;
        } catch (error: any) {
            return rejectWithValue(error?.message || 'Failed to scan barcode');
        }
    }
);

export const fetchTransactionItems = createAsyncThunk(
    'returnTransactions/fetchItems',
    async ({ transactionId, returnStatus, search }: { transactionId: string; returnStatus?: string; search?: string }, { rejectWithValue }) => {
        try {
            const { apiClient } = await import('@/lib/api/apiClient');
            const { cookieUtils } = await import('@/lib/utils/cookies');
            if (!cookieUtils.getAuthToken()) return rejectWithValue('Authentication required.');

            const query: Record<string, string | undefined> = {};
            if (returnStatus) query.return_status = returnStatus;
            if (search) query.search = search;

            const response = await apiClient.get<{ status: string; data: ReturnTransactionItemsListResponse }>(
                `/return-transactions/${transactionId}/items`,
                true,
                query
            );
            return response.data;
        } catch (error: any) {
            return rejectWithValue(error?.message || 'Failed to fetch items');
        }
    }
);

export const addTransactionItem = createAsyncThunk(
    'returnTransactions/addItem',
    async ({ transactionId, payload }: { transactionId: string; payload: AddItemPayload }, { rejectWithValue }) => {
        try {
            const { apiClient } = await import('@/lib/api/apiClient');
            const { cookieUtils } = await import('@/lib/utils/cookies');
            if (!cookieUtils.getAuthToken()) return rejectWithValue('Authentication required.');

            const response = await apiClient.post<{
                status: string;
                data: ReturnTransactionItem;
                warning?: string;
                duplicateItemId?: string;
                policyCheck?: ReturnabilityCheckResult;
                wineCellarItem?: any;
            }>(
                `/return-transactions/${transactionId}/items`,
                payload,
                true
            );
            return { item: response.data, warning: response.warning, duplicateItemId: response.duplicateItemId, policyCheck: response.policyCheck, wineCellarItem: response.wineCellarItem };
        } catch (error: any) {
            return rejectWithValue(error?.message || 'Failed to add item');
        }
    }
);

export const moveItemToWineCellar = createAsyncThunk(
    'returnTransactions/moveToWineCellar',
    async ({ transactionId, itemId, expectedReturnableDate, notes }: { transactionId: string; itemId: string; expectedReturnableDate: string; notes?: string }, { rejectWithValue }) => {
        try {
            const { apiClient } = await import('@/lib/api/apiClient');
            const { cookieUtils } = await import('@/lib/utils/cookies');
            if (!cookieUtils.getAuthToken()) return rejectWithValue('Authentication required.');

            const response = await apiClient.post<{ status: string; data: any; message: string }>(
                `/return-transactions/${transactionId}/items/${itemId}/wine-cellar`,
                { expectedReturnableDate, notes },
                true
            );
            return response.data;
        } catch (error: any) {
            return rejectWithValue(error?.message || 'Failed to move item to wine cellar');
        }
    }
);

export const updateTransactionItem = createAsyncThunk(
    'returnTransactions/updateItem',
    async ({ transactionId, itemId, payload }: { transactionId: string; itemId: string; payload: Partial<AddItemPayload> }, { rejectWithValue }) => {
        try {
            const { apiClient } = await import('@/lib/api/apiClient');
            const { cookieUtils } = await import('@/lib/utils/cookies');
            if (!cookieUtils.getAuthToken()) return rejectWithValue('Authentication required.');

            const response = await apiClient.patch<{ status: string; data: ReturnTransactionItem }>(
                `/return-transactions/${transactionId}/items/${itemId}`,
                payload,
                true
            );
            return response.data;
        } catch (error: any) {
            return rejectWithValue(error?.message || 'Failed to update item');
        }
    }
);

export const resolveTransactionItem = createAsyncThunk(
    'returnTransactions/resolveItem',
    async ({ transactionId, itemId, payload }: { transactionId: string; itemId: string; payload: { new_status: string; reason?: string; destination?: string; memo?: string } }, { rejectWithValue }) => {
        try {
            const { apiClient } = await import('@/lib/api/apiClient');
            const { cookieUtils } = await import('@/lib/utils/cookies');
            if (!cookieUtils.getAuthToken()) return rejectWithValue('Authentication required.');

            const response = await apiClient.patch<{ status: string; data: ReturnTransactionItem }>(
                `/return-transactions/${transactionId}/items/${itemId}/resolve`,
                payload,
                true
            );
            return response.data;
        } catch (error: any) {
            return rejectWithValue(error?.message || 'Failed to resolve item');
        }
    }
);

export const deleteTransactionItem = createAsyncThunk(
    'returnTransactions/deleteItem',
    async ({ transactionId, itemId }: { transactionId: string; itemId: string }, { rejectWithValue }) => {
        try {
            const { apiClient } = await import('@/lib/api/apiClient');
            const { cookieUtils } = await import('@/lib/utils/cookies');
            if (!cookieUtils.getAuthToken()) return rejectWithValue('Authentication required.');

            await apiClient.delete<{ status: string }>(`/return-transactions/${transactionId}/items/${itemId}`, true);
            return itemId;
        } catch (error: any) {
            return rejectWithValue(error?.message || 'Failed to delete item');
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
        clearItems: (state) => {
            state.items = [];
            state.itemsSummary = null;
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
            .addCase(deleteReturnTransaction.rejected, (state, action) => { state.isActionLoading = false; state.error = action.payload as string; })

            // updateFinalizeSteps
            .addCase(updateFinalizeSteps.fulfilled, (state, action) => {
                if (action.payload) {
                    state.currentReturn = action.payload;
                    const idx = state.transactions.findIndex(t => t.id === action.payload.id);
                    if (idx >= 0) state.transactions[idx] = action.payload;
                }
            })

            // ── FedEx API ──────────────────────────────────

            // createFedexShipment
            .addCase(createFedexShipment.pending, (state) => { state.isActionLoading = true; state.error = null; })
            .addCase(createFedexShipment.fulfilled, (state, action) => {
                state.isActionLoading = false;
                const tx = action.payload.transaction;
                const idx = state.transactions.findIndex(t => t.id === tx.id);
                if (idx !== -1) state.transactions[idx] = tx;
                if (state.currentTransaction?.id === tx.id) state.currentTransaction = tx;
            })
            .addCase(createFedexShipment.rejected, (state, action) => { state.isActionLoading = false; state.error = action.payload as string; })

            // scheduleFedexPickup
            .addCase(scheduleFedexPickup.pending, (state) => { state.isActionLoading = true; state.error = null; })
            .addCase(scheduleFedexPickup.fulfilled, (state, action) => {
                state.isActionLoading = false;
                const tx = action.payload.transaction;
                const idx = state.transactions.findIndex(t => t.id === tx.id);
                if (idx !== -1) state.transactions[idx] = tx;
                if (state.currentTransaction?.id === tx.id) state.currentTransaction = tx;
            })
            .addCase(scheduleFedexPickup.rejected, (state, action) => { state.isActionLoading = false; state.error = action.payload as string; })

            // cancelFedexShipment
            .addCase(cancelFedexShipment.pending, (state) => { state.isActionLoading = true; state.error = null; })
            .addCase(cancelFedexShipment.fulfilled, (state, action) => {
                state.isActionLoading = false;
                const tx = action.payload;
                const idx = state.transactions.findIndex(t => t.id === tx.id);
                if (idx !== -1) state.transactions[idx] = tx;
                if (state.currentTransaction?.id === tx.id) state.currentTransaction = tx;
            })
            .addCase(cancelFedexShipment.rejected, (state, action) => { state.isActionLoading = false; state.error = action.payload as string; })

            // ── Items ─────────────────────────────────────

            // scanBarcode
            .addCase(scanBarcode.pending, (state) => { state.isScanLoading = true; state.error = null; })
            .addCase(scanBarcode.fulfilled, (state) => { state.isScanLoading = false; })
            .addCase(scanBarcode.rejected, (state, action) => { state.isScanLoading = false; state.error = action.payload as string; })

            // fetchTransactionItems
            .addCase(fetchTransactionItems.pending, (state) => { state.isItemsLoading = true; state.error = null; })
            .addCase(fetchTransactionItems.fulfilled, (state, action) => {
                state.isItemsLoading = false;
                state.items = action.payload.items || [];
                state.itemsSummary = action.payload.summary || null;
            })
            .addCase(fetchTransactionItems.rejected, (state, action) => { state.isItemsLoading = false; state.error = action.payload as string; })

            // addTransactionItem
            .addCase(addTransactionItem.pending, (state) => { state.isItemActionLoading = true; state.error = null; })
            .addCase(addTransactionItem.fulfilled, (state, action) => {
                state.isItemActionLoading = false;
                if (action.payload.item) state.items = [action.payload.item, ...state.items];
            })
            .addCase(addTransactionItem.rejected, (state, action) => { state.isItemActionLoading = false; state.error = action.payload as string; })

            // updateTransactionItem
            .addCase(updateTransactionItem.pending, (state) => { state.isItemActionLoading = true; state.error = null; })
            .addCase(updateTransactionItem.fulfilled, (state, action) => {
                state.isItemActionLoading = false;
                if (action.payload) {
                    state.items = state.items.map(i => i.id === action.payload.id ? action.payload : i);
                }
            })
            .addCase(updateTransactionItem.rejected, (state, action) => { state.isItemActionLoading = false; state.error = action.payload as string; })

            // resolveTransactionItem
            .addCase(resolveTransactionItem.pending, (state) => { state.isItemActionLoading = true; state.error = null; })
            .addCase(resolveTransactionItem.fulfilled, (state, action) => {
                state.isItemActionLoading = false;
                if (action.payload) {
                    state.items = state.items.map(i => i.id === action.payload.id ? action.payload : i);
                }
            })
            .addCase(resolveTransactionItem.rejected, (state, action) => { state.isItemActionLoading = false; state.error = action.payload as string; })

            // deleteTransactionItem
            .addCase(deleteTransactionItem.pending, (state) => { state.isItemActionLoading = true; })
            .addCase(deleteTransactionItem.fulfilled, (state, action) => {
                state.isItemActionLoading = false;
                state.items = state.items.filter(i => i.id !== action.payload);
            })
            .addCase(deleteTransactionItem.rejected, (state, action) => { state.isItemActionLoading = false; state.error = action.payload as string; });
    },
});

export const { setFilters, clearError, clearCurrentTransaction, clearItems } = returnTransactionsSlice.actions;
export default returnTransactionsSlice.reducer;
