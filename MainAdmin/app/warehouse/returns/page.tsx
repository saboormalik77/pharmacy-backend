'use client';

import { PermissionGate } from '@/components/auth/PermissionGate';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
    Search, Plus, ChevronLeft, ChevronRight, Loader2, AlertCircle,
    Eye, X, Pause, Play, CheckCircle, Lock, Trash2, Edit,
    ClipboardList, DollarSign,
} from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { ToastContainer, Toast } from '@/components/ui/Toast';
import { formatDate } from '@/lib/utils';
import { useAppDispatch, useAppSelector } from '@/lib/store/hooks';
import { useDebounce } from '@/lib/hooks/useDebounce';
import {
    fetchReturnTransactions,
    pauseReturnTransaction,
    resumeReturnTransaction,
    completeReturnTransaction,
    deleteReturnTransaction,
    updateReturnTransaction,
} from '@/lib/store/returnTransactionsSlice';
import { ReturnTransaction } from '@/lib/types';

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

function getStatusBadge(status: string): { variant: 'success' | 'warning' | 'danger' | 'info' | 'default'; label: string } {
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

function formatCurrency(value: number): string {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
}

// ── Page ───────────────────────────────────────────────────────

export default function ReturnsPage() {
    const router = useRouter();
    const dispatch = useAppDispatch();
    const { user } = useAppSelector((state) => state.auth);
    const { transactions, pagination, isLoading, isActionLoading, error } = useAppSelector(
        (state) => state.returnTransactions
    );

    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [toasts, setToasts] = useState<Toast[]>([]);

    // Modals
    const [viewModal, setViewModal] = useState<ReturnTransaction | null>(null);
    const [editModal, setEditModal] = useState<ReturnTransaction | null>(null);
    const [deleteModal, setDeleteModal] = useState<ReturnTransaction | null>(null);
    const [actionModal, setActionModal] = useState<{ tx: ReturnTransaction; action: 'pause' | 'resume' | 'complete' } | null>(null);

    // Edit form
    const [editForm, setEditForm] = useState({ fedexTracking: '', fedexPickupConfirmation: '', notes: '' });

    const debouncedSearch = useDebounce(searchTerm, 500);

    const showToast = (message: string, type: Toast['type'] = 'success') => {
        const id = Date.now().toString();
        setToasts(prev => [...prev, { id, message, type }]);
    };
    const removeToast = (id: string) => setToasts(prev => prev.filter(t => t.id !== id));

    useEffect(() => {
        dispatch(fetchReturnTransactions({
            page: currentPage,
            limit: 20,
            search: debouncedSearch || undefined,
            status: statusFilter || undefined,
            dateFrom: dateFrom || undefined,
            dateTo: dateTo || undefined,
        }));
    }, [dispatch, currentPage, debouncedSearch, statusFilter, dateFrom, dateTo]);

    const refresh = () => {
        dispatch(fetchReturnTransactions({
            page: currentPage,
            limit: 20,
            search: debouncedSearch || undefined,
            status: statusFilter || undefined,
            dateFrom: dateFrom || undefined,
            dateTo: dateTo || undefined,
        }));
    };

    // Populate edit form when edit modal opens
    useEffect(() => {
        if (editModal) {
            setEditForm({
                fedexTracking: editModal.fedexTracking || '',
                fedexPickupConfirmation: editModal.fedexPickupConfirmation || '',
                notes: editModal.notes || '',
            });
        }
    }, [editModal]);

    // ── Action handlers ────────────────────────────────────────

    const handleStatusAction = async () => {
        if (!actionModal) return;
        const { tx, action } = actionModal;
        const thunkMap: Record<string, any> = { pause: pauseReturnTransaction, resume: resumeReturnTransaction, complete: completeReturnTransaction };
        const thunk = thunkMap[action];
        const result = await dispatch(thunk(tx.id));
        if (thunk.fulfilled.match(result)) {
            const labels: Record<string, string> = { pause: 'paused', resume: 'resumed', complete: 'completed' };
            showToast(`Return ${tx.licensePlate} ${labels[action]} successfully!`);
            setActionModal(null);
            refresh();
        } else {
            showToast(result.payload as string || `Failed to ${action} return`, 'error');
            setActionModal(null);
        }
    };

    const handleUpdate = async () => {
        if (!editModal) return;
        const result = await dispatch(updateReturnTransaction({ id: editModal.id, payload: editForm }));
        if (updateReturnTransaction.fulfilled.match(result)) {
            showToast(`Return ${editModal.licensePlate} updated!`);
            setEditModal(null);
            refresh();
        } else {
            showToast(result.payload as string || 'Failed to update', 'error');
        }
    };

    const handleDelete = async () => {
        if (!deleteModal) return;
        const result = await dispatch(deleteReturnTransaction(deleteModal.id));
        if (deleteReturnTransaction.fulfilled.match(result)) {
            showToast(`Return ${deleteModal.licensePlate} deleted!`);
            setDeleteModal(null);
            refresh();
        } else {
            showToast(result.payload as string || 'Failed to delete', 'error');
            setDeleteModal(null);
        }
    };

    const canDoAction = (tx: ReturnTransaction, action: string): boolean => {
        switch (action) {
            case 'pause': return tx.status === 'in_progress';
            case 'resume': return tx.status === 'paused';
            case 'complete': return tx.status === 'in_progress' || tx.status === 'paused';
            case 'finalize': return tx.status === 'completed';
            case 'edit': return !['finalized', 'received', 'verified', 'closed_out'].includes(tx.status);
            case 'delete': return !['finalized', 'received', 'verified', 'closed_out'].includes(tx.status);
            default: return false;
        }
    };

    // ── Stats ──────────────────────────────────────────────────

    const stats = {
        total: pagination?.totalCount ?? transactions.length,
        inProgress: transactions.filter(t => t.status === 'in_progress').length,
        completed: transactions.filter(t => t.status === 'completed').length,
        totalValue: transactions.reduce((sum, t) => sum + t.totalReturnableValue, 0),
    };

    // ── Render ─────────────────────────────────────────────────

    if (user?.role !== 'processor') {
        return (
            <PermissionGate permission="warehouse">
            <div className="border rounded-[4px] p-6 text-center" style={{ backgroundColor: 'var(--error-container)', borderColor: 'var(--outline-variant)' }}>
                <AlertCircle className="w-10 h-10 mx-auto mb-3" style={{ color: 'var(--error)' }} />
                <p className="font-medium" style={{ color: '#000000' }}>Access denied. This page is for processors only.</p>
                <Button variant="outline" className="mt-4" onClick={() => router.push('/')}>Go to Dashboard</Button>
            </div>
            </PermissionGate>
        );
    }

    return (
        <PermissionGate permission="warehouse">
        <div className="space-y-3">
            <ToastContainer toasts={toasts} onClose={removeToast} />

            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="font-heading text-headline text-[var(--on-surface)]">Return Transactions</h1>
                    <p className="text-xs text-[var(--on-surface-variant)]">Manage and track return transactions for your assigned stores</p>
                </div>
                <button onClick={() => router.push('/warehouse/returns/create')} className="inline-flex items-center gap-1 px-3 py-1.5 rounded text-xs font-medium bg-primary-600 text-white hover:bg-primary-700 transition-colors">
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
                <div className="bg-white rounded-[4px] shadow px-3 py-2">
                    <div className="flex items-center gap-1.5 mb-0.5">
                        <ClipboardList className="w-3.5 h-3.5 text-[var(--on-surface-variant)]" />
                        <span className="text-[10px] text-[var(--on-surface-variant)]">Total Returns</span>
                    </div>
                    <p className="text-sm font-bold text-[var(--on-surface)]">{stats.total}</p>
                </div>
                <div className="bg-white rounded-[4px] shadow px-3 py-2">
                    <div className="flex items-center gap-1.5 mb-0.5">
                        <Play className="w-3.5 h-3.5 text-blue-500" />
                        <span className="text-[10px] text-[var(--on-surface-variant)]">In Progress</span>
                    </div>
                    <p className="text-sm font-bold text-[var(--on-surface)]">{stats.inProgress}</p>
                </div>
                <div className="bg-white rounded-[4px] shadow px-3 py-2">
                    <div className="flex items-center gap-1.5 mb-0.5">
                        <CheckCircle className="w-3.5 h-3.5 text-green-500" />
                        <span className="text-[10px] text-[var(--on-surface-variant)]">Completed</span>
                    </div>
                    <p className="text-sm font-bold text-[var(--on-surface)]">{stats.completed}</p>
                </div>
                <div className="bg-white rounded-[4px] shadow px-3 py-2">
                    <div className="flex items-center gap-1.5 mb-0.5">
                        <DollarSign className="w-3.5 h-3.5 text-emerald-500" />
                        <span className="text-[10px] text-[var(--on-surface-variant)]">Total Value</span>
                    </div>
                    <p className="text-sm font-bold text-[var(--on-surface)]">{formatCurrency(stats.totalValue)}</p>
                </div>
            </div>

            {/* Table Card */}
            <div className="bg-white rounded-[4px] shadow">
                {/* Filters */}
                <div className="flex flex-wrap gap-2 px-3 py-2 border-b border-[var(--surface-container)]">
                    <div className="relative flex-1 min-w-[160px]">
                        <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--outline)]" />
                        <input
                            type="text"
                            placeholder="Search by license plate or store name..."
                            value={searchTerm}
                            onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                            className="w-full pl-8 pr-3 py-1.5 text-xs border border-[var(--outline-variant)] rounded focus:outline-none focus:ring-1 focus:ring-primary-500"
                        />
                    </div>
                    <select
                        value={statusFilter}
                        onChange={e => { setStatusFilter(e.target.value); setCurrentPage(1); }}
                        className="px-2.5 py-1.5 text-xs border border-[var(--outline-variant)] rounded focus:outline-none focus:ring-1 focus:ring-primary-500"
                    >
                        {STATUS_OPTIONS.map(opt => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                    </select>
                    <input
                        type="date"
                        value={dateFrom}
                        onChange={e => { setDateFrom(e.target.value); setCurrentPage(1); }}
                        className="px-2.5 py-1.5 text-xs border border-[var(--outline-variant)] rounded focus:outline-none focus:ring-1 focus:ring-primary-500"
                        title="Date from"
                    />
                    <input
                        type="date"
                        value={dateTo}
                        onChange={e => { setDateTo(e.target.value); setCurrentPage(1); }}
                        className="px-2.5 py-1.5 text-xs border border-[var(--outline-variant)] rounded focus:outline-none focus:ring-1 focus:ring-primary-500"
                        title="Date to"
                    />
                </div>

                {/* Loading */}
                {isLoading ? (
                    <div className="flex justify-center py-10">
                        <Loader2 className="w-6 h-6 animate-spin text-primary-600" />
                    </div>
                ) : transactions.length === 0 ? (
                    <div className="text-center py-10">
                        <ClipboardList className="w-10 h-10 text-[var(--outline-variant)] mx-auto mb-2" />
                        <p className="text-sm text-[var(--on-surface-variant)] font-medium mb-1">No return transactions found</p>
                        <p className="text-xs text-[var(--outline)] mb-3">
                            {searchTerm || statusFilter || dateFrom || dateTo
                                ? 'Try adjusting your filters.'
                                : 'Create your first return transaction to get started.'}
                        </p>
                        {!searchTerm && !statusFilter && (
                            <button onClick={() => router.push('/warehouse/returns/create')} className="inline-flex items-center gap-1 px-3 py-1.5 rounded text-xs font-medium bg-primary-600 text-white hover:bg-primary-700 transition-colors">
                                <Plus className="w-3.5 h-3.5" /> Create Return
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full table-auto text-sm border" style={{ borderColor: 'var(--outline)' }}>
                            <thead className="bg-[var(--surface-container-low)] border-b" style={{ borderColor: 'var(--outline)', borderBottomWidth: '1.5px' }}>
                                <tr className="bg-[var(--surface-container-low)]">
                                    <th className="text-left px-3 py-3 text-xs font-semibold uppercase tracking-wider text-[var(--on-surface-variant)] whitespace-nowrap">License Plate</th>
                                    <th className="text-left px-3 py-3 text-xs font-semibold uppercase tracking-wider text-[var(--on-surface-variant)] whitespace-nowrap">Store</th>
                                    <th className="text-left px-3 py-3 text-xs font-semibold uppercase tracking-wider text-[var(--on-surface-variant)] whitespace-nowrap">Status</th>
                                    <th className="text-left px-3 py-3 text-xs font-semibold uppercase tracking-wider text-[var(--on-surface-variant)] whitespace-nowrap">Items</th>
                                    <th className="text-left px-3 py-3 text-xs font-semibold uppercase tracking-wider text-[var(--on-surface-variant)] whitespace-nowrap">Value</th>
                                    <th className="text-left px-3 py-3 text-xs font-semibold uppercase tracking-wider text-[var(--on-surface-variant)] whitespace-nowrap">Date</th>
                                    <th className="text-right px-3 py-3 text-xs font-semibold uppercase tracking-wider text-[var(--on-surface-variant)] whitespace-nowrap">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y" style={{ borderColor: 'var(--outline-variant)' }}>
                                {transactions.map((tx) => {
                                    const badge = getStatusBadge(tx.status);
                                    return (
                                        <tr key={tx.id} className="hover:bg-[var(--surface-container)] transition-colors cursor-pointer" style={{ borderColor: 'var(--outline-variant)' }}>
                                            <td className="px-3 py-3">
                                                <span className="text-sm font-mono font-semibold text-[var(--on-surface)]">{tx.licensePlate}</span>
                                            </td>
                                            <td className="px-3 py-3">
                                                <p className="text-sm font-medium text-[var(--on-surface)] truncate max-w-[140px]">{tx.pharmacyName || '—'}</p>
                                            </td>
                                            <td className="px-3 py-3">
                                                <Badge variant={badge.variant}><span className="text-[10px]">{badge.label}</span></Badge>
                                            </td>
                                            <td className="px-3 py-3 text-sm text-[var(--on-primary-container)]">{tx.totalItems}</td>
                                            <td className="px-3 py-3 text-sm text-[var(--on-surface)] font-medium">{formatCurrency(tx.totalReturnableValue)}</td>
                                            <td className="px-3 py-3 text-sm text-[var(--on-surface-variant)]">{formatDate(tx.createdAt)}</td>
                                            <td className="px-3 py-3" onClick={e => e.stopPropagation()}>
                                                <div className="flex items-center justify-end gap-0.5">
                                                    <button onClick={() => setViewModal(tx)} className="p-1 text-[var(--outline)] hover:text-primary-600 hover:bg-primary-50 rounded" title="View Details">
                                                        <Eye className="w-3.5 h-3.5" />
                                                    </button>
                                                    {canDoAction(tx, 'edit') && (
                                                        <button onClick={() => setEditModal(tx)} className="p-1 text-[var(--outline)] hover:text-blue-600 hover:bg-blue-50 rounded" title="Edit">
                                                            <Edit className="w-3.5 h-3.5" />
                                                        </button>
                                                    )}
                                                    {canDoAction(tx, 'pause') && (
                                                        <button onClick={() => setActionModal({ tx, action: 'pause' })} className="p-1 text-[var(--outline)] hover:text-yellow-600 hover:bg-yellow-50 rounded" title="Pause">
                                                            <Pause className="w-3.5 h-3.5" />
                                                        </button>
                                                    )}
                                                    {canDoAction(tx, 'resume') && (
                                                        <button onClick={() => setActionModal({ tx, action: 'resume' })} className="p-1 text-[var(--outline)] hover:text-green-600 hover:bg-green-50 rounded" title="Resume">
                                                            <Play className="w-3.5 h-3.5" />
                                                        </button>
                                                    )}
                                                    {canDoAction(tx, 'complete') && (
                                                        <button onClick={() => setActionModal({ tx, action: 'complete' })} className="p-1 text-[var(--outline)] hover:text-green-600 hover:bg-green-50 rounded" title="Mark Complete">
                                                            <CheckCircle className="w-3.5 h-3.5" />
                                                        </button>
                                                    )}
                                                    {canDoAction(tx, 'finalize') && (
                                                        <button onClick={() => router.push(`/warehouse/returns/${tx.id}`)} className="p-1 text-[var(--outline)] hover:text-purple-600 hover:bg-purple-50 rounded" title="Finalize">
                                                            <Lock className="w-3.5 h-3.5" />
                                                        </button>
                                                    )}
                                                    {canDoAction(tx, 'delete') && (
                                                        <button onClick={() => setDeleteModal(tx)} className="p-1 text-[var(--outline)] hover:text-red-600 hover:bg-red-50 rounded" title="Delete">
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
                    <div className="flex items-center justify-between px-3 py-2 border-t border-[var(--surface-container)] bg-[var(--surface-container-low)]">
                        <p className="text-[10px] text-[var(--on-surface-variant)]">
                            Page {pagination.page} of {pagination.totalPages} ({pagination.totalCount} total)
                        </p>
                        <div className="flex items-center gap-1.5">
                            <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={!pagination.hasPreviousPage} className="p-1 border border-[var(--outline-variant)] rounded disabled:opacity-40 hover:bg-[var(--surface-container-low)]">
                                <ChevronLeft className="w-3.5 h-3.5" />
                            </button>
                            <span className="text-xs font-medium text-[var(--on-surface)] px-1">{currentPage}</span>
                            <button onClick={() => setCurrentPage(p => p + 1)} disabled={!pagination.hasNextPage} className="p-1 border border-[var(--outline-variant)] rounded disabled:opacity-40 hover:bg-[var(--surface-container-low)]">
                                <ChevronRight className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* ── View Detail Modal ────────────────────────── */}
            {viewModal && (
                <div className="fixed inset-0 bg-gray-900/50 flex items-center justify-center z-50 p-4" onClick={() => setViewModal(null)}>
                    <div className="bg-white rounded-[4px] max-w-lg w-full shadow-xl max-h-[88vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--outline-variant)] bg-[var(--surface-container-low)] sticky top-0">
                            <h2 className="text-sm font-semibold text-[var(--on-surface)]">Return Details</h2>
                            <button onClick={() => setViewModal(null)} className="text-[var(--outline)] hover:text-[var(--on-primary-container)]"><X className="w-4 h-4" /></button>
                        </div>
                        <div className="px-4 py-3 space-y-3">
                            <div className="flex items-center gap-2">
                                <span className="text-sm font-mono font-bold text-[var(--on-surface)]">{viewModal.licensePlate}</span>
                                <Badge variant={getStatusBadge(viewModal.status).variant}><span className="text-[10px]">{getStatusBadge(viewModal.status).label}</span></Badge>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                {[
                                    { label: 'Store', value: viewModal.pharmacyName || '—' },
                                    { label: 'Processor', value: viewModal.processorName || '—' },
                                    { label: 'Service Type', value: viewModal.serviceType.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) },
                                    { label: 'Total Items', value: String(viewModal.totalItems) },
                                    { label: 'Returnable Value', value: formatCurrency(viewModal.totalReturnableValue), className: 'text-green-700' },
                                    { label: 'Non-Returnable', value: formatCurrency(viewModal.totalNonReturnableValue), className: 'text-red-700' },
                                    { label: 'Created', value: formatDate(viewModal.createdAt) },
                                    { label: 'Updated', value: formatDate(viewModal.updatedAt) },
                                ].map(({ label, value, className }) => (
                                    <div key={label}>
                                        <p className="text-[10px] text-[var(--outline)]">{label}</p>
                                        <p className={`text-xs font-medium text-[var(--on-surface)] ${className || ''}`}>{value}</p>
                                    </div>
                                ))}
                            </div>
                            {(viewModal.fedexTracking || viewModal.fedexPickupConfirmation) && (
                                <div className="border-t border-[var(--surface-container)] pt-2">
                                    <p className="text-[10px] font-medium text-[var(--outline)] mb-1.5 uppercase">Shipping</p>
                                    <div className="grid grid-cols-2 gap-2">
                                        <div><p className="text-[10px] text-[var(--outline)]">FedEx Tracking</p><p className="text-xs font-medium">{viewModal.fedexTracking || '—'}</p></div>
                                        <div><p className="text-[10px] text-[var(--outline)]">Pickup Confirmation</p><p className="text-xs font-medium">{viewModal.fedexPickupConfirmation || '—'}</p></div>
                                    </div>
                                </div>
                            )}
                            {viewModal.notes && (
                                <div className="border-t border-[var(--surface-container)] pt-2">
                                    <p className="text-[10px] font-medium text-[var(--outline)] mb-1">Notes</p>
                                    <p className="text-xs text-[var(--on-surface)]">{viewModal.notes}</p>
                                </div>
                            )}
                            {viewModal.finalizedAt && (
                                <div className="border-t border-[var(--surface-container)] pt-2">
                                    <p className="text-[10px] text-[var(--outline)]">Finalized on {formatDate(viewModal.finalizedAt)}</p>
                                </div>
                            )}
                        </div>
                        <div className="flex justify-end px-4 py-3 border-t border-[var(--outline-variant)] bg-[var(--surface-container-low)]">
                            <button onClick={() => setViewModal(null)} className="px-3 py-1.5 text-xs rounded border border-[var(--outline-variant)] text-[var(--on-surface)] hover:bg-[var(--surface-container-low)] transition-colors">Close</button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Edit Modal ────────────────────────────────── */}
            {editModal && (
                <div className="fixed inset-0 bg-gray-900/50 flex items-center justify-center z-50 p-4" onClick={() => setEditModal(null)}>
                    <div className="bg-white rounded-[4px] max-w-md w-full shadow-xl" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--outline-variant)] bg-[var(--surface-container-low)]">
                            <h2 className="text-sm font-semibold text-[var(--on-surface)]">Edit Return — {editModal.licensePlate}</h2>
                            <button onClick={() => setEditModal(null)} className="text-[var(--outline)] hover:text-[var(--on-primary-container)]"><X className="w-4 h-4" /></button>
                        </div>
                        <div className="px-4 py-3 space-y-2.5">
                            <div>
                                <label className="block text-xs font-medium text-[var(--on-surface)] mb-0.5">FedEx Tracking Number</label>
                                <input type="text" value={editForm.fedexTracking} onChange={e => setEditForm({ ...editForm, fedexTracking: e.target.value })} className="w-full px-2.5 py-1.5 text-xs border border-[var(--outline-variant)] rounded focus:outline-none focus:ring-1 focus:ring-primary-500" placeholder="Enter tracking number" />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-[var(--on-surface)] mb-0.5">FedEx Pickup Confirmation</label>
                                <input type="text" value={editForm.fedexPickupConfirmation} onChange={e => setEditForm({ ...editForm, fedexPickupConfirmation: e.target.value })} className="w-full px-2.5 py-1.5 text-xs border border-[var(--outline-variant)] rounded focus:outline-none focus:ring-1 focus:ring-primary-500" placeholder="Enter pickup confirmation" />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-[var(--on-surface)] mb-0.5">Notes</label>
                                <textarea value={editForm.notes} onChange={e => setEditForm({ ...editForm, notes: e.target.value })} rows={2} className="w-full px-2.5 py-1.5 text-xs border border-[var(--outline-variant)] rounded focus:outline-none focus:ring-1 focus:ring-primary-500 resize-none" placeholder="Optional notes" />
                            </div>
                        </div>
                        <div className="flex justify-end gap-2 px-4 py-3 border-t border-[var(--outline-variant)] bg-[var(--surface-container-low)]">
                            <button onClick={() => setEditModal(null)} className="px-3 py-1.5 text-xs rounded border border-[var(--outline-variant)] text-[var(--on-surface)] hover:bg-[var(--surface-container-low)] transition-colors">Cancel</button>
                            <button onClick={handleUpdate} disabled={isActionLoading} className="inline-flex items-center gap-1 px-3 py-1.5 text-xs rounded bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-50 transition-colors">
                                {isActionLoading ? <><Loader2 className="w-3.5 h-3.5 animate-spin" />Saving...</> : 'Save Changes'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Status Action Modal ──────────── */}
            {actionModal && (
                <div className="fixed inset-0 bg-gray-900/50 flex items-center justify-center z-50 p-4" onClick={() => setActionModal(null)}>
                    <div className="bg-white rounded-[4px] max-w-sm w-full shadow-xl" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--outline-variant)] bg-[var(--surface-container-low)]">
                            <h2 className="text-sm font-semibold text-[var(--on-surface)]">
                                {actionModal.action === 'pause' && 'Pause Return'}
                                {actionModal.action === 'resume' && 'Resume Return'}
                                {actionModal.action === 'complete' && 'Mark as Completed'}
                            </h2>
                            <button onClick={() => setActionModal(null)} className="text-[var(--outline)] hover:text-[var(--on-primary-container)]"><X className="w-4 h-4" /></button>
                        </div>
                        <div className="px-4 py-3">
                            <p className="text-xs text-[var(--on-surface)]">
                                Are you sure you want to <strong>{actionModal.action}</strong> return <strong>{actionModal.tx.licensePlate}</strong>?
                            </p>
                        </div>
                        <div className="flex justify-end gap-2 px-4 py-3 border-t border-[var(--outline-variant)] bg-[var(--surface-container-low)]">
                            <button onClick={() => setActionModal(null)} className="px-3 py-1.5 text-xs rounded border border-[var(--outline-variant)] text-[var(--on-surface)] hover:bg-[var(--surface-container-low)] transition-colors">Cancel</button>
                            <button onClick={handleStatusAction} disabled={isActionLoading} className="inline-flex items-center gap-1 px-3 py-1.5 text-xs rounded bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-50 transition-colors">
                                {isActionLoading ? <><Loader2 className="w-3.5 h-3.5 animate-spin" />Processing...</> : 'Confirm'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Delete Modal ─────────────────── */}
            {deleteModal && (
                <div className="fixed inset-0 bg-gray-900/50 flex items-center justify-center z-50 p-4" onClick={() => setDeleteModal(null)}>
                    <div className="bg-white rounded-[4px] max-w-sm w-full shadow-xl" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--outline-variant)] bg-[var(--surface-container-low)]">
                            <h2 className="text-sm font-semibold text-[var(--on-surface)]">Delete Return</h2>
                            <button onClick={() => setDeleteModal(null)} className="text-[var(--outline)] hover:text-[var(--on-primary-container)]"><X className="w-4 h-4" /></button>
                        </div>
                        <div className="px-4 py-3">
                            <p className="text-xs text-[var(--on-surface)]">
                                Are you sure you want to delete return <strong>{deleteModal.licensePlate}</strong>? This action cannot be undone.
                            </p>
                        </div>
                        <div className="flex justify-end gap-2 px-4 py-3 border-t border-[var(--outline-variant)] bg-[var(--surface-container-low)]">
                            <button onClick={() => setDeleteModal(null)} className="px-3 py-1.5 text-xs rounded border border-[var(--outline-variant)] text-[var(--on-surface)] hover:bg-[var(--surface-container-low)] transition-colors">Cancel</button>
                            <button onClick={handleDelete} disabled={isActionLoading} className="inline-flex items-center gap-1 px-3 py-1.5 text-xs rounded bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 transition-colors">
                                {isActionLoading ? <><Loader2 className="w-3.5 h-3.5 animate-spin" />Deleting...</> : 'Delete'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
        </PermissionGate>
    );
}
