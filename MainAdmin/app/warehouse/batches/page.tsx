'use client';

import { PermissionGate } from '@/components/auth/PermissionGate';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
    Plus, Loader2, AlertCircle, ChevronLeft, ChevronRight,
    Layers, CheckCircle, Send, Calendar, Lock,
} from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { ToastContainer, Toast } from '@/components/ui/Toast';
import { formatDate } from '@/lib/utils';
import { useAppDispatch, useAppSelector } from '@/lib/store/hooks';
import { fetchBatches, createBatch, clearError, fetchUsedBatchMonths } from '@/lib/store/batchSlice';
import { buildAvailableBatchMonthOptions } from '@/lib/utils/batchMonths';

const STATUS_OPTIONS = [
    { value: '', label: 'All Statuses' },
    { value: 'open', label: 'Open' },
    { value: 'closed', label: 'Closed' },
    { value: 'submitted', label: 'Submitted' },
];

function getStatusBadge(status: string): { label: string; variant: 'success' | 'warning' | 'info' | 'default' } {
    switch (status) {
        case 'open': return { label: 'Open', variant: 'warning' };
        case 'closed': return { label: 'Closed', variant: 'info' };
        case 'submitted': return { label: 'Submitted', variant: 'success' };
        default: return { label: status, variant: 'default' };
    }
}

function formatCurrency(value: number): string {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
}

function formatBatchMonth(dateStr: string): string {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
}

