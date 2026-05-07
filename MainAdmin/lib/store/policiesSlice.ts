import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import {
    ManufacturerPolicy,
    PoliciesListResponse,
    ManufacturerPolicyCreatePayload,
    ReturnPolicyCreatePayload,
    ReturnPolicyRecord,
    NonReturnableProduct,
    NonReturnableProductPayload,
    PolicyNote,
    PolicyNotePayload,
    ReturnabilityCheckResult,
} from '@/lib/types';

// ── State ─────────────────────────────────────────────────────

export interface PoliciesState {
    policies: ManufacturerPolicy[];
    currentPolicy: ManufacturerPolicy | null;
    pagination: { page: number; limit: number; total: number; totalPages: number } | null;
    filters: { search: string; labelerType: string; destination: string };
    isLoading: boolean;
    isActionLoading: boolean;
    error: string | null;
}

const initialState: PoliciesState = {
    policies: [],
    currentPolicy: null,
    pagination: null,
    filters: { search: '', labelerType: '', destination: '' },
    isLoading: false,
    isActionLoading: false,
    error: null,
};

// ── Thunks ────────────────────────────────────────────────────

export interface FetchPoliciesParams {
    page?: number;
    limit?: number;
    search?: string;
    labelerType?: string;
    destination?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
}

export const fetchPolicies = createAsyncThunk(
    'policies/fetch',
    async (params: FetchPoliciesParams = {}, { rejectWithValue }) => {
        try {
            const { apiClient } = await import('@/lib/api/apiClient');
            const query: Record<string, string | number | undefined> = {};
            if (params.page !== undefined) query.page = params.page;
            if (params.limit !== undefined) query.limit = params.limit;
            if (params.search) query.search = params.search;
            if (params.labelerType && params.labelerType !== 'all') query.labelerType = params.labelerType;
            if (params.destination && params.destination !== 'all') query.destination = params.destination;
            if (params.sortBy) query.sortBy = params.sortBy;
            if (params.sortOrder) query.sortOrder = params.sortOrder;

            const response = await apiClient.get<{ status: string; data: PoliciesListResponse }>(
                '/admin/policies', true, query
            );
            return response.data;
        } catch (error: any) {
            return rejectWithValue(error?.message || 'Failed to fetch policies');
        }
    }
);

export const fetchPolicyById = createAsyncThunk(
    'policies/fetchById',
    async (id: string, { rejectWithValue }) => {
        try {
            const { apiClient } = await import('@/lib/api/apiClient');
            const response = await apiClient.get<{ status: string; data: ManufacturerPolicy }>(
                `/admin/policies/${id}`, true
            );
            return response.data;
        } catch (error: any) {
            return rejectWithValue(error?.message || 'Failed to fetch policy');
        }
    }
);

export const createPolicy = createAsyncThunk(
    'policies/create',
    async (payload: ManufacturerPolicyCreatePayload, { rejectWithValue }) => {
        try {
            const { apiClient } = await import('@/lib/api/apiClient');
            const response = await apiClient.post<{ status: string; data: ManufacturerPolicy }>(
                '/admin/policies', payload, true
            );
            return response.data;
        } catch (error: any) {
            return rejectWithValue(error?.message || 'Failed to create policy');
        }
    }
);

export const updatePolicy = createAsyncThunk(
    'policies/update',
    async ({ id, payload }: { id: string; payload: Partial<ManufacturerPolicyCreatePayload> }, { rejectWithValue }) => {
        try {
            const { apiClient } = await import('@/lib/api/apiClient');
            const response = await apiClient.patch<{ status: string; data: ManufacturerPolicy }>(
                `/admin/policies/${id}`, payload, true
            );
            return response.data;
        } catch (error: any) {
            return rejectWithValue(error?.message || 'Failed to update policy');
        }
    }
);

export const deletePolicy = createAsyncThunk(
    'policies/delete',
    async (id: string, { rejectWithValue }) => {
        try {
            const { apiClient } = await import('@/lib/api/apiClient');
            await apiClient.delete<{ status: string }>(`/admin/policies/${id}`, true);
            return id;
        } catch (error: any) {
            return rejectWithValue(error?.message || 'Failed to delete policy');
        }
    }
);

// ── Return Policies ───────────────────────────────────────────

export const addReturnPolicy = createAsyncThunk(
    'policies/addReturnPolicy',
    async ({ policyId, payload }: { policyId: string; payload: ReturnPolicyCreatePayload }, { rejectWithValue }) => {
        try {
            const { apiClient } = await import('@/lib/api/apiClient');
            const response = await apiClient.post<{ status: string; data: ReturnPolicyRecord }>(
                `/admin/policies/${policyId}/return-policies`, payload, true
            );
            return response.data;
        } catch (error: any) {
            return rejectWithValue(error?.message || 'Failed to add return policy');
        }
    }
);

