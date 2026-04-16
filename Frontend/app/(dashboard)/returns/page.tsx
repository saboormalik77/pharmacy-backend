'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PermissionGuard } from '@/components/shared/PermissionGuard';
import { Badge } from '@/components/ui/Badge';
import { ToastContainer, Toast } from '@/components/ui/Toast';
import {
    Search, Plus, ChevronLeft, ChevronRight, Loader2, AlertCircle,
    Eye, X, Trash2, Edit,
    ClipboardList, DollarSign, Play, CheckCircle,
} from 'lucide-react';
import { apiClient } from '@/lib/api/client';
import { formatDate, formatCurrency } from '@/lib/utils/format';

// ── Types (matching the return_transactions backend response) ──

interface ReturnTransaction {
    id: string;
    licensePlate: string;
    pharmacyId: string;
    pharmacyName: string | null;
    processorId: string | null;
    processorName: string | null;
    serviceType: string;
    status: string;
    fedexTracking: string | null;
    fedexPickupConfirmation: string | null;
    totalItems: number;
    totalReturnableValue: number;
    totalNonReturnableValue: number;
    notes: string | null;
    finalizedAt: string | null;
    createdAt: string;
    updatedAt: string;
}

interface Pagination {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
}

// ── Helpers ────────────────────────────────────────────────────

const STATUS_OPTIONS = [
    { value: '', label: 'All Statuses' },
    { value: 'in_progress', label: 'In Progress' },
    { value: 'paused', label: 'Paused' },
    { value: 'completed', label: 'Completed' },
    { value: 'finalized', label: 'Finalized' },
    { value: 'received', label: 'Received' },
    { value: 'closed_out', label: 'Closed Out' },
];

function getStatusBadge(status: string): { variant: 'success' | 'warning' | 'error' | 'info' | 'default'; label: string } {
    switch (status) {
        case 'in_progress': return { variant: 'info', label: 'In Progress' };
        case 'paused': return { variant: 'warning', label: 'Paused' };
        case 'completed': return { variant: 'success', label: 'Completed' };
        case 'finalized': return { variant: 'default', label: 'Finalized' };
        case 'received': return { variant: 'success', label: 'Received' };
        case 'closed_out': return { variant: 'default', label: 'Closed Out' };
        default: return { variant: 'default', label: status };
    }
}

function useDebounce(value: string, delay: number) {
    const [debounced, setDebounced] = useState(value);
    useEffect(() => {
        const timer = setTimeout(() => setDebounced(value), delay);
        return () => clearTimeout(timer);
    }, [value, delay]);
    return debounced;
}

// ── Page ───────────────────────────────────────────────────────

