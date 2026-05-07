import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { apiClient } from '../api/apiClient';

// ============================================================
// Types
// ============================================================

export interface EmailLog {
  id: string;
  raRequestId: string;
  resendEmailId: string | null;
  emailType: string;
  recipientEmail: string;
  subject: string | null;
  status: 'sent' | 'delivered' | 'bounced' | 'failed' | 'complained';
  sentAt: string;
  deliveredAt: string | null;
  bouncedAt: string | null;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
  // From memo info join
  debitMemoId?: string;
  memoNumber?: string;
  pharmacyName?: string;
  destination?: string;
  labelerName?: string;
  totalAskValue?: number;
}

export interface EmailStats {
  total_sent: number;
  delivered: number;
  bounced: number;
  failed: number;
  pending: number;
  delivery_rate: number;
  bounce_rate: number;
}

export interface EmailHealthReport {
  overall: EmailStats;
  byType: { [key: string]: EmailStats };
  recentIssues: EmailLog[];
  recommendations: string[];
}

interface EmailManagementState {
  // Email logs
  logs: EmailLog[];
  logsLoading: boolean;
  logsError: string | null;
  logsPagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  
  // Email stats
  stats: EmailStats | null;
  statsLoading: boolean;
  statsError: string | null;
  
  // Email health
  health: EmailHealthReport | null;
  healthLoading: boolean;
  healthError: string | null;
  
  // Actions
  isActionLoading: boolean;
  actionError: string | null;
  
  // Filters
  filters: {
    status: string;
    emailType: string;
    dateFrom: string;
    dateTo: string;
    search: string;
  };
}

const initialState: EmailManagementState = {
  logs: [],
  logsLoading: false,
  logsError: null,
  logsPagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
  
  stats: null,
  statsLoading: false,
  statsError: null,
  
  health: null,
  healthLoading: false,
  healthError: null,
  
  isActionLoading: false,
  actionError: null,
  
  filters: {
    status: '',
    emailType: '',
    dateFrom: '',
    dateTo: '',
    search: '',
  },
};

// ============================================================
// Async Thunks
// ============================================================

export const fetchEmailLogs = createAsyncThunk<
  { data: EmailLog[]; pagination: any },
  { page?: number; limit?: number; filters?: Partial<EmailManagementState['filters']> }
>('emailManagement/fetchLogs', async ({ page = 1, limit = 20, filters = {} }, { rejectWithValue }) => {
  try {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      ...(filters.status && { status: filters.status }),
      ...(filters.emailType && { emailType: filters.emailType }),
      ...(filters.dateFrom && { dateFrom: filters.dateFrom }),
      ...(filters.dateTo && { dateTo: filters.dateTo }),
      ...(filters.search && { search: filters.search }),
    });

    const response = await apiClient.get<{
      status: string;
      data: EmailLog[];
      pagination: any;
    }>(`/admin/emails/logs?${params}`, true);

    return {
      data: response.data,
      pagination: response.pagination,
    };
  } catch (err: any) {
    return rejectWithValue(err?.message || 'Failed to fetch email logs');
  }
});

export const fetchEmailStats = createAsyncThunk<
  EmailStats,
  { dateFrom?: string; dateTo?: string }
>('emailManagement/fetchStats', async ({ dateFrom, dateTo }, { rejectWithValue }) => {
  try {
    const params = new URLSearchParams({
      ...(dateFrom && { dateFrom }),
      ...(dateTo && { dateTo }),
    });

    const response = await apiClient.get<{
      status: string;
      data: EmailStats;
    }>(`/admin/emails/stats?${params}`, true);

    return response.data;
  } catch (err: any) {
    return rejectWithValue(err?.message || 'Failed to fetch email stats');
  }
});

export const fetchEmailHealth = createAsyncThunk<EmailHealthReport, void>(
  'emailManagement/fetchHealth',
  async (_, { rejectWithValue }) => {
    try {
      const response = await apiClient.get<{
        status: string;
        data: EmailHealthReport;
      }>('/admin/emails/health', true);

      return response.data;
    } catch (err: any) {
      return rejectWithValue(err?.message || 'Failed to fetch email health');
    }
  }
);

export const sendTestEmail = createAsyncThunk<
  { emailId: string; recipient: string; templateType: string },
  { to: string; templateType: 'ra-request' | 'ra-reminder' }
