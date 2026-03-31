import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { ApiClient } from '@/lib/api/apiClient';
import { ReturnBatch, ReturnTransaction } from '@/lib/types';

// Types
export interface PharmacyPayment {
    id: string;
    pharmacyId: string;
    pharmacyName: string;
    batchId: string;
    batchName: string;
    batchMonth: string;
    totalCreditReceived: number;
    companyFee: number;
    companyFeePercent: number;
    gpoShare: number;
    gpoName: string | null;
    pharmacyPayout: number;
    paymentMethod: 'wire' | 'check' | 'zelle' | 'cash' | null;
    paymentReference: string | null;
    paidAt: string | null;
    status: 'pending' | 'processing' | 'paid' | 'failed' | 'disputed';
    notes: string | null;
    createdBy: string | null;
    createdAt: string;
    updatedAt: string;
    debitMemos?: DebitMemo[];
}

export interface DebitMemo {
    id: string;
    memoNumber: string;
    labelerName: string;
    destination: string;
    totalItems: number;
    amountRequested: number;
    amountReceived: number;
    paymentStatus: string;
}

export interface PaymentCalculation {
    pharmacyId: string;
    pharmacyName: string;
    batchId: string;
    batchName: string;
    gpoName: string | null;
    totalCreditReceived: number;
    memoCount: number;
    companyFeePercent: number;
    companyFee: number;
    gpoSharePercent: number;
    gpoShare: number;
    pharmacyPayout: number;
}

export interface PharmacyPaymentSummary {
    totalPayments: number;
    totalCreditReceived: number;
    totalCompanyFee: number;
    totalGpoShare: number;
    totalPharmacyPayout: number;
    paidCount: number;
    pendingCount: number;
    processingCount: number;
}

export interface Pagination {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
}

export interface BatchPharmacy {
    id: string;
    name: string;
    /** True when a non-failed pharmacy_payments row exists for this batch (already recorded). */
    payoutRecorded: boolean;
    /** True when all debit memos for this pharmacy in the batch are paid or partial. */
    debitMemosPaidForPayout: boolean;
}

export interface PharmacyPaymentsState {
    payments: PharmacyPayment[];
    currentPayment: PharmacyPayment | null;
    calculation: PaymentCalculation | null;
    summary: PharmacyPaymentSummary | null;
    pagination: Pagination;
    filters: {
        status: string;
        pharmacy: string;
        search: string;
        startDate: string;
        endDate: string;
    };
    openBatches: ReturnBatch[];
    batchPharmacies: BatchPharmacy[];
    isLoadingOpenBatches: boolean;
    isLoadingBatchPharmacies: boolean;
    isLoading: boolean;
    isCalculating: boolean;
    isCreating: boolean;
    isUpdating: boolean;
    error: string | null;
}

const initialState: PharmacyPaymentsState = {
    payments: [],
    currentPayment: null,
    calculation: null,
    summary: null,
    pagination: {
        page: 1,
        limit: 20,
        total: 0,
        totalPages: 0,
    },
    filters: {
        status: '',
        pharmacy: '',
        search: '',
        startDate: '',
        endDate: '',
    },
    openBatches: [],
    batchPharmacies: [],
    isLoadingOpenBatches: false,
    isLoadingBatchPharmacies: false,
    isLoading: false,
    isCalculating: false,
    isCreating: false,
    isUpdating: false,
    error: null,
};

const apiClient = new ApiClient();

// Async thunks
export const fetchPharmacyPayments = createAsyncThunk(
    'pharmacyPayments/fetchList',
    async (params: {
        page?: number;
        limit?: number;
        status?: string;
        pharmacy?: string;
        search?: string;
    }) => {
        const queryParams = new URLSearchParams();
        if (params.page) queryParams.append('page', params.page.toString());
        if (params.limit) queryParams.append('limit', params.limit.toString());
        if (params.status) queryParams.append('status', params.status);
        if (params.pharmacy) queryParams.append('pharmacy', params.pharmacy);
        if (params.search) queryParams.append('search', params.search);

        return apiClient.get<{
            data: PharmacyPayment[];
            pagination: Pagination;
            summary: PharmacyPaymentSummary;
        }>(`/admin/pharmacy-payments?${queryParams}`);
    }
);

export const fetchPharmacyPayment = createAsyncThunk(
    'pharmacyPayments/fetchOne',
    async (id: string) => {
        return apiClient.get<{ data: PharmacyPayment }>(`/admin/pharmacy-payments/${id}`);
    }
);

