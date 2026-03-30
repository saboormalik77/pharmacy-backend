import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { DebitMemo, ShipmentGroup, CreateShipmentGroupRequest, ShipGroupRequest } from '@/lib/types';

// ── State ─────────────────────────────────────────────────────

export interface ShippedGroupRow {
    group: ShipmentGroup;
    memos: DebitMemo[];
}

export interface ShipmentGroupState {
    availableMemos: DebitMemo[];
    currentGroup: ShipmentGroup | null;
    groupMemos: DebitMemo[];
    shippedGroups: ShippedGroupRow[];
    shippedPagination: { page: number; limit: number; total: number; totalPages: number } | null;
    isLoading: boolean;
    isActionLoading: boolean;
    error: string | null;
}

const initialState: ShipmentGroupState = {
    availableMemos: [],
    currentGroup: null,
    groupMemos: [],
    shippedGroups: [],
    shippedPagination: null,
    isLoading: false,
    isActionLoading: false,
    error: null,
};

// ── Thunks ────────────────────────────────────────────────────

export const fetchAvailableMemosForGrouping = createAsyncThunk<
    DebitMemo[],
    { destination?: string } | void,
    { rejectValue: string }
>('shipmentGroup/fetchAvailableMemos', async (params, { rejectWithValue }) => {
    try {
        const { apiClient } = await import('@/lib/api/apiClient');
        const queryParams: Record<string, string> = {};
        if (params?.destination?.trim()) queryParams.destination = params.destination.trim();
        
        const res = await apiClient.get<{ status: string; data: DebitMemo[] }>(
            '/admin/shipment-groups/available-memos',
            true,
            queryParams
        );
        return res.data;
    } catch (err: any) {
        return rejectWithValue(err?.message || 'Failed to fetch available memos');
    }
});

export const createShipmentGroup = createAsyncThunk<
    { group: ShipmentGroup; memoIds: string[]; memoCount: number },
    CreateShipmentGroupRequest,
    { rejectValue: string }
>('shipmentGroup/create', async (request, { rejectWithValue }) => {
    try {
        const { apiClient } = await import('@/lib/api/apiClient');
        const res = await apiClient.post<{ 
            status: string; 
            data: { group: ShipmentGroup; memoIds: string[]; memoCount: number } 
        }>('/admin/shipment-groups', request, true);
        return res.data;
    } catch (err: any) {
        return rejectWithValue(err?.message || 'Failed to create shipment group');
    }
});

export const fetchShipmentGroupDetails = createAsyncThunk<
    { group: ShipmentGroup; memos: DebitMemo[] },
    string,
    { rejectValue: string }
>('shipmentGroup/fetchDetails', async (groupId, { rejectWithValue }) => {
    try {
        const { apiClient } = await import('@/lib/api/apiClient');
        const res = await apiClient.get<{ 
            status: string; 
            data: { group: ShipmentGroup; memos: DebitMemo[] } 
        }>(`/admin/shipment-groups/${groupId}`, true);
        return res.data;
    } catch (err: any) {
        return rejectWithValue(err?.message || 'Failed to fetch shipment group details');
    }
});

export const shipGroup = createAsyncThunk<
    { group: ShipmentGroup; memosShipped: number },
    { groupId: string } & ShipGroupRequest,
    { rejectValue: string }
>('shipmentGroup/ship', async ({ groupId, ...request }, { rejectWithValue }) => {
    try {
        const { apiClient } = await import('@/lib/api/apiClient');
        const res = await apiClient.post<{ 
            status: string; 
            data: { group: ShipmentGroup; memosShipped: number } 
        }>(`/admin/shipment-groups/${groupId}/ship`, request, true);
        return res.data;
    } catch (err: any) {
        return rejectWithValue(err?.message || 'Failed to ship group');
    }
});

export type GroupFedexShipmentPayload = {
    group: ShipmentGroup;
    memos: DebitMemo[];
    shipment: {
        masterTrackingNumber: string;
        shipmentId: string;
        packageCount: number;
        packages: { trackingNumber: string; hasLabel: boolean }[];
    };
    labels: Record<string, string>;
};

export const createGroupFedexShipment = createAsyncThunk<
    GroupFedexShipmentPayload,
    { groupId: string; boxCount: number; packageWeight?: number; serviceType?: string },
    { rejectValue: string }
>('shipmentGroup/createFedexShipment', async ({ groupId, ...request }, { rejectWithValue }) => {
    try {
        const { apiClient } = await import('@/lib/api/apiClient');
        const res = await apiClient.post<{ status: string; data: GroupFedexShipmentPayload }>(
            `/admin/shipment-groups/${groupId}/create-fedex-shipment`,
            request,
            true
        );
        return res.data;
    } catch (err: any) {
        return rejectWithValue(err?.message || 'Failed to create FedEx shipment for group');
    }
});

export const fetchShippedShipmentGroups = createAsyncThunk<
    { data: ShippedGroupRow[]; pagination: ShipmentGroupState['shippedPagination'] },
    { page?: number; limit?: number; destination?: string } | void,
    { rejectValue: string }