export const updateReturnPolicy = createAsyncThunk(
    'policies/updateReturnPolicy',
    async ({ policyId, returnPolicyId, payload }: { policyId: string; returnPolicyId: string; payload: Partial<ReturnPolicyCreatePayload> }, { rejectWithValue }) => {
        try {
            const { apiClient } = await import('@/lib/api/apiClient');
            const response = await apiClient.patch<{ status: string; data: ReturnPolicyRecord }>(
                `/admin/policies/${policyId}/return-policies/${returnPolicyId}`, payload, true
            );
            return response.data;
        } catch (error: any) {
            return rejectWithValue(error?.message || 'Failed to update return policy');
        }
    }
);

export const deleteReturnPolicy = createAsyncThunk(
    'policies/deleteReturnPolicy',
    async ({ policyId, returnPolicyId }: { policyId: string; returnPolicyId: string }, { rejectWithValue }) => {
        try {
            const { apiClient } = await import('@/lib/api/apiClient');
            await apiClient.delete<{ status: string }>(`/admin/policies/${policyId}/return-policies/${returnPolicyId}`, true);
            return returnPolicyId;
        } catch (error: any) {
            return rejectWithValue(error?.message || 'Failed to delete return policy');
        }
    }
);

// ── Exceptions ────────────────────────────────────────────────

export const addException = createAsyncThunk(
    'policies/addException',
    async ({ policyId, payload }: { policyId: string; payload: NonReturnableProductPayload }, { rejectWithValue }) => {
        try {
            const { apiClient } = await import('@/lib/api/apiClient');
            const response = await apiClient.post<{ status: string; data: NonReturnableProduct }>(
                `/admin/policies/${policyId}/exceptions`, payload, true
            );
            return response.data;
        } catch (error: any) {
            return rejectWithValue(error?.message || 'Failed to add exception');
        }
    }
);

export const deleteException = createAsyncThunk(
    'policies/deleteException',
    async ({ policyId, exceptionId }: { policyId: string; exceptionId: string }, { rejectWithValue }) => {
        try {
            const { apiClient } = await import('@/lib/api/apiClient');
            await apiClient.delete<{ status: string }>(`/admin/policies/${policyId}/exceptions/${exceptionId}`, true);
            return exceptionId;
        } catch (error: any) {
            return rejectWithValue(error?.message || 'Failed to delete exception');
        }
    }
);

// ── Notes ─────────────────────────────────────────────────────

export const addNote = createAsyncThunk(
    'policies/addNote',
    async ({ policyId, payload }: { policyId: string; payload: PolicyNotePayload }, { rejectWithValue }) => {
        try {
            const { apiClient } = await import('@/lib/api/apiClient');
            const response = await apiClient.post<{ status: string; data: PolicyNote }>(
                `/admin/policies/${policyId}/notes`, payload, true
            );
            return response.data;
        } catch (error: any) {
            return rejectWithValue(error?.message || 'Failed to add note');
        }
    }
);

export const deleteNote = createAsyncThunk(
    'policies/deleteNote',
    async ({ policyId, noteId }: { policyId: string; noteId: string }, { rejectWithValue }) => {
        try {
            const { apiClient } = await import('@/lib/api/apiClient');
            await apiClient.delete<{ status: string }>(`/admin/policies/${policyId}/notes/${noteId}`, true);
            return noteId;
        } catch (error: any) {
            return rejectWithValue(error?.message || 'Failed to delete note');
        }
    }
);

// ── Policy Check ──────────────────────────────────────────────

export const checkReturnability = createAsyncThunk(
    'policies/checkReturnability',
    async (payload: { ndc: string; expirationDate: string; isPartial?: boolean; dosageForm?: string }, { rejectWithValue }) => {
        try {
            const { apiClient } = await import('@/lib/api/apiClient');
            const response = await apiClient.post<{ status: string; data: ReturnabilityCheckResult }>(
                '/policies/check', payload, true
            );
            return response.data;
        } catch (error: any) {
            return rejectWithValue(error?.message || 'Failed to check returnability');
        }
    }
);

// ── Slice ─────────────────────────────────────────────────────