>('emailManagement/sendTest', async ({ to, templateType }, { rejectWithValue }) => {
  try {
    const response = await apiClient.post<{
      status: string;
      data: { emailId: string; recipient: string; templateType: string };
      message: string;
    }>('/admin/emails/test', { to, templateType }, true);

    return response.data;
  } catch (err: any) {
    return rejectWithValue(err?.message || 'Failed to send test email');
  }
});

export const retryEmail = createAsyncThunk<
  { success: boolean; newEmailId?: string },
  string
>('emailManagement/retry', async (emailLogId, { rejectWithValue }) => {
  try {
    const response = await apiClient.post<{
      status: string;
      data: { success: boolean; newEmailId?: string };
      message: string;
    }>(`/admin/emails/logs/${emailLogId}/retry`, {}, true);

    return response.data;
  } catch (err: any) {
    return rejectWithValue(err?.message || 'Failed to retry email');
  }
});

export const resolveEmail = createAsyncThunk<
  void,
  { emailLogId: string; notes?: string }
>('emailManagement/resolve', async ({ emailLogId, notes }, { rejectWithValue }) => {
  try {
    await apiClient.post<{
      status: string;
      message: string;
    }>(`/admin/emails/logs/${emailLogId}/resolve`, { notes }, true);
  } catch (err: any) {
    return rejectWithValue(err?.message || 'Failed to resolve email');
  }
});

// ============================================================
// Slice
// ============================================================

const emailManagementSlice = createSlice({
  name: 'emailManagement',
  initialState,
  reducers: {
    setFilters: (state, action) => {
      state.filters = { ...state.filters, ...action.payload };
    },
    clearFilters: (state) => {
      state.filters = initialState.filters;
    },
    clearErrors: (state) => {
      state.logsError = null;
      state.statsError = null;
      state.healthError = null;
      state.actionError = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch email logs
      .addCase(fetchEmailLogs.pending, (state) => {
        state.logsLoading = true;
        state.logsError = null;
      })
      .addCase(fetchEmailLogs.fulfilled, (state, action) => {
        state.logsLoading = false;
        state.logs = action.payload.data;
        state.logsPagination = action.payload.pagination;
      })
      .addCase(fetchEmailLogs.rejected, (state, action) => {
        state.logsLoading = false;
        state.logsError = action.payload as string;
      })
      
      // Fetch email stats
      .addCase(fetchEmailStats.pending, (state) => {
        state.statsLoading = true;
        state.statsError = null;
      })
      .addCase(fetchEmailStats.fulfilled, (state, action) => {
        state.statsLoading = false;
        state.stats = action.payload;
      })
      .addCase(fetchEmailStats.rejected, (state, action) => {
        state.statsLoading = false;
        state.statsError = action.payload as string;
      })
      
      // Fetch email health
      .addCase(fetchEmailHealth.pending, (state) => {
        state.healthLoading = true;
        state.healthError = null;
      })
      .addCase(fetchEmailHealth.fulfilled, (state, action) => {
        state.healthLoading = false;
        state.health = action.payload;
      })
      .addCase(fetchEmailHealth.rejected, (state, action) => {
        state.healthLoading = false;
        state.healthError = action.payload as string;
      })
      
      // Send test email
      .addCase(sendTestEmail.pending, (state) => {
        state.isActionLoading = true;
        state.actionError = null;
      })
      .addCase(sendTestEmail.fulfilled, (state) => {
        state.isActionLoading = false;
      })
      .addCase(sendTestEmail.rejected, (state, action) => {
        state.isActionLoading = false;
        state.actionError = action.payload as string;
      })
      
      // Retry email
      .addCase(retryEmail.pending, (state) => {
        state.isActionLoading = true;
        state.actionError = null;
      })
      .addCase(retryEmail.fulfilled, (state) => {
        state.isActionLoading = false;
      })
      .addCase(retryEmail.rejected, (state, action) => {
        state.isActionLoading = false;
        state.actionError = action.payload as string;
      })
      
      // Resolve email
      .addCase(resolveEmail.pending, (state) => {
        state.isActionLoading = true;
        state.actionError = null;
      })
      .addCase(resolveEmail.fulfilled, (state) => {
        state.isActionLoading = false;
      })
      .addCase(resolveEmail.rejected, (state, action) => {
        state.isActionLoading = false;
        state.actionError = action.payload as string;
      });
  },
});

export const { setFilters, clearFilters, clearErrors } = emailManagementSlice.actions;
export default emailManagementSlice.reducer;