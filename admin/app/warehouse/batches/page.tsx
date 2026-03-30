'use client';

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
            limit: 20,
        }));
    }, [dispatch, statusFilter, currentPage]);

    useEffect(() => { loadBatches(); }, [loadBatches]);

    useEffect(() => { if (error) { addToast(error, 'error'); dispatch(clearError()); } }, [error, addToast, dispatch]);

    useEffect(() => {
        if (!showCreate) return;
        let cancelled = false;
        setUsedMonthsLoading(true);
        dispatch(fetchUsedBatchMonths())
            .unwrap()
            .then((months) => { if (!cancelled) setUsedBatchMonths(months); })
            .catch(() => { if (!cancelled) setUsedBatchMonths([]); })
            .finally(() => { if (!cancelled) setUsedMonthsLoading(false); });
        return () => { cancelled = true; };
    }, [showCreate, dispatch]);

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
        }
    };

    const totalPages = batchPagination?.totalPages || 1;

    const stats = {
        total: batches.length,
        open: batches.filter(b => b.status === 'open').length,
        closed: batches.filter(b => b.status === 'closed').length,
        submitted: batches.filter(b => b.status === 'submitted').length,
    };

    return (
        <div className="space-y-3">
            <ToastContainer toasts={toasts} onClose={id => setToasts(t => t.filter(x => x.id !== id))} />

            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <Link href="/warehouse" className="inline-flex items-center gap-1 text-[11px] text-gray-400 hover:text-primary-600 mb-1.5 transition-colors">
                        <ChevronLeft className="w-3 h-3" /> Back to Warehouse
                    </Link>
                    <h1 className="text-lg font-bold text-gray-900">Monthly Batches</h1>
                    <p className="text-xs text-gray-500">Manage return batches and close-outs</p>
                </div>
                <button
                    onClick={() => {
                        setNewBatch({ batchMonth: '', batchName: '' });
                        setShowCreate(true);
                    }}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded text-xs font-medium bg-primary-600 text-white hover:bg-primary-700 transition-colors"
                >
                    <Plus className="w-3.5 h-3.5" /> New Batch
                </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {[
                    { icon: Layers, bg: 'bg-gray-100', color: 'text-gray-600', label: 'Total', value: stats.total, valueColor: '' },
                    { icon: Calendar, bg: 'bg-yellow-100', color: 'text-yellow-600', label: 'Open', value: stats.open, valueColor: 'text-yellow-600' },
                    { icon: CheckCircle, bg: 'bg-blue-100', color: 'text-blue-600', label: 'Closed', value: stats.closed, valueColor: 'text-blue-600' },
                    { icon: Send, bg: 'bg-green-100', color: 'text-green-600', label: 'Submitted', value: stats.submitted, valueColor: 'text-green-600' },
                ].map(({ icon: Icon, bg, color, label, value, valueColor }) => (
                    <div key={label} className="bg-white rounded-lg shadow px-3 py-2">
                        <div className="flex items-center gap-2">
                            <div className={`w-7 h-7 ${bg} rounded flex items-center justify-center flex-shrink-0`}><Icon className={`w-3.5 h-3.5 ${color}`} /></div>
                            <div><p className="text-[10px] text-gray-500">{label}</p><p className={`text-base font-bold ${valueColor}`}>{value}</p></div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Filters */}
            <div className="bg-white rounded-lg shadow px-3 py-2">
                <select
                    className="border border-gray-300 rounded px-2.5 py-1 text-xs focus:ring-1 focus:ring-primary-500 focus:border-transparent"
                    value={statusFilter}
                    onChange={e => { setStatusFilter(e.target.value); setCurrentPage(1); }}
                >
                    {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
            </div>

            {/* Table */}
            <div className="bg-white rounded-lg shadow overflow-hidden">
                {isLoading ? (
                    <div className="flex items-center justify-center py-14">
                        <Loader2 className="w-6 h-6 animate-spin text-primary-500" />
                    </div>
                ) : batches.length === 0 ? (
                    <div className="text-center py-14 text-gray-500">
                        <Layers className="w-10 h-10 mx-auto mb-2 text-gray-300" />
                        <p className="text-sm font-medium">No batches found</p>
                        <p className="text-xs mt-0.5">Create a new batch to get started.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full">
                            <thead className="bg-gray-50 border-b border-gray-200">
                                <tr>
                                    <th className="px-3 py-1.5 text-left text-[10px] font-semibold text-gray-500 uppercase">Batch Month</th>
                                    <th className="px-3 py-1.5 text-left text-[10px] font-semibold text-gray-500 uppercase">Name</th>
                                    <th className="px-3 py-1.5 text-left text-[10px] font-semibold text-gray-500 uppercase">Status</th>
                                    <th className="px-3 py-1.5 text-left text-[10px] font-semibold text-gray-500 uppercase">Returns</th>
                                    <th className="px-3 py-1.5 text-left text-[10px] font-semibold text-gray-500 uppercase">Debit Memos</th>
                                    <th className="px-3 py-1.5 text-left text-[10px] font-semibold text-gray-500 uppercase">Total Value</th>
                                    <th className="px-3 py-1.5 text-left text-[10px] font-semibold text-gray-500 uppercase">Cardinal</th>
                                    <th className="px-3 py-1.5 text-left text-[10px] font-semibold text-gray-500 uppercase">Created</th>
                                    <th className="px-3 py-1.5 text-left text-[10px] font-semibold text-gray-500 uppercase">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {batches.map(batch => {
                                    const sb = getStatusBadge(batch.status);
                                    return (
                                        <tr
                                            key={batch.id}
                                            onClick={() => router.push(`/warehouse/batches/${batch.id}`)}
                                            className="hover:bg-gray-50 cursor-pointer transition-colors"
                                        >
                                            <td className="px-3 py-1.5 text-xs font-medium text-gray-900 whitespace-nowrap">
                                                {formatBatchMonth(batch.batchMonth)}
                                            </td>
                                            <td className="px-3 py-1.5 text-xs text-gray-700 whitespace-nowrap">
                                                {batch.batchName}
                                            </td>
                                            <td className="px-3 py-1.5 whitespace-nowrap">
                                                <Badge variant={sb.variant}><span className="text-[10px]">{sb.label}</span></Badge>
                                            </td>
                                            <td className="px-3 py-1.5 text-xs text-gray-700 whitespace-nowrap">
                                                {batch.totalReturns}
                                            </td>
                                            <td className="px-3 py-1.5 text-xs text-gray-700 whitespace-nowrap">
                                                {batch.totalDebitMemos}
                                            </td>
                                            <td className="px-3 py-1.5 text-xs font-medium text-gray-900 whitespace-nowrap">
                                                {formatCurrency(batch.totalValue)}
                                            </td>
                                            <td className="px-3 py-1.5 whitespace-nowrap">
                                                {batch.cardinalSubmittedAt ? (
                                                    <Badge variant="success"><span className="text-[10px]">Submitted</span></Badge>
                                                ) : batch.cardinalFileGenerated ? (
                                                    <Badge variant="info"><span className="text-[10px]">File Ready</span></Badge>
                                                ) : (
                                                    <Badge variant="default"><span className="text-[10px]">Pending</span></Badge>
                                                )}
                                            </td>
                                            <td className="px-3 py-1.5 text-[11px] text-gray-500 whitespace-nowrap">
                                                {formatDate(batch.createdAt)}
                                            </td>
                                            <td className="px-3 py-1.5 whitespace-nowrap" onClick={e => e.stopPropagation()}>
                                                {batch.status === 'open' && (
                                                    <button
                                                        onClick={() => router.push(`/warehouse/batches/${batch.id}?action=closeout`)}
                                                        className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold rounded bg-yellow-100 text-yellow-800 border border-yellow-300 hover:bg-yellow-200 transition-colors"
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
                    <div className="flex items-center justify-between px-3 py-2 border-t border-gray-200">
                        <p className="text-[10px] text-gray-500">
                            Page {currentPage} of {totalPages}{batchPagination?.total != null && ` · ${batchPagination.total} batches`}
                        </p>
                        <div className="flex items-center gap-1.5">
                            <button disabled={currentPage <= 1} onClick={() => setCurrentPage(p => p - 1)} className="p-1 rounded border border-gray-300 disabled:opacity-40 hover:bg-gray-50">
                                <ChevronLeft className="w-3.5 h-3.5 text-gray-600" />
                            </button>
                            <button disabled={currentPage >= totalPages} onClick={() => setCurrentPage(p => p + 1)} className="p-1 rounded border border-gray-300 disabled:opacity-40 hover:bg-gray-50">
                                <ChevronRight className="w-3.5 h-3.5 text-gray-600" />
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Create Batch Modal */}
            {showCreate && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowCreate(false)}>
                    <div className="bg-white rounded-lg shadow-xl max-w-sm w-full mx-4 p-5" onClick={e => e.stopPropagation()}>
                        <h2 className="text-sm font-bold text-gray-900 mb-3">Create New Batch</h2>

                        <div className="space-y-3">
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Batch Month <span className="text-red-500">*</span></label>
                                {usedMonthsLoading ? (
                                    <div className="flex items-center gap-2 py-2 text-xs text-gray-500">
                                        <Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading months…
                                    </div>
                                ) : availableBatchMonths.length === 0 ? (
                                    <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-2.5 py-2">
                                        Every month in the allowed range already has a batch. Delete an open unused batch or contact support to add a month outside the window.
                                    </p>
                                ) : (
                                    <select
                                        className="w-full border border-gray-300 rounded px-2.5 py-1.5 text-xs focus:ring-1 focus:ring-primary-500 focus:border-transparent bg-white"
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
                                <label className="block text-xs font-medium text-gray-700 mb-1">Batch Name <span className="text-gray-400 font-normal">(optional)</span></label>
                                <input
                                    type="text"
                                    className="w-full border border-gray-300 rounded px-2.5 py-1.5 text-xs focus:ring-1 focus:ring-primary-500 focus:border-transparent"
                                    placeholder="e.g. March 2026 Returns"
                                    value={newBatch.batchName}
                                    onChange={e => setNewBatch(prev => ({ ...prev, batchName: e.target.value }))}
                                />
                            </div>
                        </div>

                        <div className="flex justify-end gap-2 mt-4">
                            <button onClick={() => setShowCreate(false)} className="px-3 py-1.5 text-xs rounded border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors">Cancel</button>
                            <button
                                onClick={handleCreate}
                                disabled={isActionLoading || usedMonthsLoading || availableBatchMonths.length === 0}
                                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs rounded bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-50 transition-colors"
                            >
                                {isActionLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                                Create Batch
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