export const calculatePayout = createAsyncThunk(
    'pharmacyPayments/calculate',
    async (params: {
        pharmacyId: string;
        batchId: string;
        companyFeePercent?: number;
        gpoSharePercent?: number;
    }) => {
        return apiClient.post<{ data: PaymentCalculation }>('/admin/pharmacy-payments/calculate', params);
    }
);

export const createPharmacyPayment = createAsyncThunk(
    'pharmacyPayments/create',
    async (data: {
        pharmacyId: string;
        batchId: string;
        totalCreditReceived: number;
        companyFeePercent: number;
        companyFee: number;
        gpoShare: number;
        pharmacyPayout: number;
        notes?: string;
    }) => {
        return apiClient.post<{ data: PharmacyPayment }>('/admin/pharmacy-payments', data);
    }
);

// Fetch closed batches eligible for pharmacy payout (shipped memos, RD payment recorded, payout remaining)
export const fetchOpenBatches = createAsyncThunk(
    'pharmacyPayments/fetchOpenBatches',
    async () => {
        const q = new URLSearchParams({
            status: 'closed',
            limit: '100',
            page: '1',
            allMemosShipped: 'true',
            excludeCompletePharmacyPayouts: 'true',
            allDebitMemosPaid: 'true',
        });
        return apiClient.get<{ data: ReturnBatch[]; pagination: any }>(`/admin/batches?${q}`, true);
    }
);

// Pharmacies in the batch whose debit memos are all paid/partial (RD side); includes those with payout already recorded (disabled in UI).
export const fetchBatchPharmacies = createAsyncThunk(
    'pharmacyPayments/fetchBatchPharmacies',
    async (batchId: string) => {
        const [batchRes, payRes] = await Promise.all([
            apiClient.get<{
                status: string;
                data: {
                    batch: ReturnBatch;
                    returns: ReturnTransaction[];
                    debitMemos?: { pharmacyId?: string; pharmacyName?: string; paymentStatus?: string }[];
                };
            }>(`/admin/batches/${batchId}`, true),
            apiClient.get<{ status: string; data: PharmacyPayment[] }>('/admin/pharmacy-payments', true, {
                batch_id: batchId,
                limit: 500,
                page: 1,
            }),
        ]);
        const inner = batchRes.data;
        const returns: ReturnTransaction[] = inner?.returns || [];
        const memos = inner?.debitMemos || [];
        const seen = new Set<string>();
        const pharmacies: { id: string; name: string }[] = [];
        for (const rt of returns) {
            if (rt.pharmacyId && !seen.has(rt.pharmacyId)) {
                seen.add(rt.pharmacyId);
                pharmacies.push({ id: rt.pharmacyId, name: rt.pharmacyName || rt.pharmacyId });
            }
        }
        for (const m of memos) {
            const pid = m.pharmacyId;
            if (pid && !seen.has(pid)) {
                seen.add(pid);
                pharmacies.push({ id: pid, name: m.pharmacyName || pid });
            }
        }
        const settledPharmacyIds = new Set(
            (payRes.data || [])
                .filter((p) => p.status !== 'failed')
                .map((p) => p.pharmacyId)
        );

        const pharmacyMemosPaidForPayout = (pharmacyId: string): boolean => {
            const mine = memos.filter((m) => m.pharmacyId === pharmacyId);
            if (mine.length === 0) return false;
            return mine.every((m) => {
                const s = (m.paymentStatus || '').toLowerCase();
                return s === 'paid' || s === 'partial';
            });
        };

        const withFlags: BatchPharmacy[] = pharmacies.map((p) => ({
            id: p.id,
            name: p.name,
            payoutRecorded: settledPharmacyIds.has(p.id),
            debitMemosPaidForPayout: pharmacyMemosPaidForPayout(p.id),
        }));

        const paidReadyOnly = withFlags.filter((p) => p.debitMemosPaidForPayout);
        paidReadyOnly.sort((a, b) => {
            if (a.payoutRecorded !== b.payoutRecorded) return a.payoutRecorded ? 1 : -1;
            return a.name.localeCompare(b.name);
        });
        return paidReadyOnly;
    }
);

export const updatePharmacyPayment = createAsyncThunk(
    'pharmacyPayments/update',
    async ({ id, updates }: {
        id: string;
        updates: {
            status?: string;
            paymentMethod?: string;
            paymentReference?: string;
            notes?: string;
            companyFee?: number;
            gpoShare?: number;
            pharmacyPayout?: number;
        };
    }) => {
        return apiClient.patch<{ data: PharmacyPayment }>(`/admin/pharmacy-payments/${id}`, updates);
    }
);

