import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';

export interface ProcessorNotification {
  id: string;
  type: string;
  title: string;
  message: string;
  entity_type: string | null;
  entity_id: string | null;
  metadata: Record<string, unknown>;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
}

interface ProcessorNotificationsState {
  notifications: ProcessorNotification[];
  unreadCount: number;
  pagination: {
    total: number;
    limit: number;
    offset: number;
    has_more: boolean;
  } | null;
  isLoading: boolean;
  error: string | null;
}

const initialState: ProcessorNotificationsState = {
  notifications: [],
  unreadCount: 0,
  pagination: null,
  isLoading: false,
  error: null,
};

export interface FetchProcessorNotificationsParams {
  limit?: number;
  offset?: number;
  onlyUnread?: boolean;
}

export const fetchProcessorNotifications = createAsyncThunk(
  'processorNotifications/fetch',
  async (params: FetchProcessorNotificationsParams = {}, { rejectWithValue }) => {
    try {
      if (typeof window === 'undefined') {
        return {
          notifications: [] as ProcessorNotification[],
          unread_count: 0,
          pagination: {
            total: 0,
            limit: params.limit ?? 20,
            offset: params.offset ?? 0,
            has_more: false,
          },
        };
      }

      const { apiClient } = await import('@/lib/api/apiClient');

      const queryParams: Record<string, string | number | undefined> = {};
      if (params.limit !== undefined) queryParams.limit = params.limit;
      if (params.offset !== undefined) queryParams.offset = params.offset;
      if (params.onlyUnread) queryParams.only_unread = 'true';

      const res = await apiClient.get<{
        status: string;
        data: {
          notifications: ProcessorNotification[];
          pagination: {
            total: number;
            limit: number;
            offset: number;
            has_more: boolean;
          };
          unread_count: number;
        };
      }>('/processors/notifications', true, queryParams);

      return res.data;
    } catch (error: any) {
      const msg =
        error?.message ||
        error?.data?.message ||
        'Failed to load processor notifications';
      return rejectWithValue(msg);
    }
  }
);

export const markProcessorNotificationRead = createAsyncThunk(
  'processorNotifications/markRead',
  async (notificationId: string, { rejectWithValue, dispatch }) => {
    try {
      if (typeof window === 'undefined') return { notificationId };

      const { apiClient } = await import('@/lib/api/apiClient');
      await apiClient.post(
        `/processors/notifications/${notificationId}/read`,
        {},
        true
      );

      dispatch(fetchProcessorNotifications({ limit: 20, offset: 0 }));
      return { notificationId };
    } catch (error: any) {
      const msg =
        error?.message ||
        error?.data?.message ||
        'Failed to mark notification as read';
      return rejectWithValue(msg);
    }
  }
);

export const markAllProcessorNotificationsRead = createAsyncThunk(
  'processorNotifications/markAllRead',
  async (_: void, { rejectWithValue, dispatch }) => {
    try {
      if (typeof window === 'undefined') return { success: true };

      const { apiClient } = await import('@/lib/api/apiClient');
      await apiClient.post('/processors/notifications/mark-all-read', {}, true);
      dispatch(fetchProcessorNotifications({ limit: 20, offset: 0 }));
      return { success: true };
    } catch (error: any) {
      const msg =
        error?.message ||
        error?.data?.message ||
        'Failed to mark all notifications as read';
      return rejectWithValue(msg);
    }
  }
);

const processorNotificationsSlice = createSlice({
  name: 'processorNotifications',
  initialState,
  reducers: {
    clearProcessorNotifications: (state) => {
      state.notifications = [];
      state.unreadCount = 0;
      state.pagination = null;
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchProcessorNotifications.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchProcessorNotifications.fulfilled, (state, action) => {
        state.isLoading = false;
        state.notifications = action.payload.notifications;
        state.unreadCount = action.payload.unread_count ?? 0;
        state.pagination = action.payload.pagination ?? null;
        state.error = null;
      })
      .addCase(fetchProcessorNotifications.rejected, (state, action) => {
        state.isLoading = false;
        state.error = (action.payload as string) || action.error.message || 'Failed';
      });
  },
});

export const { clearProcessorNotifications } = processorNotificationsSlice.actions;
export default processorNotificationsSlice.reducer;