>('shipmentGroup/fetchShipped', async (params, { rejectWithValue }) => {
    try {
        const { apiClient } = await import('@/lib/api/apiClient');
        const q: Record<string, string> = {};
        if (params?.page) q.page = String(params.page);
        if (params?.limit) q.limit = String(params.limit);
        if (params?.destination?.trim()) q.destination = params.destination.trim();
        const res = await apiClient.get<{
            status: string;
            data: ShippedGroupRow[];
            pagination?: ShipmentGroupState['shippedPagination'];
        }>('/admin/shipment-groups/shipped', true, q);
        return { data: res.data ?? [], pagination: res.pagination ?? null };
    } catch (err: any) {
        return rejectWithValue(err?.message || 'Failed to fetch shipped groups');
    }
});

export const scheduleShipmentGroupPickup = createAsyncThunk<
    { group: { id: string }; pickup: { pickupConfirmationNumber: string; pickupDate: string } },
    { groupId: string; readyTime?: string; closeTime?: string; pickupDate?: string },
    { rejectValue: string }
>('shipmentGroup/schedulePickup', async ({ groupId, ...body }, { rejectWithValue }) => {
    try {
        const { apiClient } = await import('@/lib/api/apiClient');
        const res = await apiClient.post<{
            status: string;
            data: { group: { id: string }; pickup: { pickupConfirmationNumber: string; pickupDate: string } };
        }>(`/admin/shipment-groups/${groupId}/schedule-pickup`, body, true);
        return res.data;
    } catch (err: any) {
        return rejectWithValue(err?.message || 'Failed to schedule pickup');
    }
});

// ── Slice ─────────────────────────────────────────────────────

const shipmentGroupSlice = createSlice({
    name: 'shipmentGroup',
    initialState,
    reducers: {
        clearError: (state) => {
            state.error = null;
        },
        clearCurrentGroup: (state) => {
            state.currentGroup = null;
            state.groupMemos = [];
        },
        removeFromAvailableMemos: (state, action) => {
            const memoIds = action.payload;
            state.availableMemos = state.availableMemos.filter(
                memo => !memoIds.includes(memo.id)
            );
        },
    },
    extraReducers: (builder) => {
        builder
            // Fetch available memos
            .addCase(fetchAvailableMemosForGrouping.pending, (state) => {
                state.isLoading = true;
                state.error = null;
            })
            .addCase(fetchAvailableMemosForGrouping.fulfilled, (state, action) => {
                state.isLoading = false;
                state.availableMemos = action.payload;
            })
            .addCase(fetchAvailableMemosForGrouping.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.payload as string;
            })

            // Create shipment group
            .addCase(createShipmentGroup.pending, (state) => {
                state.isActionLoading = true;
                state.error = null;
            })
            .addCase(createShipmentGroup.fulfilled, (state, action) => {
                state.isActionLoading = false;
                state.currentGroup = action.payload.group;
                // Remove grouped memos from available list
                state.availableMemos = state.availableMemos.filter(
                    memo => !action.payload.memoIds.includes(memo.id)
                );
            })
            .addCase(createShipmentGroup.rejected, (state, action) => {
                state.isActionLoading = false;
                state.error = action.payload as string;
            })

            // Fetch group details
            .addCase(fetchShipmentGroupDetails.pending, (state) => {
                state.isLoading = true;
                state.error = null;
            })
            .addCase(fetchShipmentGroupDetails.fulfilled, (state, action) => {
                state.isLoading = false;
                state.currentGroup = action.payload.group;
                state.groupMemos = action.payload.memos;
            })
            .addCase(fetchShipmentGroupDetails.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.payload as string;
            })

            // Ship group
            .addCase(shipGroup.pending, (state) => {
                state.isActionLoading = true;
                state.error = null;
            })
            .addCase(shipGroup.fulfilled, (state, action) => {
                state.isActionLoading = false;
                state.currentGroup = action.payload.group;
            })
            .addCase(shipGroup.rejected, (state, action) => {
                state.isActionLoading = false;
                state.error = action.payload as string;
            })

            // Create FedEx shipment
            .addCase(createGroupFedexShipment.pending, (state) => {
                state.isActionLoading = true;
                state.error = null;
            })
            .addCase(createGroupFedexShipment.fulfilled, (state, action) => {
                state.isActionLoading = false;
                state.currentGroup = action.payload.group;
                state.groupMemos = action.payload.memos;
            })
            .addCase(createGroupFedexShipment.rejected, (state, action) => {
                state.isActionLoading = false;
                state.error = action.payload as string;
            })

            .addCase(fetchShippedShipmentGroups.pending, (state) => {
                state.isLoading = true;
                state.error = null;
            })
            .addCase(fetchShippedShipmentGroups.fulfilled, (state, action) => {
                state.isLoading = false;
                state.shippedGroups = action.payload.data;
                state.shippedPagination = action.payload.pagination;
            })
            .addCase(fetchShippedShipmentGroups.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.payload as string;
            })

            .addCase(scheduleShipmentGroupPickup.pending, (state) => {
                state.isActionLoading = true;
                state.error = null;
            })
            .addCase(scheduleShipmentGroupPickup.fulfilled, (state) => {
                state.isActionLoading = false;
            })
            .addCase(scheduleShipmentGroupPickup.rejected, (state, action) => {
                state.isActionLoading = false;
                state.error = action.payload as string;
            });
    },
});

export const { clearError, clearCurrentGroup, removeFromAvailableMemos } = shipmentGroupSlice.actions;
export default shipmentGroupSlice.reducer;