const policiesSlice = createSlice({
    name: 'policies',
    initialState,
    reducers: {
        setFilters: (state, action: PayloadAction<Partial<PoliciesState['filters']>>) => {
            state.filters = { ...state.filters, ...action.payload };
        },
        clearError: (state) => { state.error = null; },
        clearCurrentPolicy: (state) => { state.currentPolicy = null; },
    },
    extraReducers: (builder) => {
        builder
            // fetchPolicies
            .addCase(fetchPolicies.pending, (state) => { state.isLoading = true; state.error = null; })
            .addCase(fetchPolicies.fulfilled, (state, action) => {
                state.isLoading = false;
                state.policies = action.payload.policies || [];
                state.pagination = action.payload.pagination || null;
            })
            .addCase(fetchPolicies.rejected, (state, action) => { state.isLoading = false; state.error = action.payload as string; })

            // fetchPolicyById
            .addCase(fetchPolicyById.pending, (state) => { state.isLoading = true; state.error = null; })
            .addCase(fetchPolicyById.fulfilled, (state, action) => {
                state.isLoading = false;
                state.currentPolicy = action.payload;
            })
            .addCase(fetchPolicyById.rejected, (state, action) => { state.isLoading = false; state.error = action.payload as string; })

            // createPolicy
            .addCase(createPolicy.pending, (state) => { state.isActionLoading = true; state.error = null; })
            .addCase(createPolicy.fulfilled, (state, action) => {
                state.isActionLoading = false;
                if (action.payload) state.policies = [action.payload, ...state.policies];
            })
            .addCase(createPolicy.rejected, (state, action) => { state.isActionLoading = false; state.error = action.payload as string; })

            // updatePolicy
            .addCase(updatePolicy.pending, (state) => { state.isActionLoading = true; state.error = null; })
            .addCase(updatePolicy.fulfilled, (state, action) => {
                state.isActionLoading = false;
                if (action.payload) {
                    state.policies = state.policies.map(p => p.id === action.payload.id ? { ...p, ...action.payload } : p);
                    if (state.currentPolicy?.id === action.payload.id) {
                        state.currentPolicy = { ...state.currentPolicy, ...action.payload };
                    }
                }
            })
            .addCase(updatePolicy.rejected, (state, action) => { state.isActionLoading = false; state.error = action.payload as string; })

            // deletePolicy
            .addCase(deletePolicy.pending, (state) => { state.isActionLoading = true; })
            .addCase(deletePolicy.fulfilled, (state, action) => {
                state.isActionLoading = false;
                state.policies = state.policies.filter(p => p.id !== action.payload);
            })
            .addCase(deletePolicy.rejected, (state, action) => { state.isActionLoading = false; state.error = action.payload as string; })

            // addReturnPolicy
            .addCase(addReturnPolicy.pending, (state) => { state.isActionLoading = true; })
            .addCase(addReturnPolicy.fulfilled, (state, action) => {
                state.isActionLoading = false;
                if (state.currentPolicy && action.payload) {
                    state.currentPolicy.returnPolicies = [...(state.currentPolicy.returnPolicies || []), action.payload];
                }
            })
            .addCase(addReturnPolicy.rejected, (state, action) => { state.isActionLoading = false; state.error = action.payload as string; })

            // updateReturnPolicy
            .addCase(updateReturnPolicy.pending, (state) => { state.isActionLoading = true; })
            .addCase(updateReturnPolicy.fulfilled, (state, action) => {
                state.isActionLoading = false;
                if (state.currentPolicy && action.payload) {
                    state.currentPolicy.returnPolicies = (state.currentPolicy.returnPolicies || []).map(
                        rp => rp.id === action.payload.id ? action.payload : rp
                    );
                }
            })
            .addCase(updateReturnPolicy.rejected, (state, action) => { state.isActionLoading = false; state.error = action.payload as string; })

            // deleteReturnPolicy
            .addCase(deleteReturnPolicy.pending, (state) => { state.isActionLoading = true; })
            .addCase(deleteReturnPolicy.fulfilled, (state, action) => {
                state.isActionLoading = false;
                if (state.currentPolicy) {
                    state.currentPolicy.returnPolicies = (state.currentPolicy.returnPolicies || []).filter(rp => rp.id !== action.payload);
                }
            })
            .addCase(deleteReturnPolicy.rejected, (state, action) => { state.isActionLoading = false; state.error = action.payload as string; })

            // addException
            .addCase(addException.pending, (state) => { state.isActionLoading = true; })
            .addCase(addException.fulfilled, (state, action) => {
                state.isActionLoading = false;
                if (state.currentPolicy && action.payload) {
                    state.currentPolicy.exceptions = [...(state.currentPolicy.exceptions || []), action.payload];
                }
            })
            .addCase(addException.rejected, (state, action) => { state.isActionLoading = false; state.error = action.payload as string; })

            // deleteException
            .addCase(deleteException.pending, (state) => { state.isActionLoading = true; })
            .addCase(deleteException.fulfilled, (state, action) => {
                state.isActionLoading = false;
                if (state.currentPolicy) {
                    state.currentPolicy.exceptions = (state.currentPolicy.exceptions || []).filter(e => e.id !== action.payload);
                }
            })
            .addCase(deleteException.rejected, (state, action) => { state.isActionLoading = false; state.error = action.payload as string; })

            // addNote
            .addCase(addNote.pending, (state) => { state.isActionLoading = true; })
            .addCase(addNote.fulfilled, (state, action) => {
                state.isActionLoading = false;
                if (state.currentPolicy && action.payload) {
                    state.currentPolicy.notes = [...(state.currentPolicy.notes || []), action.payload];
                }
            })
            .addCase(addNote.rejected, (state, action) => { state.isActionLoading = false; state.error = action.payload as string; })

            // deleteNote
            .addCase(deleteNote.pending, (state) => { state.isActionLoading = true; })
            .addCase(deleteNote.fulfilled, (state, action) => {
                state.isActionLoading = false;
                if (state.currentPolicy) {
                    state.currentPolicy.notes = (state.currentPolicy.notes || []).filter(n => n.id !== action.payload);
                }
            })
            .addCase(deleteNote.rejected, (state, action) => { state.isActionLoading = false; state.error = action.payload as string; });
    },
});

export const { setFilters, clearError, clearCurrentPolicy } = policiesSlice.actions;
export default policiesSlice.reducer;
