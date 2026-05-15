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
    ArrowUpDown, ArrowUp, ArrowDown,
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
    paidMemoCount?: number;
    unpaidMemoCount?: number;
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

const SORT_OPTIONS = [
    { value: 'createdAt', label: 'Date Created' },
    { value: 'updatedAt', label: 'Last Updated' },
    { value: 'licensePlate', label: 'License Plate' },
    { value: 'status', label: 'Status' },
    { value: 'totalItems', label: 'Total Items' },
    { value: 'totalReturnableValue', label: 'Returnable Value' },
];

function getStatusBadge(status: string): { variant: 'success' | 'warning' | 'error' | 'info' | 'default'; label: string } {
    switch (status) {
        case 'in_progress': return { variant: 'info', label: 'In Progress' };
        case 'paused': return { variant: 'warning', label: 'Paused' };
        case 'completed': return { variant: 'success', label: 'Completed' };
        case 'verified': return { variant: 'success', label: 'Verified' };
        case 'paid': return { variant: 'success', label: 'Paid' };
        case 'partially_paid': return { variant: 'warning', label: 'Partially Paid' };
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
    const [sortBy, setSortBy] = useState('createdAt');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
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
                sort: sortBy,
                order: sortOrder,
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
    }, [currentPage, debouncedSearch, statusFilter, dateFrom, dateTo, sortBy, sortOrder]);

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
                    <h1 className="text-lg font-bold text-[#000000] font-serif">Return Transactions</h1>
                    <p className="text-xs text-[#6b7280]">Manage and track your pharmaceutical returns</p>
                </div>
                <button onClick={() => router.push('/returns/create')} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-[4px] text-xs font-medium bg-[#516057] text-white hover:opacity-90 transition-colors">
                    <Plus className="w-3.5 h-3.5" /> Create Return
                </button>
            </div>

            {/* Error */}
            {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-[4px] flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    <span className="text-xs">{error}</span>
                </div>
            )}

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                <div className="bg-white rounded-[4px] shadow-sm px-3 py-2 border border-[#e2e2e2]">
                    <div className="flex items-center gap-1.5 mb-0.5">
                        <div className="p-1 bg-[#f5f2f1] rounded-[4px]">
                            <ClipboardList className="w-4 h-4 text-[#516057]" />
                        </div>
                        <span className="text-xs text-[#505454] font-semibold uppercase tracking-wide">Total Returns</span>
                    </div>
                    <p className="text-lg font-bold text-[#000000]">{stats.total}</p>
                </div>
                <div className="bg-white rounded-[4px] shadow-sm px-3 py-2 border border-[#e2e2e2]">
                    <div className="flex items-center gap-1.5 mb-0.5">
                        <div className="p-1 bg-[#f5f2f1] rounded-[4px]">
                            <Play className="w-4 h-4 text-[#516057]" />
                        </div>
                        <span className="text-xs text-[#505454] font-semibold uppercase tracking-wide">In Progress</span>
                    </div>
                    <p className="text-lg font-bold text-[#000000]">{stats.inProgress}</p>
                </div>
                <div className="bg-white rounded-[4px] shadow-sm px-3 py-2 border border-[#e2e2e2]">
                    <div className="flex items-center gap-1.5 mb-0.5">
                        <div className="p-1 bg-[#f5f2f1] rounded-[4px]">
                            <CheckCircle className="w-4 h-4 text-[#516057]" />
                        </div>
                        <span className="text-xs text-[#505454] font-semibold uppercase tracking-wide">Verified</span>
                    </div>
                    <p className="text-lg font-bold text-[#000000]">{stats.verified}</p>
                </div>
                <div className="bg-white rounded-[4px] shadow-sm px-3 py-2 border border-[#e2e2e2]">
                    <div className="flex items-center gap-1.5 mb-0.5">
                        <div className="p-1 bg-[#f5f2f1] rounded-[4px]">
                            <DollarSign className="w-4 h-4 text-[#516057]" />
                        </div>
                        <span className="text-xs text-[#505454] font-semibold uppercase tracking-wide">Total Value</span>
                    </div>
                    <p className="text-lg font-bold text-[#000000]">{formatCurrency(stats.totalValue)}</p>
                </div>
            </div>

            {/* Table Card */}
            <div className="bg-white rounded-[4px] shadow-sm border border-[#e2e2e2]">
                {/* Filters */}
                <div className="flex flex-wrap gap-2 px-3 py-2 border-b border-[#e2e2e2]">
                    <div className="relative flex-1 min-w-[160px]">
                        <Search className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-[#9ca3af]" />
                        <input
                            type="text"
                            placeholder="Search by license plate or store name..."
                            value={searchTerm}
                            onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                            className="w-full pl-8 pr-3 py-2 text-sm border border-[#e2e2e2] rounded-[4px] focus:outline-none focus:ring-2 focus:ring-[#516057] bg-white"
                        />
                    </div>
                    <select
                        value={statusFilter}
                        onChange={e => { setStatusFilter(e.target.value); setCurrentPage(1); }}
                        className="px-3 py-2 text-sm border border-[#e2e2e2] rounded-[4px] focus:outline-none focus:ring-2 focus:ring-[#516057] bg-white"
                    >
                        {STATUS_OPTIONS.map(opt => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                    </select>
                    <input
                        type="date"
                        value={dateFrom}
                        onChange={e => { setDateFrom(e.target.value); setCurrentPage(1); }}
                        className="px-3 py-2 text-sm border border-[#e2e2e2] rounded-[4px] focus:outline-none focus:ring-2 focus:ring-[#516057] bg-white"
                        title="Date from"
                    />
                    <input
                        type="date"
                        value={dateTo}
                        onChange={e => { setDateTo(e.target.value); setCurrentPage(1); }}
                        className="px-3 py-2 text-sm border border-[#e2e2e2] rounded-[4px] focus:outline-none focus:ring-2 focus:ring-[#516057] bg-white"
                        title="Date to"
                    />
                    <select
                        value={sortBy}
                        onChange={e => { setSortBy(e.target.value); setCurrentPage(1); }}
                        className="px-3 py-2 text-sm border border-[#e2e2e2] rounded-[4px] focus:outline-none focus:ring-2 focus:ring-[#516057] bg-white"
                        title="Sort by"
                    >
                        {SORT_OPTIONS.map(opt => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                    </select>
                    <button
                        onClick={() => { setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc'); setCurrentPage(1); }}
                        className="flex items-center gap-1 px-3 py-2 text-sm border border-[#e2e2e2] rounded-[4px] focus:outline-none focus:ring-2 focus:ring-[#516057] bg-white hover:bg-gray-50 transition-colors"
                        title={`Sort ${sortOrder === 'asc' ? 'ascending' : 'descending'}`}
                    >
                        {sortOrder === 'asc' ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />}
                        <span className="hidden sm:inline">{sortOrder === 'asc' ? 'Asc' : 'Desc'}</span>
                    </button>
                </div>

                {/* Loading / Empty / Table */}
                {isLoading ? (
                    <div className="flex justify-center py-10">
                        <Loader2 className="w-6 h-6 animate-spin text-[#516057]" />
                    </div>
                ) : transactions.length === 0 ? (
                    <div className="text-center py-10">
                        <ClipboardList className="w-10 h-10 text-[#9ca3af] mx-auto mb-2" />
                        <p className="text-sm text-[#505454] font-medium mb-1">No return transactions found</p>
                        <p className="text-xs text-[#9ca3af] mb-3">
                            {searchTerm || statusFilter || dateFrom || dateTo
                                ? 'Try adjusting your filters or sorting options.'
                                : 'Create your first return transaction to get started.'}
                        </p>
                        {!searchTerm && !statusFilter && (
                            <button onClick={() => router.push('/returns/create')} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-[4px] text-xs font-medium bg-[#516057] text-white hover:opacity-90 transition-colors">
                                <Plus className="w-3.5 h-3.5" /> Create Return
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm border border-[var(--outline)]" style={{ borderColor: 'var(--outline)' }}>
                            <thead 
                                className="bg-[var(--surface-container-low)] border-b" 
                                style={{ borderColor: 'var(--outline)', borderBottomWidth: '1.5px' }}
                            >
                                <tr className="bg-[var(--surface-container-low)]">
                                    <th className="text-left px-3 py-3 text-xs font-semibold uppercase tracking-wider whitespace-nowrap text-[#505454] border-r border-[var(--outline)]">License Plate</th>
                                    <th className="text-left px-3 py-3 text-xs font-semibold uppercase tracking-wider whitespace-nowrap text-[#505454] border-r border-[var(--outline)]">Processor</th>
                                    <th className="text-left px-3 py-3 text-xs font-semibold uppercase tracking-wider whitespace-nowrap text-[#505454] border-r border-[var(--outline)]">Status</th>
                                    <th className="text-left px-3 py-3 text-xs font-semibold uppercase tracking-wider whitespace-nowrap text-[#505454] border-r border-[var(--outline)]">Items</th>
                                    <th className="text-left px-3 py-3 text-xs font-semibold uppercase tracking-wider whitespace-nowrap text-[#505454] border-r border-[var(--outline)]">Paid Memos</th>
                                    <th className="text-left px-3 py-3 text-xs font-semibold uppercase tracking-wider whitespace-nowrap text-[#505454] border-r border-[var(--outline)]">Unpaid Memos</th>
                                    <th className="text-left px-3 py-3 text-xs font-semibold uppercase tracking-wider whitespace-nowrap text-[#505454] border-r border-[var(--outline)]">Date</th>
                                    <th className="text-right px-3 py-3 text-xs font-semibold uppercase tracking-wider whitespace-nowrap text-[#505454]">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y" style={{ borderColor: 'var(--outline-variant)' }}>
                                {transactions.map((tx) => {
                                    const badge = getStatusBadge(tx.status);
                                    return (
                                        <tr 
                                            key={tx.id} 
                                            className="hover:bg-[var(--surface-container)] transition-colors border-b cursor-pointer"
                                            style={{ borderColor: 'var(--outline-variant)' }}
                                            onClick={() => router.push(`/returns/${tx.id}`)}
                                        >
                                            <td className="px-3 py-3 border-r border-[var(--outline-variant)]">
                                                <span className="text-sm font-mono font-semibold text-[#000000]">{tx.licensePlate}</span>
                                            </td>
                                            <td className="px-3 py-3 border-r border-[var(--outline-variant)]">
                                                <p className="text-sm font-medium text-[#000000] truncate max-w-[140px]">{tx.processorName || '—'}</p>
                                            </td>
                                            <td className="px-3 py-3 border-r border-[var(--outline-variant)]">
                                                <Badge variant={badge.variant}><span className="text-xs">{badge.label}</span></Badge>
                                            </td>
                                            <td className="px-3 py-3 text-sm text-[#505454] font-medium border-r border-[var(--outline-variant)]">{tx.totalItems}</td>
                                            <td className="px-3 py-3 text-sm tabular-nums font-medium text-green-700 border-r border-[var(--outline-variant)]">{tx.paidMemoCount ?? 0}</td>
                                            <td className="px-3 py-3 text-sm tabular-nums font-medium text-red-600 border-r border-[var(--outline-variant)]">{tx.unpaidMemoCount ?? 0}</td>
                                            <td className="px-3 py-3 text-sm text-[#505454] border-r border-[var(--outline-variant)]">{formatDate(tx.createdAt)}</td>
                                            <td className="px-3 py-3" onClick={e => e.stopPropagation()}>
                                                <div className="flex items-center justify-end gap-1">
                                                    <button onClick={() => setViewModal(tx)} className="p-1.5 text-[#9ca3af] hover:text-[#516057] hover:bg-[var(--surface-container)] rounded-[4px] transition-colors" title="View Details">
                                                        <Eye className="w-4 h-4" />
                                                    </button>
                                                    {tx.hasCiiItems && (
                                                        <button onClick={() => downloadDeaForm222(tx)} className="p-1.5 text-[#9ca3af] hover:text-[#ad916a] hover:bg-[#ad916a]/10 rounded-[4px] transition-colors" title="Download DEA Form 222">
                                                            <FileText className="w-4 h-4" />
                                                        </button>
                                                    )}
                                                    {canDoAction(tx, 'edit') && (
                                                        <button onClick={() => router.push(`/returns/${tx.id}`)} className="p-1.5 text-[#9ca3af] hover:text-[#516057] hover:bg-[var(--surface-container)] rounded-[4px] transition-colors" title="Edit">
                                                            <Edit className="w-4 h-4" />
                                                        </button>
                                                    )}
                                                    {canDoAction(tx, 'delete') && (
                                                        <button onClick={() => setDeleteModal(tx)} className="p-1.5 text-[#9ca3af] hover:text-red-600 hover:bg-red-50 rounded-[4px] transition-colors" title="Delete">
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
                    <div className="flex items-center justify-between px-4 py-3 border-t border-[#e2e2e2] bg-white">
                        <p className="text-sm text-[#6b7280] font-medium">
                            Page <span className="font-bold text-[#000000]">{pagination.page}</span> of <span className="font-bold text-[#000000]">{pagination.totalPages}</span> (<span className="font-bold text-[#000000]">{pagination.total}</span> total)
                        </p>
                        <div className="flex items-center gap-1">
                            {/* Previous Button */}
                            <button 
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))} 
                                disabled={currentPage <= 1} 
                                className="p-1.5 border border-[#e2e2e2] rounded-[4px] disabled:opacity-40 hover:bg-[var(--surface-container)] transition-colors"
                                title="Previous page"
                            >
                                <ChevronLeft className="w-4 h-4 text-[#505454]" />
                            </button>

                            {/* Page Numbers */}
                            {(() => {
                                const totalPages = pagination.totalPages;
                                const current = currentPage;
                                const pages = [];
                                
                                if (totalPages <= 7) {
                                    // Show all pages if 7 or fewer
                                    for (let i = 1; i <= totalPages; i++) {
                                        pages.push(i);
                                    }
                                } else {
                                    // Always show first page
                                    pages.push(1);
                                    
                                    if (current <= 4) {
                                        // Show pages 1,2,3,4,5...last
                                        for (let i = 2; i <= 5; i++) {
                                            pages.push(i);
                                        }
                                        if (totalPages > 6) pages.push('...');
                                        pages.push(totalPages);
                                    } else if (current >= totalPages - 3) {
                                        // Show pages 1...last-4,last-3,last-2,last-1,last
                                        if (totalPages > 6) pages.push('...');
                                        for (let i = totalPages - 4; i <= totalPages; i++) {
                                            pages.push(i);
                                        }
                                    } else {
                                        // Show pages 1...current-1,current,current+1...last
                                        pages.push('...');
                                        for (let i = current - 1; i <= current + 1; i++) {
                                            pages.push(i);
                                        }
                                        pages.push('...');
                                        pages.push(totalPages);
                                    }
                                }
                                
                                return pages.map((page, index) => 
                                    page === '...' ? (
                                        <span key={`ellipsis-${index}`} className="px-2 py-1.5 text-sm text-[#9ca3af]">...</span>
                                    ) : (
                                        <button
                                            key={page}
                                            onClick={() => setCurrentPage(page as number)}
                                            className={`px-3 py-1.5 text-sm border rounded-[4px] transition-colors ${
                                                page === current
                                                    ? 'border-[#516057] bg-[#516057] text-white font-semibold'
                                                    : 'border-[#e2e2e2] text-[#505454] hover:bg-[var(--surface-container)]'
                                            }`}
                                        >
                                            {page}
                                        </button>
                                    )
                                );
                            })()}

                            {/* Next Button */}
                            <button 
                                onClick={() => setCurrentPage(p => p + 1)} 
                                disabled={currentPage >= pagination.totalPages} 
                                className="p-1.5 border border-[#e2e2e2] rounded-[4px] disabled:opacity-40 hover:bg-[var(--surface-container)] transition-colors"
                                title="Next page"
                            >
                                <ChevronRight className="w-4 h-4 text-[#505454]" />
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* ── View Detail Modal ────────────────────────── */}
            {viewModal && (
                <div className="fixed inset-0 bg-gray-900/50 flex items-center justify-center z-50 p-4" onClick={() => setViewModal(null)}>
                    <div className="bg-white rounded-[4px] max-w-lg w-full shadow-xl max-h-[88vh] overflow-y-auto border border-[#e2e2e2]" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between px-4 py-3 border-b border-[#e2e2e2] bg-[#f5f2f1] sticky top-0">
                            <h2 className="text-sm font-semibold text-[#000000] font-serif">Return Details</h2>
                            <button onClick={() => setViewModal(null)} className="text-[#9ca3af] hover:text-[#505454]"><X className="w-4 h-4" /></button>
                        </div>
                        <div className="px-4 py-3 space-y-3">
                            <div className="flex items-center gap-2">
                                <span className="text-sm font-mono font-bold text-[#000000]">{viewModal.licensePlate}</span>
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
                                    ...(viewModal.status === 'verified' ? [
                                        { label: 'Returnable Value', value: formatCurrency(viewModal.totalReturnableValue), className: 'text-[#516057]' },
                                        { label: 'Non-Returnable', value: formatCurrency(viewModal.totalNonReturnableValue), className: 'text-[#ad916a]' },
                                    ] : []),
                                    { label: 'Created', value: formatDate(viewModal.createdAt) },
                                    { label: 'Updated', value: formatDate(viewModal.updatedAt) },
                                ].map(({ label, value, className, fullWidth }) => (
                                    <div key={label} className={fullWidth ? 'col-span-2' : ''}>
                                        <p className="text-[10px] text-[#9ca3af]">{label}</p>
                                        <p className={`text-xs font-medium text-[#000000] ${className || ''}`}>{value}</p>
                                    </div>
                                ))}
                            </div>
                            {(viewModal.fedexTracking || viewModal.fedexPickupConfirmation) && (
                                <div className="border-t border-[#e2e2e2] pt-2">
                                    <p className="text-[10px] font-medium text-[#9ca3af] mb-1.5 uppercase">Shipping Details</p>
                                    <div className="grid grid-cols-2 gap-2">
                                        {viewModal.fedexTracking && (
                                            <div><p className="text-[10px] text-[#9ca3af]">FedEx Tracking</p><p className="text-xs font-medium font-mono text-[#505454]">{viewModal.fedexTracking}</p></div>
                                        )}
                                        {viewModal.fedexPickupConfirmation && (
                                            <div><p className="text-[10px] text-[#9ca3af]">Pickup Confirmation</p><p className="text-xs font-medium font-mono text-[#505454]">{viewModal.fedexPickupConfirmation}</p></div>
                                        )}
                                    </div>
                                </div>
                            )}
                            {viewModal.notes && (
                                <div className="border-t border-[#e2e2e2] pt-2">
                                    <p className="text-[10px] font-medium text-[#9ca3af] mb-1">Notes</p>
                                    <p className="text-xs text-[#505454]">{viewModal.notes}</p>
                                </div>
                            )}
                            {viewModal.finalizedAt && (
                                <div className="border-t border-[#e2e2e2] pt-2">
                                    <p className="text-[10px] text-[#9ca3af]">Finalized on {formatDate(viewModal.finalizedAt)}</p>
                                </div>
                            )}
                        </div>
                        <div className="flex justify-end px-4 py-3 border-t border-[#e2e2e2] bg-[#f5f2f1]">
                            <button onClick={() => setViewModal(null)} className="px-3 py-1.5 text-xs rounded-[4px] border border-[#e2e2e2] text-[#505454] hover:bg-white transition-colors">Close</button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Delete Modal ─────────────────── */}
            {deleteModal && (
                <div className="fixed inset-0 bg-gray-900/50 flex items-center justify-center z-50 p-4" onClick={() => setDeleteModal(null)}>
                    <div className="bg-white rounded-[4px] max-w-sm w-full shadow-xl border border-[#e2e2e2]" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between px-4 py-3 border-b border-[#e2e2e2] bg-[#f5f2f1]">
                            <h2 className="text-sm font-semibold text-[#000000] font-serif">Delete Return</h2>
                            <button onClick={() => setDeleteModal(null)} className="text-[#9ca3af] hover:text-[#505454]"><X className="w-4 h-4" /></button>
                        </div>
                        <div className="px-4 py-3">
                            <p className="text-xs text-[#505454]">
                                Are you sure you want to delete return <strong>{deleteModal.licensePlate}</strong>? This action cannot be undone.
                            </p>
                        </div>
                        <div className="flex justify-end gap-2 px-4 py-3 border-t border-[#e2e2e2] bg-[#f5f2f1]">
                            <button onClick={() => setDeleteModal(null)} className="px-3 py-1.5 text-xs rounded-[4px] border border-[#e2e2e2] text-[#505454] hover:bg-white transition-colors">Cancel</button>
                            <button onClick={handleDelete} disabled={isActionLoading} className="inline-flex items-center gap-1 px-3 py-1.5 text-xs rounded-[4px] bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 transition-colors">
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
