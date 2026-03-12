'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
    Plus, Loader2, AlertCircle, ChevronLeft, ChevronRight, Search,
    Layers, CheckCircle, Send, Calendar, DollarSign,
} from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { ToastContainer, Toast } from '@/components/ui/Toast';
import { formatDate } from '@/lib/utils';
import { useAppDispatch, useAppSelector } from '@/lib/store/hooks';
import { fetchBatches, createBatch, clearError } from '@/lib/store/batchSlice';

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
        <div className="space-y-6">
            <ToastContainer toasts={toasts} onClose={id => setToasts(t => t.filter(x => x.id !== id))} />

            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Monthly Batches</h1>
                    <p className="text-gray-500 mt-1">Manage return batches and close-outs</p>
                </div>
                <Button variant="primary" onClick={() => setShowCreate(true)}>
                    <Plus className="w-4 h-4 mr-1" /> New Batch
                </Button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white rounded-lg shadow p-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center"><Layers className="w-5 h-5 text-gray-600" /></div>
                        <div><p className="text-sm text-gray-500">Total</p><p className="text-xl font-bold">{stats.total}</p></div>
                    </div>
                </div>
                <div className="bg-white rounded-lg shadow p-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center"><Calendar className="w-5 h-5 text-yellow-600" /></div>
                        <div><p className="text-sm text-gray-500">Open</p><p className="text-xl font-bold text-yellow-600">{stats.open}</p></div>
                    </div>
                </div>
                <div className="bg-white rounded-lg shadow p-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center"><CheckCircle className="w-5 h-5 text-blue-600" /></div>
                        <div><p className="text-sm text-gray-500">Closed</p><p className="text-xl font-bold text-blue-600">{stats.closed}</p></div>
                    </div>
                </div>
                <div className="bg-white rounded-lg shadow p-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center"><Send className="w-5 h-5 text-green-600" /></div>
                        <div><p className="text-sm text-gray-500">Submitted</p><p className="text-xl font-bold text-green-600">{stats.submitted}</p></div>
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-lg shadow p-4">
                <div className="flex items-center gap-4">
                    <select
                        className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        value={statusFilter}
                        onChange={e => { setStatusFilter(e.target.value); setCurrentPage(1); }}
                    >
                        {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-lg shadow overflow-hidden">
                {isLoading ? (
                    <div className="flex items-center justify-center py-20">
                        <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
                    </div>
                ) : batches.length === 0 ? (
                    <div className="text-center py-20 text-gray-500">
                        <Layers className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                        <p className="text-lg font-medium">No batches found</p>
                        <p className="text-sm mt-1">Create a new batch to get started.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Batch Month</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Returns</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Debit Memos</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total Value</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cardinal</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Created</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {batches.map(batch => {
                                    const sb = getStatusBadge(batch.status);
                                    return (
                                        <tr
                                            key={batch.id}
                                            onClick={() => router.push(`/warehouse/batches/${batch.id}`)}
                                            className="hover:bg-gray-50 cursor-pointer transition-colors"
                                        >
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                                {formatBatchMonth(batch.batchMonth)}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                                                {batch.batchName}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <Badge variant={sb.variant}>{sb.label}</Badge>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                                                {batch.totalReturns}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                                                {batch.totalDebitMemos}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                                {formatCurrency(batch.totalValue)}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                                                {batch.cardinalSubmittedAt ? (
                                                    <Badge variant="success">Submitted</Badge>
                                                ) : batch.cardinalFileGenerated ? (
                                                    <Badge variant="info">File Ready</Badge>
                                                ) : (
                                                    <Badge variant="default">Pending</Badge>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                {formatDate(batch.createdAt)}
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
                    <div className="flex items-center justify-between px-6 py-3 border-t border-gray-200">
                        <p className="text-sm text-gray-500">
                            Page {currentPage} of {totalPages}{batchPagination?.total != null && ` · ${batchPagination.total} batches`}
                        </p>
                        <div className="flex items-center gap-2">
                            <Button variant="outline" size="sm" disabled={currentPage <= 1} onClick={() => setCurrentPage(p => p - 1)}>
                                <ChevronLeft className="w-4 h-4" />
                            </Button>
                            <Button variant="outline" size="sm" disabled={currentPage >= totalPages} onClick={() => setCurrentPage(p => p + 1)}>
                                <ChevronRight className="w-4 h-4" />
                            </Button>
                        </div>
                    </div>
                )}
            </div>

            {/* Create Batch Modal */}
            {showCreate && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowCreate(false)}>
                    <div className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4 p-6" onClick={e => e.stopPropagation()}>
                        <h2 className="text-lg font-bold text-gray-900 mb-4">Create New Batch</h2>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Batch Month *</label>
                                <input
                                    type="month"
                                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                                    value={newBatch.batchMonth}
                                    onChange={e => setNewBatch(prev => ({ ...prev, batchMonth: e.target.value }))}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Batch Name (optional)</label>
                                <input
                                    type="text"
                                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                                    placeholder="e.g. March 2026 Returns"
                                    value={newBatch.batchName}
                                    onChange={e => setNewBatch(prev => ({ ...prev, batchName: e.target.value }))}
                                />
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 mt-6">
                            <Button variant="ghost" onClick={() => setShowCreate(false)}>Cancel</Button>
                            <Button variant="primary" onClick={handleCreate} disabled={isActionLoading}>
                                {isActionLoading ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Plus className="w-4 h-4 mr-1" />}
                                Create Batch
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