export default function ReturnsPage() {
    const router = useRouter();

    const [transactions, setTransactions] = useState<ReturnTransaction[]>([]);
    const [pagination, setPagination] = useState<Pagination | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isActionLoading, setIsActionLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [toasts, setToasts] = useState<Toast[]>([]);

    // Modals
    const [viewModal, setViewModal] = useState<ReturnTransaction | null>(null);
    const [deleteModal, setDeleteModal] = useState<ReturnTransaction | null>(null);

    const debouncedSearch = useDebounce(searchTerm, 500);

    const showToast = (message: string, type: Toast['type'] = 'success') => {
        const id = Date.now().toString();
        setToasts(prev => [...prev, { id, message, type }]);
    };
    const removeToast = (id: string) => setToasts(prev => prev.filter(t => t.id !== id));

    const fetchReturns = useCallback(async () => {
        try {
            setIsLoading(true);
            setError(null);

            const params: Record<string, any> = {
                page: currentPage,
                limit: 20,
            };
            if (debouncedSearch) params.search = debouncedSearch;
            if (statusFilter) params.status = statusFilter;
            if (dateFrom) params.date_from = dateFrom;
            if (dateTo) params.date_to = dateTo;

            const response = await apiClient.get<{
                transactions: ReturnTransaction[];
                pagination: Pagination;
            }>('/return-transactions', params);

            if (response.status === 'success' && response.data) {
                setTransactions(response.data.transactions || []);
                setPagination(response.data.pagination || null);
            }
        } catch (err: any) {
            setError(err.message || 'Failed to load returns');
        } finally {
            setIsLoading(false);
        }
    }, [currentPage, debouncedSearch, statusFilter, dateFrom, dateTo]);

    useEffect(() => {
        fetchReturns();
    }, [fetchReturns]);

    const refresh = () => fetchReturns();

    // ── Action handlers ────────────────────────────────────────

    const handleDelete = async () => {
        if (!deleteModal) return;
        try {
            setIsActionLoading(true);
            await apiClient.delete(`/return-transactions/${deleteModal.id}`);
            showToast(`Return ${deleteModal.licensePlate} deleted!`);
            setDeleteModal(null);
            refresh();
        } catch (err: any) {
            showToast(err.message || 'Failed to delete return', 'error');
            setDeleteModal(null);
        } finally {
            setIsActionLoading(false);
        }
    };

    const canDoAction = (tx: ReturnTransaction, action: string): boolean => {
        switch (action) {
            case 'edit': return !['finalized', 'received', 'verified', 'closed_out'].includes(tx.status);
            case 'delete': return !['finalized', 'received', 'verified', 'closed_out'].includes(tx.status);
            default: return false;
        }
    };

    // ── Stats ──────────────────────────────────────────────────

    const stats = {
        total: pagination?.total ?? transactions.length,
        inProgress: transactions.filter(t => t.status === 'in_progress').length,
        completed: transactions.filter(t => t.status === 'completed').length,
        totalValue: transactions.reduce((sum, t) => sum + t.totalReturnableValue, 0),
    };

    // ── Render ─────────────────────────────────────────────────

    return (
        <DashboardLayout>
        <PermissionGuard anyPermission={['returns:view', 'returns:create']}>
        <div className="space-y-3">
            <ToastContainer toasts={toasts} onClose={removeToast} />

            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-lg font-bold text-gray-900">Return Transactions</h1>
                    <p className="text-xs text-gray-500">Manage and track your pharmaceutical returns</p>
                </div>
                <button onClick={() => router.push('/returns/create')} className="inline-flex items-center gap-1 px-3 py-1.5 rounded text-xs font-medium bg-teal-600 text-white hover:bg-teal-700 transition-colors">
                    <Plus className="w-3.5 h-3.5" /> Create Return
                </button>
            </div>

            {/* Error */}
            {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    <span className="text-xs">{error}</span>
                </div>
            )}

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                <div className="bg-white rounded-lg shadow px-3 py-2">
                    <div className="flex items-center gap-1.5 mb-0.5">
                        <ClipboardList className="w-3.5 h-3.5 text-gray-500" />
                        <span className="text-[10px] text-gray-500">Total Returns</span>
                    </div>
                    <p className="text-sm font-bold text-gray-900">{stats.total}</p>
                </div>
                <div className="bg-white rounded-lg shadow px-3 py-2">
                    <div className="flex items-center gap-1.5 mb-0.5">
                        <Play className="w-3.5 h-3.5 text-blue-500" />
                        <span className="text-[10px] text-gray-500">In Progress</span>
                    </div>
                    <p className="text-sm font-bold text-gray-900">{stats.inProgress}</p>
                </div>
                <div className="bg-white rounded-lg shadow px-3 py-2">
                    <div className="flex items-center gap-1.5 mb-0.5">
                        <CheckCircle className="w-3.5 h-3.5 text-green-500" />
                        <span className="text-[10px] text-gray-500">Completed</span>
                    </div>
                    <p className="text-sm font-bold text-gray-900">{stats.completed}</p>
                </div>
                <div className="bg-white rounded-lg shadow px-3 py-2">
                    <div className="flex items-center gap-1.5 mb-0.5">
                        <DollarSign className="w-3.5 h-3.5 text-emerald-500" />
                        <span className="text-[10px] text-gray-500">Total Value</span>
                    </div>
                    <p className="text-sm font-bold text-gray-900">{formatCurrency(stats.totalValue)}</p>
                </div>
            </div>

            {/* Table Card */}
            <div className="bg-white rounded-lg shadow">
                {/* Filters */}
                <div className="flex flex-wrap gap-2 px-3 py-2 border-b border-gray-100">
                    <div className="relative flex-1 min-w-[160px]">
                        <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search by license plate or store name..."
                            value={searchTerm}
                            onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                            className="w-full pl-8 pr-3 py-1.5 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-teal-500"
                        />
                    </div>
                    <select
                        value={statusFilter}
                        onChange={e => { setStatusFilter(e.target.value); setCurrentPage(1); }}
                        className="px-2.5 py-1.5 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-teal-500"
                    >
                        {STATUS_OPTIONS.map(opt => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                    </select>
                    <input
                        type="date"
                        value={dateFrom}
                        onChange={e => { setDateFrom(e.target.value); setCurrentPage(1); }}
                        className="px-2.5 py-1.5 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-teal-500"
                        title="Date from"
                    />
                    <input
                        type="date"
                        value={dateTo}
                        onChange={e => { setDateTo(e.target.value); setCurrentPage(1); }}
                        className="px-2.5 py-1.5 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-teal-500"
                        title="Date to"
                    />
                </div>

                {/* Loading / Empty / Table */}
                {isLoading ? (
                    <div className="flex justify-center py-10">
                        <Loader2 className="w-6 h-6 animate-spin text-teal-600" />
                    </div>
                ) : transactions.length === 0 ? (
                    <div className="text-center py-10">
                        <ClipboardList className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                        <p className="text-sm text-gray-500 font-medium mb-1">No return transactions found</p>
                        <p className="text-xs text-gray-400 mb-3">
                            {searchTerm || statusFilter || dateFrom || dateTo
                                ? 'Try adjusting your filters.'
                                : 'Create your first return transaction to get started.'}
                        </p>
                        {!searchTerm && !statusFilter && (
                            <button onClick={() => router.push('/returns/create')} className="inline-flex items-center gap-1 px-3 py-1.5 rounded text-xs font-medium bg-teal-600 text-white hover:bg-teal-700 transition-colors">
                                <Plus className="w-3.5 h-3.5" /> Create Return
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full table-auto">
                            <thead>
                                <tr className="bg-gray-50 border-b border-gray-200">
                                    <th className="text-left px-3 py-1.5 text-[10px] font-semibold text-gray-500 uppercase">License Plate</th>
                                    <th className="text-left px-3 py-1.5 text-[10px] font-semibold text-gray-500 uppercase">Store</th>
                                    <th className="text-left px-3 py-1.5 text-[10px] font-semibold text-gray-500 uppercase">Status</th>
                                    <th className="text-left px-3 py-1.5 text-[10px] font-semibold text-gray-500 uppercase">Items</th>
                                    {/* <th className="text-left px-3 py-1.5 text-[10px] font-semibold text-gray-500 uppercase">Value</th> */}
                                    <th className="text-left px-3 py-1.5 text-[10px] font-semibold text-gray-500 uppercase">Date</th>
                                    <th className="text-right px-3 py-1.5 text-[10px] font-semibold text-gray-500 uppercase">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {transactions.map((tx) => {
                                    const badge = getStatusBadge(tx.status);
                                    return (
                                        <tr key={tx.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors cursor-pointer" onClick={() => router.push(`/returns/${tx.id}`)}>
                                            <td className="px-3 py-1.5">
                                                <span className="text-xs font-mono font-semibold text-gray-900">{tx.licensePlate}</span>
                                            </td>
                                            <td className="px-3 py-1.5">
                                                <p className="text-xs font-medium text-gray-900 truncate max-w-[140px]">{tx.pharmacyName || '—'}</p>
                                            </td>
                                            <td className="px-3 py-1.5">
                                                <Badge variant={badge.variant}><span className="text-[10px]">{badge.label}</span></Badge>
                                            </td>
                                            <td className="px-3 py-1.5 text-xs text-gray-600">{tx.totalItems}</td>
                                            {/* <td className="px-3 py-1.5 text-xs text-gray-900 font-medium">{formatCurrency(tx.totalReturnableValue)}</td> */}
                                            <td className="px-3 py-1.5 text-xs text-gray-500">{formatDate(tx.createdAt)}</td>
                                            <td className="px-3 py-1.5" onClick={e => e.stopPropagation()}>
                                                <div className="flex items-center justify-end gap-0.5">
                                                    <button onClick={() => setViewModal(tx)} className="p-1 text-gray-400 hover:text-teal-600 hover:bg-teal-50 rounded" title="View Details">
                                                        <Eye className="w-3.5 h-3.5" />
                                                    </button>
                                                    {canDoAction(tx, 'edit') && (
                                                        <button onClick={() => router.push(`/returns/${tx.id}`)} className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded" title="Edit">
                                                            <Edit className="w-3.5 h-3.5" />
                                                        </button>
                                                    )}
                                                    {canDoAction(tx, 'delete') && (
                                                        <button onClick={() => setDeleteModal(tx)} className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded" title="Delete">
                                                            <Trash2 className="w-3.5 h-3.5" />
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Pagination */}
                {pagination && pagination.totalPages > 1 && (
                    <div className="flex items-center justify-between px-3 py-2 border-t border-gray-100 bg-gray-50">
                        <p className="text-[10px] text-gray-500">
                            Page {pagination.page} of {pagination.totalPages} ({pagination.total} total)
                        </p>
                        <div className="flex items-center gap-1.5">
                            <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage <= 1} className="p-1 border border-gray-300 rounded disabled:opacity-40 hover:bg-gray-50">
                                <ChevronLeft className="w-3.5 h-3.5" />
                            </button>
                            <span className="text-xs font-medium text-gray-700 px-1">{currentPage}</span>
                            <button onClick={() => setCurrentPage(p => p + 1)} disabled={currentPage >= pagination.totalPages} className="p-1 border border-gray-300 rounded disabled:opacity-40 hover:bg-gray-50">
                                <ChevronRight className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* ── View Detail Modal ────────────────────────── */}
            {viewModal && (
                <div className="fixed inset-0 bg-gray-900/50 flex items-center justify-center z-50 p-4" onClick={() => setViewModal(null)}>
                    <div className="bg-white rounded-lg max-w-lg w-full shadow-xl max-h-[88vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-gray-50 sticky top-0">
                            <h2 className="text-sm font-semibold text-gray-900">Return Details</h2>
                            <button onClick={() => setViewModal(null)} className="text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
                        </div>
                        <div className="px-4 py-3 space-y-3">
                            <div className="flex items-center gap-2">
                                <span className="text-sm font-mono font-bold text-gray-900">{viewModal.licensePlate}</span>
                                <Badge variant={getStatusBadge(viewModal.status).variant}><span className="text-[10px]">{getStatusBadge(viewModal.status).label}</span></Badge>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                {[
                                    { label: 'Store', value: viewModal.pharmacyName || '—' },
                                    { label: 'Processor', value: viewModal.processorName || '—' },
                                    { label: 'Service Type', value: (viewModal.serviceType || '').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) },
                                    { label: 'Total Items', value: String(viewModal.totalItems) },
                                    // { label: 'Returnable Value', value: formatCurrency(viewModal.totalReturnableValue), className: 'text-green-700' },
                                    // { label: 'Non-Returnable', value: formatCurrency(viewModal.totalNonReturnableValue), className: 'text-red-700' },
                                    { label: 'Created', value: formatDate(viewModal.createdAt) },
                                    { label: 'Updated', value: formatDate(viewModal.updatedAt) },
                                ].map(({ label, value }) => (
                                    <div key={label}>
                                        <p className="text-[10px] text-gray-400">{label}</p>
                                        {/* <p className={`text-xs font-medium text-gray-900 ${className || ''}`}>{value}</p> */}
                                        <p className="text-xs font-medium text-gray-900">{value}</p>
                                    </div>
                                ))}
                            </div>
                            {(viewModal.fedexTracking || viewModal.fedexPickupConfirmation) && (
                                <div className="border-t border-gray-100 pt-2">
                                    <p className="text-[10px] font-medium text-gray-400 mb-1.5 uppercase">Shipping</p>
                                    <div className="grid grid-cols-2 gap-2">
                                        <div><p className="text-[10px] text-gray-400">FedEx Tracking</p><p className="text-xs font-medium">{viewModal.fedexTracking || '—'}</p></div>
                                        <div><p className="text-[10px] text-gray-400">Pickup Confirmation</p><p className="text-xs font-medium">{viewModal.fedexPickupConfirmation || '—'}</p></div>
                                    </div>
                                </div>
                            )}
                            {viewModal.notes && (
                                <div className="border-t border-gray-100 pt-2">
                                    <p className="text-[10px] font-medium text-gray-400 mb-1">Notes</p>
                                    <p className="text-xs text-gray-700">{viewModal.notes}</p>
                                </div>
                            )}
                            {viewModal.finalizedAt && (
                                <div className="border-t border-gray-100 pt-2">
                                    <p className="text-[10px] text-gray-400">Finalized on {formatDate(viewModal.finalizedAt)}</p>
                                </div>
                            )}
                        </div>
                        <div className="flex justify-end px-4 py-3 border-t border-gray-200 bg-gray-50">
                            <button onClick={() => setViewModal(null)} className="px-3 py-1.5 text-xs rounded border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors">Close</button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Delete Modal ─────────────────── */}
            {deleteModal && (
                <div className="fixed inset-0 bg-gray-900/50 flex items-center justify-center z-50 p-4" onClick={() => setDeleteModal(null)}>
                    <div className="bg-white rounded-lg max-w-sm w-full shadow-xl" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-gray-50">
                            <h2 className="text-sm font-semibold text-gray-900">Delete Return</h2>
                            <button onClick={() => setDeleteModal(null)} className="text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
                        </div>
                        <div className="px-4 py-3">
                            <p className="text-xs text-gray-700">
                                Are you sure you want to delete return <strong>{deleteModal.licensePlate}</strong>? This action cannot be undone.
                            </p>
                        </div>
                        <div className="flex justify-end gap-2 px-4 py-3 border-t border-gray-200 bg-gray-50">
                            <button onClick={() => setDeleteModal(null)} className="px-3 py-1.5 text-xs rounded border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors">Cancel</button>
                            <button onClick={handleDelete} disabled={isActionLoading} className="inline-flex items-center gap-1 px-3 py-1.5 text-xs rounded bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 transition-colors">
                                {isActionLoading ? <><Loader2 className="w-3.5 h-3.5 animate-spin" />Deleting...</> : 'Delete'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
        </PermissionGuard>
        </DashboardLayout>
    );
}
