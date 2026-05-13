import { supabaseAdmin } from '../config/supabase';
import { AppError } from '../utils/appError';

function ensureAdmin() {
  if (!supabaseAdmin) throw new AppError('Supabase admin client not configured', 500);
  return supabaseAdmin;
}

function handleRpcError(data: any, rpcError: any, label: string) {
  if (rpcError) throw new AppError(`${label}: ${rpcError.message}`, 400);
  if (!data) throw new AppError(`${label}: no data returned`, 500);
  if (data.error) throw new AppError(data.message || label, data.code || 400);
}

// ============================================================
// Returns Summary
// ============================================================

export const getReturnsSummary = async (filters: {
  periodStart?: string;
  periodEnd?: string;
  pharmacyId?: string;
  groupBy?: string;
  buyingGroupId?: string;
}) => {
  const sb = ensureAdmin();
  const { data, error } = await sb.rpc('analytics_returns_summary', {
    p_period_start: filters.periodStart || null,
    p_period_end: filters.periodEnd || null,
    p_pharmacy_id: filters.pharmacyId || null,
    p_group_by: filters.groupBy || 'month',
    p_buying_group_id: filters.buyingGroupId || null,
  });
  handleRpcError(data, error, 'Failed to fetch returns summary');
  return data.data;
};

// ============================================================
// Ask vs Received
// ============================================================

export const getAskVsReceived = async (filters: {
  groupBy?: string;
  batchId?: string;
  period?: string;
  page?: number;
  limit?: number;
  buyingGroupId?: string;
}) => {
  const sb = ensureAdmin();
  const { data, error } = await sb.rpc('analytics_ask_vs_received', {
    p_group_by: filters.groupBy || 'manufacturer',
    p_batch_id: filters.batchId || null,
    p_period: filters.period || null,
    p_page: filters.page || 1,
    p_limit: filters.limit || 50,
    p_buying_group_id: filters.buyingGroupId || null,
  });
  handleRpcError(data, error, 'Failed to fetch ask vs received analytics');
  return { data: data.data, totals: data.totals, pagination: data.pagination };
};

// ============================================================
// Aging Inventory (Wine Cellar)
// ============================================================

export const getAgingInventory = async (filters: {
  pharmacyId?: string;
  status?: string;
  page?: number;
  limit?: number;
  buyingGroupId?: string;
}) => {
  const sb = ensureAdmin();
  const { data, error } = await sb.rpc('analytics_aging_inventory', {
    p_pharmacy_id: filters.pharmacyId || null,
    p_status: filters.status || null,
    p_page: filters.page || 1,
    p_limit: filters.limit || 20,
    p_buying_group_id: filters.buyingGroupId || null,
  });
  handleRpcError(data, error, 'Failed to fetch aging inventory report');
  return {
    data: data.data,
    summary: data.summary,
    agingBuckets: data.agingBuckets,
    pagination: data.pagination,
  };
};

// ============================================================
// Outstanding RA
// ============================================================

export const getOutstandingRA = async (filters: {
  destination?: string;
  search?: string;
  page?: number;
  limit?: number;
  buyingGroupId?: string;
}) => {
  const sb = ensureAdmin();
  const { data, error } = await sb.rpc('analytics_outstanding_ra', {
    p_destination: filters.destination || null,
    p_search: filters.search || null,
    p_page: filters.page || 1,
    p_limit: filters.limit || 20,
    p_buying_group_id: filters.buyingGroupId || null,
  });
  handleRpcError(data, error, 'Failed to fetch outstanding RA report');
  return {
    data: data.data,
    summary: data.summary,
    agingBuckets: data.agingBuckets,
    pagination: data.pagination,
  };
};

// ============================================================
// Unpaid Memos
// ============================================================

export const getUnpaidMemos = async (filters: {
  manufacturer?: string;
  destination?: string;
  search?: string;
  page?: number;
  limit?: number;
  buyingGroupId?: string;
}) => {
  const sb = ensureAdmin();
  const { data, error } = await sb.rpc('analytics_unpaid_memos', {
    p_manufacturer: filters.manufacturer || null,
    p_destination: filters.destination || null,
    p_search: filters.search || null,
    p_page: filters.page || 1,
    p_limit: filters.limit || 20,
    p_buying_group_id: filters.buyingGroupId || null,
  });
  handleRpcError(data, error, 'Failed to fetch unpaid memos report');
  return {
    data: data.data,
    summary: data.summary,
    agingBuckets: data.agingBuckets,
    pagination: data.pagination,
  };
};

// ============================================================
// Price Audit Trail
// ============================================================

export const getPriceAudit = async (filters: {
  ndc?: string;
  source?: string;
  search?: string;
  page?: number;
  limit?: number;
  buyingGroupId?: string;
}) => {
  const sb = ensureAdmin();
  const { data, error } = await sb.rpc('analytics_price_audit', {
    p_ndc: filters.ndc || null,
    p_source: filters.source || null,
    p_search: filters.search || null,
    p_page: filters.page || 1,
    p_limit: filters.limit || 50,
    p_buying_group_id: filters.buyingGroupId || null,
  });
  handleRpcError(data, error, 'Failed to fetch price audit trail');
  return { data: data.data, summary: data.summary, pagination: data.pagination };
};

// ============================================================
// Pharmacy Performance
// ============================================================

export const getPharmacyPerformance = async (filters: {
  search?: string;
  sortBy?: string;
  sortDir?: string;
  page?: number;
  limit?: number;
  buyingGroupId?: string;
}) => {
  const sb = ensureAdmin();
  const { data, error } = await sb.rpc('analytics_pharmacy_performance', {
    p_search: filters.search || null,
    p_sort_by: filters.sortBy || 'totalValue',
    p_sort_dir: filters.sortDir || 'desc',
    p_page: filters.page || 1,
    p_limit: filters.limit || 20,
    p_buying_group_id: filters.buyingGroupId || null,
  });
  handleRpcError(data, error, 'Failed to fetch pharmacy performance report');
  return { data: data.data, overall: data.overall, pagination: data.pagination };
};

// ============================================================
// GPO Summary
// ============================================================

export const getGpoSummary = async (filters: {
  search?: string;
  page?: number;
  limit?: number;
  buyingGroupId?: string;
}) => {
  const sb = ensureAdmin();
  const { data, error } = await sb.rpc('analytics_gpo_summary', {
    p_search: filters.search || null,
    p_page: filters.page || 1,
    p_limit: filters.limit || 20,
    p_buying_group_id: filters.buyingGroupId || null,
  });
  handleRpcError(data, error, 'Failed to fetch GPO summary');
  return { data: data.data, pagination: data.pagination };
};

// ============================================================
// Pharmacy Dashboard (pharmacy-facing)
// ============================================================

export const getPharmacyDashboard = async (
  pharmacyId: string,
  periodStart?: string,
  periodEnd?: string
) => {
  const sb = ensureAdmin();
  const { data, error } = await sb.rpc('analytics_pharmacy_dashboard', {
    p_pharmacy_id: pharmacyId,
    p_period_start: periodStart || null,
    p_period_end: periodEnd || null,
  });
  handleRpcError(data, error, 'Failed to fetch pharmacy analytics');
  return data.data;
};