const pharmacyPaymentsSlice = createSlice({
    name: 'pharmacyPayments',
    initialState,
    reducers: {
        setFilters: (state, action: PayloadAction<Partial<PharmacyPaymentsState['filters']>>) => {
            state.filters = { ...state.filters, ...action.payload };
        },
        clearCurrentPayment: (state) => {
            state.currentPayment = null;
        },
        clearCalculation: (state) => {
            state.calculation = null;
        },
        clearBatchPharmacies: (state) => {
            state.batchPharmacies = [];
        },
        clearError: (state) => {
            state.error = null;
        },
    },
    extraReducers: (builder) => {
        // Fetch payments list
        builder
            .addCase(fetchPharmacyPayments.pending, (state) => {
                state.isLoading = true;
                state.error = null;
            })
            .addCase(fetchPharmacyPayments.fulfilled, (state, action) => {
                state.isLoading = false;
                state.payments = action.payload.data;
                state.pagination = action.payload.pagination;
                state.summary = action.payload.summary;
            })
            .addCase(fetchPharmacyPayments.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.error.message || 'Failed to fetch pharmacy payments';
            });

        // Fetch single payment
        builder
            .addCase(fetchPharmacyPayment.pending, (state) => {
                state.isLoading = true;
                state.error = null;
            })
            .addCase(fetchPharmacyPayment.fulfilled, (state, action) => {
                state.isLoading = false;
                state.currentPayment = action.payload.data;
            })
            .addCase(fetchPharmacyPayment.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.error.message || 'Failed to fetch payment details';
            });

        // Calculate payout
        builder
            .addCase(calculatePayout.pending, (state) => {
                state.isCalculating = true;
                state.error = null;
            })
            .addCase(calculatePayout.fulfilled, (state, action) => {
                state.isCalculating = false;
                state.calculation = action.payload.data;
            })
            .addCase(calculatePayout.rejected, (state, action) => {
                state.isCalculating = false;
                state.error = action.error.message || 'Failed to calculate payout';
            });

        // Create payment
        builder
            .addCase(createPharmacyPayment.pending, (state) => {
                state.isCreating = true;
                state.error = null;
            })
            .addCase(createPharmacyPayment.fulfilled, (state, action) => {
                state.isCreating = false;
                state.payments.unshift(action.payload.data);
                state.calculation = null;
            })
            .addCase(createPharmacyPayment.rejected, (state, action) => {
                state.isCreating = false;
                state.error = action.error.message || 'Failed to create payment';
            });

        // Update payment
        builder
            .addCase(updatePharmacyPayment.pending, (state) => {
                state.isUpdating = true;
                state.error = null;
            })
            .addCase(updatePharmacyPayment.fulfilled, (state, action) => {
                state.isUpdating = false;
                const index = state.payments.findIndex(p => p.id === action.payload.data.id);
                if (index !== -1) {
                    state.payments[index] = action.payload.data;
                }
                if (state.currentPayment?.id === action.payload.data.id) {
                    state.currentPayment = action.payload.data;
                }
            })
            .addCase(updatePharmacyPayment.rejected, (state, action) => {
                state.isUpdating = false;
                state.error = action.error.message || 'Failed to update payment';
            });

        // Fetch open batches
        builder
            .addCase(fetchOpenBatches.pending, (state) => { state.isLoadingOpenBatches = true; })
            .addCase(fetchOpenBatches.fulfilled, (state, action) => {
                state.isLoadingOpenBatches = false;
                state.openBatches = action.payload.data || [];
            })
            .addCase(fetchOpenBatches.rejected, (state) => { state.isLoadingOpenBatches = false; });

        // Fetch pharmacies in a batch
        builder
            .addCase(fetchBatchPharmacies.pending, (state) => { state.isLoadingBatchPharmacies = true; state.batchPharmacies = []; })
            .addCase(fetchBatchPharmacies.fulfilled, (state, action) => {
                state.isLoadingBatchPharmacies = false;
                state.batchPharmacies = action.payload;
            })
            .addCase(fetchBatchPharmacies.rejected, (state) => { state.isLoadingBatchPharmacies = false; });
    },
});

export const { setFilters, clearCurrentPayment, clearCalculation, clearBatchPharmacies, clearError } = pharmacyPaymentsSlice.actions;
export default pharmacyPaymentsSlice.reducer;