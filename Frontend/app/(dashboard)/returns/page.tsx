'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PermissionGuard } from '@/components/shared/PermissionGuard';
import { Badge } from '@/components/ui/Badge';
import { ToastContainer, Toast } from '@/components/ui/Toast';
import {
    Search, Plus, ChevronLeft, ChevronRight, Loader2, AlertCircle,
    Eye, X, Trash2, Edit, FileText,
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
    storeNumber?: string | null;
    pharmacyStreetAddress?: string | null;
    pharmacyCity?: string | null;
    pharmacyState?: string | null;
    processorId: string | null;
    processorName: string | null;
    serviceType: string;
    status: string;
    fedexTracking: string | null;
    fedexPickupConfirmation: string | null;
    totalItems: number;
    totalReturnableValue: number;
    totalNonReturnableValue: number;
    hasCiiItems?: boolean; // For DEA Form 222 availability
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
    { value: 'verified', label: 'Verified' },
    { value: 'finalized', label: 'Finalized' },
    { value: 'received', label: 'Received' },
    { value: 'closed_out', label: 'Closed Out' },
];

function getStatusBadge(status: string): { variant: 'success' | 'warning' | 'error' | 'info' | 'default'; label: string } {
    switch (status) {
        case 'in_progress': return { variant: 'info', label: 'In Progress' };
        case 'paused': return { variant: 'warning', label: 'Paused' };
        case 'completed': return { variant: 'success', label: 'Completed' };
        case 'verified': return { variant: 'success', label: 'Verified' };
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

    const downloadDeaForm222 = async (tx: ReturnTransaction) => {
        try {
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api'}/return-transactions/${tx.id}/dea-form-222`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                },
            });
            
            if (!response.ok) {
                const error = await response.json().catch(() => ({ message: 'Download failed' }));
                throw new Error(error.message || 'Failed to download DEA Form 222');
            }
            
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `dea-form-222-${tx.licensePlate}.pdf`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
            
            showToast('DEA Form 222 downloaded successfully');
        } catch (error: any) {
            showToast(error.message || 'Failed to download DEA Form 222', 'error');
        }
    };
    const removeToast = (id: string) => setToasts(prev => prev.filter(t => t.id !== id));

    const fetchReturns = useCallback(async () => {
        try {
            setIsLoading(true);
            setError(null);

            const params: Record<string, any> = {
                page: currentPage,
                limit: 10,
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
        // If return was created by processor, pharmacy can only view - no actions allowed
        if (tx.processorId) {
            return false;
        }
        
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
        verified: transactions.filter(t => t.status === 'verified').length,
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
                <div className="bg-white rounded-lg shadow px-3 py-2 border-2 border-teal-200">
                    <div className="flex items-center gap-1.5 mb-0.5">
                        <ClipboardList className="w-4 h-4 text-teal-600" />
                        <span className="text-xs text-teal-600 font-semibold uppercase tracking-wide">Total Returns</span>
                    </div>
                    <p className="text-lg font-bold text-teal-700">{stats.total}</p>
                </div>
                <div className="bg-white rounded-lg shadow px-3 py-2 border-2 border-cyan-200">
                    <div className="flex items-center gap-1.5 mb-0.5">
                        <Play className="w-4 h-4 text-cyan-600" />
                        <span className="text-xs text-cyan-600 font-semibold uppercase tracking-wide">In Progress</span>
                    </div>
                    <p className="text-lg font-bold text-cyan-700">{stats.inProgress}</p>
                </div>
                <div className="bg-white rounded-lg shadow px-3 py-2 border-2 border-emerald-200">
                    <div className="flex items-center gap-1.5 mb-0.5">
                        <CheckCircle className="w-4 h-4 text-emerald-600" />
                        <span className="text-xs text-emerald-600 font-semibold uppercase tracking-wide">Verified</span>
                    </div>
                    <p className="text-lg font-bold text-emerald-700">{stats.verified}</p>
                </div>
                <div className="bg-white rounded-lg shadow px-3 py-2 border-2 border-teal-200">
                    <div className="flex items-center gap-1.5 mb-0.5">
                        <DollarSign className="w-4 h-4 text-teal-600" />
                        <span className="text-xs text-teal-600 font-semibold uppercase tracking-wide">Total Value</span>
                    </div>
                    <p className="text-lg font-bold text-teal-700">{formatCurrency(stats.totalValue)}</p>
                </div>
            </div>

            {/* Table Card */}
            <div className="bg-white rounded-lg shadow">
                {/* Filters */}
                <div className="flex flex-wrap gap-2 px-3 py-2 border-b border-gray-100">
                    <div className="relative flex-1 min-w-[160px]">
                        <Search className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search by license plate or store name..."
                            value={searchTerm}
                            onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                            className="w-full pl-8 pr-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-teal-500"
                        />
                    </div>
                    <select
                        value={statusFilter}
                        onChange={e => { setStatusFilter(e.target.value); setCurrentPage(1); }}
                        className="px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-teal-500"
                    >
                        {STATUS_OPTIONS.map(opt => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                    </select>
                    <input
                        type="date"
                        value={dateFrom}
                        onChange={e => { setDateFrom(e.target.value); setCurrentPage(1); }}
                        className="px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-teal-500"
                        title="Date from"
                    />
                    <input
                        type="date"
                        value={dateTo}
                        onChange={e => { setDateTo(e.target.value); setCurrentPage(1); }}
                        className="px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-teal-500"
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
                                <tr className="bg-gradient-to-r from-teal-600 to-teal-700 border-b-2 border-teal-800">
                                    <th className="text-left px-4 py-3.5 text-xs font-semibold text-white uppercase tracking-wider">License Plate</th>
                                    <th className="text-left px-4 py-3.5 text-xs font-semibold text-white uppercase tracking-wider">Processor</th>
                                    <th className="text-left px-4 py-3.5 text-xs font-semibold text-white uppercase tracking-wider">Status</th>
                                    <th className="text-left px-4 py-3.5 text-xs font-semibold text-white uppercase tracking-wider">Items</th>
                                    {/* <th className="text-left px-4 py-3.5 text-xs font-semibold text-white uppercase tracking-wider">Value</th> */}
                                    <th className="text-left px-4 py-3.5 text-xs font-semibold text-white uppercase tracking-wider">Date</th>
                                    <th className="text-right px-4 py-3.5 text-xs font-semibold text-white uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {transactions.map((tx, index) => {
                                    const badge = getStatusBadge(tx.status);
                                    const isEven = index % 2 === 0;
                                    return (
                                        <tr key={tx.id} className={`border-b border-gray-100 hover:bg-teal-50 transition-colors cursor-pointer ${isEven ? 'bg-white' : 'bg-teal-50/40'}`} onClick={() => router.push(`/returns/${tx.id}`)}>
                                            <td className="px-4 py-3">
                                                <span className="text-sm font-mono font-semibold text-gray-900">{tx.licensePlate}</span>
                                            </td>
                                            <td className="px-4 py-3">
                                                <p className="text-sm font-medium text-gray-900 truncate max-w-[140px]">{tx.processorName || '—'}</p>
                                            </td>
                                            <td className="px-4 py-3">
                                                <Badge variant={badge.variant}><span className="text-xs">{badge.label}</span></Badge>
                                            </td>
                                            <td className="px-4 py-3 text-sm text-gray-700 font-medium">{tx.totalItems}</td>
                                            {/* <td className="px-4 py-3 text-sm text-gray-900 font-medium">{formatCurrency(tx.totalReturnableValue)}</td> */}
                                            <td className="px-4 py-3 text-sm text-gray-600">{formatDate(tx.createdAt)}</td>
                                            <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                                                <div className="flex items-center justify-end gap-1">
                                                    <button onClick={() => setViewModal(tx)} className="p-1.5 text-gray-400 hover:text-teal-600 hover:bg-teal-50 rounded transition-colors" title="View Details">
                                                        <Eye className="w-4 h-4" />
                                                    </button>
                                                    {tx.hasCiiItems && (
                                                        <button onClick={() => downloadDeaForm222(tx)} className="p-1.5 text-gray-400 hover:text-orange-600 hover:bg-orange-50 rounded transition-colors" title="Download DEA Form 222">
                                                            <FileText className="w-4 h-4" />
                                                        </button>
                                                    )}
                                                    {canDoAction(tx, 'edit') && (
                                                        <button onClick={() => router.push(`/returns/${tx.id}`)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors" title="Edit">
                                                            <Edit className="w-4 h-4" />
                                                        </button>
                                                    )}
                                                    {canDoAction(tx, 'delete') && (
                                                        <button onClick={() => setDeleteModal(tx)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors" title="Delete">
                                                            <Trash2 className="w-4 h-4" />
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
                    <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 bg-gray-50">
                        <p className="text-sm text-gray-600 font-medium">
                            Page <span className="font-bold text-gray-900">{pagination.page}</span> of <span className="font-bold text-gray-900">{pagination.totalPages}</span> (<span className="font-bold text-gray-900">{pagination.total}</span> total)
                        </p>
                        <div className="flex items-center gap-2">
                            <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage <= 1} className="p-1.5 border border-gray-300 rounded disabled:opacity-40 hover:bg-teal-50 transition-colors">
                                <ChevronLeft className="w-4 h-4" />
                            </button>
                            <span className="text-sm font-semibold text-gray-700 px-2">{currentPage}</span>
                            <button onClick={() => setCurrentPage(p => p + 1)} disabled={currentPage >= pagination.totalPages} className="p-1.5 border border-gray-300 rounded disabled:opacity-40 hover:bg-teal-50 transition-colors">
                                <ChevronRight className="w-4 h-4" />
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
                                    ...(viewModal.pharmacyStreetAddress ? [
                                        { label: 'Address', value: viewModal.pharmacyStreetAddress, fullWidth: true }
                                    ] : []),
                                    ...((viewModal.pharmacyCity || viewModal.pharmacyState) ? [
                                        { label: 'City / State', value: [viewModal.pharmacyCity, viewModal.pharmacyState].filter(Boolean).join(', ') || '—', fullWidth: true }
                                    ] : []),
                                    { label: 'Service Type', value: (viewModal.serviceType || '').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) },
                                    { label: 'Total Items', value: String(viewModal.totalItems) },
                                    // Show Returnable/Non-Returnable values only when status is verified
                                    ...(viewModal.status === 'verified' ? [
                                        { label: 'Returnable Value', value: formatCurrency(viewModal.totalReturnableValue), className: 'text-green-700' },
                                        { label: 'Non-Returnable', value: formatCurrency(viewModal.totalNonReturnableValue), className: 'text-red-700' },
                                    ] : []),
                                    { label: 'Created', value: formatDate(viewModal.createdAt) },
                                    { label: 'Updated', value: formatDate(viewModal.updatedAt) },
                                ].map(({ label, value, className, fullWidth }) => (
                                    <div key={label} className={fullWidth ? 'col-span-2' : ''}>
                                        <p className="text-[10px] text-gray-400">{label}</p>
                                        <p className={`text-xs font-medium text-gray-900 ${className || ''}`}>{value}</p>
                                    </div>
                                ))}
                            </div>
                            {(viewModal.fedexTracking || viewModal.fedexPickupConfirmation) && (
                                <div className="border-t border-gray-100 pt-2">
                                    <p className="text-[10px] font-medium text-gray-400 mb-1.5 uppercase">Shipping Details</p>
                                    <div className="grid grid-cols-2 gap-2">
                                        {viewModal.fedexTracking && (
                                            <div><p className="text-[10px] text-gray-400">FedEx Tracking</p><p className="text-xs font-medium font-mono">{viewModal.fedexTracking}</p></div>
                                        )}
                                        {viewModal.fedexPickupConfirmation && (
                                            <div><p className="text-[10px] text-gray-400">Pickup Confirmation</p><p className="text-xs font-medium font-mono">{viewModal.fedexPickupConfirmation}</p></div>
                                        )}
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