export default function BatchesPage() {
    const router = useRouter();
    const dispatch = useAppDispatch();
    const { batches, batchPagination, isLoading, isActionLoading, error } = useAppSelector(s => s.batch);

    const [statusFilter, setStatusFilter] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [toasts, setToasts] = useState<Toast[]>([]);
    const [showCreate, setShowCreate] = useState(false);
    const [newBatch, setNewBatch] = useState({ batchMonth: '', batchName: '' });
    const [usedBatchMonths, setUsedBatchMonths] = useState<string[]>([]);
    const [usedMonthsLoading, setUsedMonthsLoading] = useState(false);

    const addToast = useCallback((message: string, type: Toast['type']) => {
        setToasts(prev => [...prev, { id: Date.now().toString(), message, type }]);
    }, []);

    const loadBatches = useCallback(() => {
        dispatch(fetchBatches({
            status: statusFilter || undefined,
            page: currentPage,
            limit: 10,
        }));
    }, [dispatch, statusFilter, currentPage]);

    useEffect(() => { loadBatches(); }, [loadBatches]);

    useEffect(() => { if (error) { addToast(error, 'error'); dispatch(clearError()); } }, [error, addToast, dispatch]);

    const loadUsedMonthsForModal = useCallback(async () => {
        setUsedMonthsLoading(true);
        try {
            const months = await dispatch(fetchUsedBatchMonths()).unwrap();
            setUsedBatchMonths(months);
        } catch {
            setUsedBatchMonths([]);
            addToast('Could not load batch months. Try again.', 'error');
        } finally {
            setUsedMonthsLoading(false);
        }
    }, [dispatch, addToast]);

    const openCreateBatchModal = useCallback(() => {
        setNewBatch({ batchMonth: '', batchName: '' });
        setShowCreate(true);
        void loadUsedMonthsForModal();
    }, [loadUsedMonthsForModal]);

    const availableBatchMonths = useMemo(
        () => buildAvailableBatchMonthOptions(usedBatchMonths),
        [usedBatchMonths]
    );

    const handleCreate = async () => {
        if (!newBatch.batchMonth) { addToast('Please select a batch month', 'warning'); return; }
        const result = await dispatch(createBatch({
            batchMonth: newBatch.batchMonth + '-01',
            batchName: newBatch.batchName || undefined,
        }));
        if (createBatch.fulfilled.match(result)) {
            addToast('Batch created successfully', 'success');
            setShowCreate(false);
            setNewBatch({ batchMonth: '', batchName: '' });
            loadBatches();
            router.push(`/warehouse/batches/${result.payload.id}`);
        }
    };

    const totalPages = batchPagination?.totalPages || 1;

    const stats = {
        total: batches.length,
        open: batches.filter(b => b.status === 'open').length,
        closed: batches.filter(b => b.status === 'closed').length,
        submitted: batches.filter(b => b.status === 'submitted').length,
    };

    const statusPillStyle = (status: string): React.CSSProperties => {
        switch (status) {
            case 'open':
                return { backgroundColor: 'var(--tertiary-fixed)', color: 'var(--on-tertiary-container)', borderColor: 'var(--outline-variant)' };
            case 'closed':
                return { backgroundColor: 'var(--surface-container-low)', color: 'var(--primary)', borderColor: 'var(--outline-variant)' };
            case 'submitted':
                return { backgroundColor: 'var(--secondary-container)', color: 'var(--on-secondary-container)', borderColor: 'var(--outline-variant)' };
            default:
                return { backgroundColor: 'var(--surface-container-low)', color: 'var(--on-surface-variant)', borderColor: 'var(--outline-variant)' };
        }
    };

    const cardinalPillStyle = (state: 'submitted' | 'file_ready' | 'pending'): React.CSSProperties => {
        if (state === 'submitted') return { backgroundColor: 'var(--secondary-container)', color: 'var(--on-secondary-container)', borderColor: 'var(--outline-variant)' };
        if (state === 'file_ready') return { backgroundColor: 'var(--primary-container)', color: 'var(--on-primary-container)', borderColor: 'var(--outline-variant)' };
        return { backgroundColor: 'var(--surface-container-low)', color: 'var(--on-surface-variant)', borderColor: 'var(--outline-variant)' };
    };

    return (
        <PermissionGate permission="warehouse">
        <div className="space-y-3">
            <ToastContainer toasts={toasts} onClose={id => setToasts(t => t.filter(x => x.id !== id))} />

            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <Link href="/warehouse" className="inline-flex items-center gap-1 text-[11px] hover:text-primary-600 mb-1.5 transition-colors" style={{ color: 'var(--outline)' }}>
                        <ChevronLeft className="w-3 h-3" /> Back to Warehouse
                    </Link>
                    <h1 className="font-heading text-headline" style={{ color: 'var(--foreground)' }}>Monthly Batches</h1>
                    <p className="text-xs" style={{ color: 'var(--on-surface-variant)' }}>Manage return batches and close-outs</p>
                </div>
                <button
                    type="button"
                    onClick={openCreateBatchModal}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-[4px] text-xs font-medium transition-colors"
                    style={{ backgroundColor: 'var(--primary)', color: 'var(--on-primary)' }}
                >
                    <Plus className="w-3.5 h-3.5" /> New Batch
                </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {[
                    { icon: Layers, iconColor: 'var(--outline)', label: 'Total', value: stats.total, valueStyle: {} as React.CSSProperties },
                    { icon: Calendar, iconColor: 'var(--tertiary)', label: 'Open', value: stats.open, valueStyle: { color: 'var(--tertiary)' } as React.CSSProperties },
                    { icon: CheckCircle, iconColor: 'var(--primary)', label: 'Closed', value: stats.closed, valueStyle: { color: 'var(--primary)' } as React.CSSProperties },
                    { icon: Send, iconColor: 'var(--secondary)', label: 'Submitted', value: stats.submitted, valueStyle: { color: 'var(--secondary)' } as React.CSSProperties },
                ].map(({ icon: Icon, iconColor, label, value, valueStyle }) => (
                    <div key={label} className="rounded-[4px] shadow px-3 py-2 border" style={{ backgroundColor: 'var(--surface-container-lowest)', borderColor: 'var(--outline-variant)' }}>
                        <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-[4px] flex items-center justify-center flex-shrink-0 border" style={{ backgroundColor: 'var(--surface-container-low)', borderColor: 'var(--outline-variant)' }}><Icon className="w-3.5 h-3.5" style={{ color: iconColor }} /></div>
                            <div><p className="text-[10px]" style={{ color: 'var(--on-surface-variant)' }}>{label}</p><p className="text-base font-bold" style={{ color: 'var(--foreground)', ...valueStyle }}>{value}</p></div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Filters */}
            <div className="rounded-[4px] shadow px-3 py-2 border" style={{ backgroundColor: 'var(--surface-container-lowest)', borderColor: 'var(--outline-variant)' }}>
                <select
                    className="border rounded-[4px] px-2.5 py-1 text-xs focus:ring-1 focus:ring-primary-500 focus:border-transparent"
                    style={{ borderColor: 'var(--outline-variant)', backgroundColor: 'var(--surface-container-low)' }}
                    value={statusFilter}
                    onChange={e => { setStatusFilter(e.target.value); setCurrentPage(1); }}
                >
                    {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
            </div>

            {/* Table */}
            <div className="rounded-[4px] shadow overflow-hidden border" style={{ backgroundColor: 'var(--surface-container-lowest)', borderColor: 'var(--outline-variant)' }}>
                {isLoading ? (
                    <div className="flex items-center justify-center py-14">
                        <Loader2 className="w-6 h-6 animate-spin" style={{ color: 'var(--primary)' }} />
                    </div>
                ) : batches.length === 0 ? (
                    <div className="text-center py-14" style={{ color: 'var(--on-surface-variant)' }}>
                        <Layers className="w-10 h-10 mx-auto mb-2" style={{ color: 'var(--outline-variant)' }} />
                        <p className="text-sm font-medium">No batches found</p>
                        <p className="text-xs mt-0.5">Create a new batch to get started.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full text-sm border" style={{ borderColor: 'var(--outline)' }}>
                            <thead className="bg-[var(--surface-container-low)] border-b" style={{ borderColor: 'var(--outline)', borderBottomWidth: '1.5px' }}>
                                <tr className="bg-[var(--surface-container-low)]">
                                    <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--on-surface-variant)] whitespace-nowrap">Batch Month</th>
                                    <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--on-surface-variant)] whitespace-nowrap">Name</th>
                                    <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--on-surface-variant)] whitespace-nowrap">Status</th>
                                    <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--on-surface-variant)] whitespace-nowrap">Returns</th>
                                    <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--on-surface-variant)] whitespace-nowrap">Debit Memos</th>
                                    <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--on-surface-variant)] whitespace-nowrap">Total Value</th>
                                    <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--on-surface-variant)] whitespace-nowrap">Cardinal</th>
                                    <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--on-surface-variant)] whitespace-nowrap">Created</th>
                                    <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--on-surface-variant)] whitespace-nowrap">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y" style={{ borderColor: 'var(--outline-variant)' }}>
                                {batches.map(batch => {
                                    const sb = getStatusBadge(batch.status);
                                    return (
                                        <tr
                                            key={batch.id}
                                            onClick={() => router.push(`/warehouse/batches/${batch.id}`)}
                                            className="h-16 cursor-pointer transition-colors hover:bg-[var(--surface-container)]"
                                            style={{ borderColor: 'var(--outline-variant)' }}
                                        >
                                            <td className="px-3 py-3 text-sm font-medium whitespace-nowrap" style={{ color: 'var(--foreground)' }}>
                                                {formatBatchMonth(batch.batchMonth)}
                                            </td>
                                            <td className="px-3 py-3 text-sm whitespace-nowrap" style={{ color: 'var(--on-surface)' }}>
                                                {batch.batchName}
                                            </td>
                                            <td className="px-3 py-3 whitespace-nowrap">
                                                <span className="inline-flex items-center px-2 py-0.5 rounded-[4px] border text-[10px] font-medium" style={statusPillStyle(batch.status)}>
                                                    {sb.label}
                                                </span>
                                            </td>
                                            <td className="px-3 py-3 text-sm whitespace-nowrap" style={{ color: 'var(--on-surface)' }}>
                                                {batch.totalReturns}
                                            </td>
                                            <td className="px-3 py-3 text-sm whitespace-nowrap" style={{ color: 'var(--on-surface)' }}>
                                                {batch.totalDebitMemos}
                                            </td>
                                            <td className="px-3 py-3 text-sm font-medium whitespace-nowrap" style={{ color: 'var(--foreground)' }}>
                                                {formatCurrency(batch.totalValue)}
                                            </td>
                                            <td className="px-3 py-3 whitespace-nowrap">
                                                {batch.cardinalSubmittedAt ? (
                                                    <span className="inline-flex items-center px-2 py-0.5 rounded-[4px] border text-[10px] font-medium" style={cardinalPillStyle('submitted')}>
                                                        Submitted
                                                    </span>
                                                ) : batch.cardinalFileGenerated ? (
                                                    <span className="inline-flex items-center px-2 py-0.5 rounded-[4px] border text-[10px] font-medium" style={cardinalPillStyle('file_ready')}>
                                                        File Ready
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center px-2 py-0.5 rounded-[4px] border text-[10px] font-medium" style={cardinalPillStyle('pending')}>
                                                        Pending
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-3 py-3 text-sm whitespace-nowrap" style={{ color: 'var(--on-surface-variant)' }}>
                                                {formatDate(batch.createdAt)}
                                            </td>
                                            <td className="px-3 py-3 whitespace-nowrap" onClick={e => e.stopPropagation()}>
                                                {batch.status === 'open' && (
                                                    <button
                                                        onClick={() => router.push(`/warehouse/batches/${batch.id}?action=closeout`)}
                                                        className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold rounded-[4px] border transition-colors"
                                                        style={{ backgroundColor: 'var(--tertiary-fixed)', color: 'var(--on-tertiary-container)', borderColor: 'var(--outline-variant)' }}
                                                    >
                                                        <Lock className="w-3 h-3" /> Closeout
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="flex items-center justify-between px-3 py-2 border-t" style={{ borderColor: 'var(--outline-variant)', backgroundColor: 'var(--surface-container-low)' }}>
                        <p className="text-[10px]" style={{ color: 'var(--on-surface-variant)' }}>
                            Page {currentPage} of {totalPages}{batchPagination?.total != null && ` · ${batchPagination.total} batches`}
                        </p>
                        <div className="flex items-center gap-1.5">
                            <button disabled={currentPage <= 1} onClick={() => setCurrentPage(p => p - 1)} className="p-1 rounded-[4px] border disabled:opacity-40 transition-colors" style={{ borderColor: 'var(--outline-variant)', backgroundColor: 'var(--surface-container-lowest)' }}>
                                <ChevronLeft className="w-3.5 h-3.5" style={{ color: 'var(--on-surface-variant)' }} />
                            </button>
                            <button disabled={currentPage >= totalPages} onClick={() => setCurrentPage(p => p + 1)} className="p-1 rounded-[4px] border disabled:opacity-40 transition-colors" style={{ borderColor: 'var(--outline-variant)', backgroundColor: 'var(--surface-container-lowest)' }}>
                                <ChevronRight className="w-3.5 h-3.5" style={{ color: 'var(--on-surface-variant)' }} />
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Create Batch Modal */}
            {showCreate && (
                <div className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm" style={{ backgroundColor: 'color-mix(in srgb, var(--inverse-surface) 55%, transparent)' }} onClick={() => setShowCreate(false)}>
                    <div className="rounded-[4px] shadow-xl max-w-sm w-full mx-4 p-5 border" style={{ backgroundColor: 'var(--surface-container-lowest)', borderColor: 'var(--outline-variant)' }} onClick={e => e.stopPropagation()}>
                        <h2 className="font-heading text-body font-bold mb-3" style={{ color: 'var(--foreground)' }}>Create New Batch</h2>

                        <div className="space-y-3">
                            <div>
                                <label className="block text-xs font-medium mb-1" style={{ color: 'var(--on-surface)' }}>Batch Month <span style={{ color: 'var(--error)' }}>*</span></label>
                                {usedMonthsLoading ? (
                                    <div className="flex items-center gap-2 py-2 text-xs" style={{ color: 'var(--on-surface-variant)' }}>
                                        <Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading months…
                                    </div>
                                ) : availableBatchMonths.length === 0 ? (
                                    <p className="text-xs border rounded-[4px] px-2.5 py-2" style={{ color: 'var(--on-tertiary-container)', backgroundColor: 'var(--tertiary-fixed)', borderColor: 'var(--outline-variant)' }}>
                                        Every month in the allowed range already has a batch. Delete an open unused batch or contact support to add a month outside the window.
                                    </p>
                                ) : (
                                    <select
                                        className="w-full border rounded-[4px] px-2.5 py-1.5 text-xs focus:ring-1 focus:ring-primary-500 focus:border-transparent"
                                        style={{ borderColor: 'var(--outline-variant)', backgroundColor: 'var(--surface-container-low)' }}
                                        value={newBatch.batchMonth}
                                        onChange={e => setNewBatch(prev => ({ ...prev, batchMonth: e.target.value }))}
                                    >
                                        <option value="">Select month…</option>
                                        {availableBatchMonths.map(o => (
                                            <option key={o.value} value={o.value}>{o.label}</option>
                                        ))}
                                    </select>
                                )}
                            </div>
                            <div>
                                <label className="block text-xs font-medium mb-1" style={{ color: 'var(--on-surface)' }}>Batch Name <span className="font-normal" style={{ color: 'var(--on-surface-variant)' }}>(optional)</span></label>
                                <input
                                    type="text"
                                    className="w-full border rounded-[4px] px-2.5 py-1.5 text-xs focus:ring-1 focus:ring-primary-500 focus:border-transparent"
                                    style={{ borderColor: 'var(--outline-variant)', backgroundColor: 'var(--surface-container-low)' }}
                                    placeholder="e.g. March 2026 Returns"
                                    value={newBatch.batchName}
                                    onChange={e => setNewBatch(prev => ({ ...prev, batchName: e.target.value }))}
                                />
                            </div>
                        </div>

                        <div className="flex justify-end gap-2 mt-4">
                            <button onClick={() => setShowCreate(false)} className="px-3 py-1.5 text-xs rounded-[4px] border transition-colors" style={{ borderColor: 'var(--outline-variant)', color: 'var(--on-surface)', backgroundColor: 'var(--surface-container-lowest)' }}>Cancel</button>
                            <button
                                onClick={handleCreate}
                                disabled={isActionLoading || usedMonthsLoading || availableBatchMonths.length === 0}
                                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs rounded-[4px] disabled:opacity-50 transition-colors"
                                style={{ backgroundColor: 'var(--primary)', color: 'var(--on-primary)' }}
                            >
                                {isActionLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                                Create Batch
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
        </PermissionGate>
    );
}
