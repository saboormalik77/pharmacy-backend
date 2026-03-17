'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import {
    ArrowLeft, Loader2, AlertCircle, Layers, Lock, Send,
    Plus, ChevronDown, ChevronUp, Package,
    CheckCircle, X, Search, ExternalLink,
} from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { ToastContainer, Toast } from '@/components/ui/Toast';
import { formatDate, formatDateTime } from '@/lib/utils';
import { useAppDispatch, useAppSelector } from '@/lib/store/hooks';
import {
    fetchBatchDetail, assignReturnsToBatch, closeBatch, submitCardinal,
    clearCurrentBatch, clearError,
} from '@/lib/store/batchSlice';
import { fetchReceivedReturns } from '@/lib/store/warehouseSlice';
import { ReturnTransaction } from '@/lib/types';

function formatCurrency(v: number) {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(v);
}

function formatBatchMonth(dateStr: string) {
    return new Date(dateStr).toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
}

function getStatusBadge(status: string): { label: string; variant: 'success' | 'warning' | 'info' | 'default' } {
    switch (status) {
        case 'open': return { label: 'Open', variant: 'warning' };
        case 'closed': return { label: 'Closed', variant: 'info' };
        case 'submitted': return { label: 'Submitted', variant: 'success' };
        default: return { label: status, variant: 'default' };
    }
}

export default function BatchDetailPage() {
    const params = useParams();
    const router = useRouter();
    const searchParams = useSearchParams();
    const dispatch = useAppDispatch();
    const batchId = params.id as string;

    const {
        currentBatch: batch,
        batchReturns,
        isLoading,
        isActionLoading,
        error,
    } = useAppSelector(s => s.batch);

    const { receivedReturns } = useAppSelector(s => s.warehouse);

    const [toasts, setToasts] = useState<Toast[]>([]);
    const [showAssign, setShowAssign] = useState(false);
    const [showClose, setShowClose] = useState(false);
    const [showSubmit, setShowSubmit] = useState(false);
    const [selectedReturnIds, setSelectedReturnIds] = useState<string[]>([]);
    const [assignSearch, setAssignSearch] = useState('');
    const [returnsExpanded, setReturnsExpanded] = useState(true);

    const addToast = useCallback((msg: string, type: Toast['type']) => {
        setToasts(prev => [...prev, { id: Date.now().toString(), message: msg, type }]);
    }, []);

    useEffect(() => {
        dispatch(fetchBatchDetail(batchId));
        return () => { dispatch(clearCurrentBatch()); };
    }, [dispatch, batchId]);

    // Auto-open Close Batch modal when navigated via ?action=closeout
    useEffect(() => {
        if (searchParams.get('action') === 'closeout' && batch && batch.status === 'open') {
            setShowClose(true);
        }
    }, [searchParams, batch]);

    useEffect(() => {
        if (error) { addToast(error, 'error'); dispatch(clearError()); }
    }, [error, addToast, dispatch]);

    const openAssignModal = () => {
        setShowAssign(true);
        setSelectedReturnIds([]);
        setAssignSearch('');
        dispatch(fetchReceivedReturns({ limit: 100 }));
    };

    const handleAssign = async () => {
        if (selectedReturnIds.length === 0) { addToast('Select at least one return', 'warning'); return; }
        const result = await dispatch(assignReturnsToBatch({ batchId, transactionIds: selectedReturnIds }));
        if (assignReturnsToBatch.fulfilled.match(result)) {
            addToast(`${result.payload.assigned} return(s) assigned`, 'success');
            setShowAssign(false);
            dispatch(fetchBatchDetail(batchId));
        }
    };

    const handleClose = async () => {
        const result = await dispatch(closeBatch(batchId));
        if (closeBatch.fulfilled.match(result)) {
            addToast(`Batch closed. ${result.payload.memosGenerated} debit memo(s) generated.`, 'success');
            setShowClose(false);
            dispatch(fetchBatchDetail(batchId));
        }
    };

    const handleSubmitCardinal = async () => {
        const result = await dispatch(submitCardinal(batchId));
        if (submitCardinal.fulfilled.match(result)) {
            addToast('Batch marked as submitted to Cardinal', 'success');
            setShowSubmit(false);
            dispatch(fetchBatchDetail(batchId));
        }
    };

    const toggleReturnSelection = (id: string) => {
        setSelectedReturnIds(prev =>
            prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
        );
    };

    const filteredReceived = receivedReturns.filter(r => {
        // Exclude returns already assigned to any batch
        if (r.batchId) return false;
        if (!assignSearch) return true;
        const s = assignSearch.toLowerCase();
        return (
            r.licensePlate?.toLowerCase().includes(s) ||
            r.pharmacyName?.toLowerCase().includes(s) ||
            r.fedexTracking?.toLowerCase().includes(s)
        );
    });

    if (isLoading && !batch) {
        return (
            <div className="flex items-center justify-center py-20">
                <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
            </div>
        );
    }

    if (!batch) {
        return (
            <div className="text-center py-20">
                <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-3" />
                <p className="text-lg font-medium text-gray-900">Batch not found</p>
                <Button variant="ghost" onClick={() => router.push('/warehouse/batches')} className="mt-4">
                    <ArrowLeft className="w-4 h-4 mr-1" /> Back to Batches
                </Button>
            </div>
        );
    }

    const sb = getStatusBadge(batch.status);

    return (
        <div className="space-y-6">
            <ToastContainer toasts={toasts} onClose={id => setToasts(t => t.filter(x => x.id !== id))} />

            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center gap-3">
                    <Button variant="ghost" size="sm" onClick={() => router.push('/warehouse/batches')}>
                        <ArrowLeft className="w-4 h-4" />
                    </Button>
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-2xl font-bold text-gray-900">{batch.batchName}</h1>
                            <Badge variant={sb.variant}>{sb.label}</Badge>
                        </div>
                        <p className="text-gray-500 text-sm">{formatBatchMonth(batch.batchMonth)}</p>
                    </div>
                </div>
                <div className="flex flex-wrap gap-2">
                    {batch.status === 'open' && (
                        <>
                            <Button variant="primary" onClick={openAssignModal}>
                                <Plus className="w-4 h-4 mr-1" /> Assign Returns
                            </Button>
                            <Button variant="warning" onClick={() => setShowClose(true)} disabled={batch.totalReturns === 0}>
                                <Lock className="w-4 h-4 mr-1" /> Close Batch
                            </Button>
                        </>
                    )}
                    {batch.status === 'closed' && !batch.cardinalSubmittedAt && (
                        <Button variant="success" onClick={() => setShowSubmit(true)}>
                            <Send className="w-4 h-4 mr-1" /> Mark Cardinal Submitted
                        </Button>
                    )}
                </div>
            </div>

            {/* Batch Info Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white rounded-lg shadow p-4">
                    <p className="text-xs text-gray-500 uppercase font-medium">Returns</p>
                    <p className="text-2xl font-bold mt-1">{batch.totalReturns}</p>
                </div>
                <div className="bg-white rounded-lg shadow p-4">
                    <p className="text-xs text-gray-500 uppercase font-medium">Debit Memos</p>
                    <p className="text-2xl font-bold mt-1">{batch.totalDebitMemos}</p>
                </div>
                <div className="bg-white rounded-lg shadow p-4">
                    <p className="text-xs text-gray-500 uppercase font-medium">Total Value</p>
                    <p className="text-2xl font-bold mt-1 text-green-700">{formatCurrency(batch.totalValue)}</p>
                </div>
                <div className="bg-white rounded-lg shadow p-4">
                    <p className="text-xs text-gray-500 uppercase font-medium">Cardinal Status</p>
                    <div className="mt-1">
                        {batch.cardinalSubmittedAt ? (
                            <div>
                                <Badge variant="success">Submitted</Badge>
                                <p className="text-xs text-gray-500 mt-1">{formatDate(batch.cardinalSubmittedAt)}</p>
                            </div>
                        ) : batch.cardinalFileGenerated ? (
                            <Badge variant="info">File Ready</Badge>
                        ) : (
                            <Badge variant="default">Pending</Badge>
                        )}
                    </div>
                </div>
            </div>

            {/* Batch Metadata */}
            <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Batch Details</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                        <p className="text-gray-500">Created</p>
                        <p className="font-medium">{formatDateTime(batch.createdAt)}</p>
                    </div>
                    {batch.closedAt && (
                        <div>
                            <p className="text-gray-500">Closed</p>
                            <p className="font-medium">{formatDateTime(batch.closedAt)}</p>
                        </div>
                    )}
                    {batch.cardinalApprovedAt && (
                        <div>
                            <p className="text-gray-500">Cardinal Approved</p>
                            <p className="font-medium">{formatDateTime(batch.cardinalApprovedAt)}</p>
                        </div>
                    )}
                    {batch.cardinalFileUrl && (
                        <div>
                            <p className="text-gray-500">Cardinal File</p>
                            <a href={batch.cardinalFileUrl} target="_blank" rel="noopener noreferrer"
                               className="text-primary-600 hover:underline flex items-center gap-1">
                                Download <ExternalLink className="w-3 h-3" />
                            </a>
                        </div>
                    )}
                </div>
            </div>

            {/* Returns in Batch */}
            <div className="bg-white rounded-lg shadow overflow-hidden">
                <button
                    onClick={() => setReturnsExpanded(e => !e)}
                    className="w-full flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition-colors"
                >
                    <div className="flex items-center gap-2">
                        <Package className="w-5 h-5 text-gray-600" />
                        <h2 className="text-lg font-semibold text-gray-900">Returns in Batch</h2>
                        <Badge variant="default">{batchReturns.length}</Badge>
                    </div>
                    {returnsExpanded ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
                </button>

                {returnsExpanded && (
                    <div className="border-t border-gray-200">
                        {batchReturns.length === 0 ? (
                            <p className="text-center py-8 text-gray-500">No returns assigned yet.</p>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">License Plate</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Pharmacy</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Items</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Value</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tracking</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200">
                                        {batchReturns.map((rt: ReturnTransaction) => (
                                            <tr key={rt.id} className="hover:bg-gray-50 cursor-pointer"
                                                onClick={() => router.push(`/warehouse/returns/${rt.id}`)}>
                                                <td className="px-6 py-3 text-sm font-medium text-gray-900">{rt.licensePlate}</td>
                                                <td className="px-6 py-3 text-sm text-gray-700">{rt.pharmacyName}</td>
                                                <td className="px-6 py-3 text-sm"><Badge variant="default">{rt.status?.replace(/_/g, ' ')}</Badge></td>
                                                <td className="px-6 py-3 text-sm text-gray-700">{rt.totalItems}</td>
                                                <td className="px-6 py-3 text-sm font-medium">{formatCurrency(rt.totalReturnableValue || 0)}</td>
                                                <td className="px-6 py-3 text-sm text-gray-500">{rt.fedexTracking || '—'}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* ── Assign Returns Modal ──────────────────────────────── */}
            {showAssign && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowAssign(false)}>
                    <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full mx-4 max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
                        <div className="p-6 border-b border-gray-200">
                            <div className="flex items-center justify-between">
                                <h2 className="text-lg font-bold text-gray-900">Assign Returns to Batch</h2>
                                <button onClick={() => setShowAssign(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
                            </div>
                            <div className="relative mt-3">
                                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="Search by license plate, pharmacy, tracking..."
                                    className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-primary-500"
                                    value={assignSearch}
                                    onChange={e => setAssignSearch(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="overflow-y-auto flex-1 p-6">
                            {filteredReceived.length === 0 ? (
                                <p className="text-center py-8 text-gray-500">No received returns available for assignment.</p>
                            ) : (
                                <div className="space-y-2">
                                    {filteredReceived.map(rt => {
                                        const selected = selectedReturnIds.includes(rt.id);
                                        return (
                                            <label
                                                key={rt.id}
                                                className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-colors ${
                                                    selected ? 'border-primary-500 bg-primary-50' : 'border-gray-200 hover:border-gray-300'
                                                }`}
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={selected}
                                                    onChange={() => toggleReturnSelection(rt.id)}
                                                    className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
                                                />
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-medium text-gray-900">{rt.licensePlate}</p>
                                                    <p className="text-xs text-gray-500">{rt.pharmacyName} · {rt.totalItems} items · {formatCurrency(rt.totalReturnableValue || 0)}</p>
                                                </div>
                                                <Badge variant="default">{rt.status?.replace(/_/g, ' ')}</Badge>
                                            </label>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        <div className="p-6 border-t border-gray-200 flex items-center justify-between">
                            <p className="text-sm text-gray-500">{selectedReturnIds.length} selected</p>
                            <div className="flex gap-3">
                                <Button variant="ghost" onClick={() => setShowAssign(false)}>Cancel</Button>
                                <Button variant="primary" onClick={handleAssign} disabled={isActionLoading || selectedReturnIds.length === 0}>
                                    {isActionLoading ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Plus className="w-4 h-4 mr-1" />}
                                    Assign ({selectedReturnIds.length})
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Close Batch Confirm ──────────────────────────────── */}
            {showClose && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowClose(false)}>
                    <div className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4 p-6" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center">
                                <Lock className="w-5 h-5 text-yellow-600" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-gray-900">Close Batch</h3>
                                <p className="text-sm text-gray-500">This will generate debit memos and cannot be undone.</p>
                            </div>
                        </div>
                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm text-yellow-800 mb-4">
                            <p className="font-medium">This action will:</p>
                            <ul className="list-disc ml-5 mt-1 space-y-1">
                                <li>Lock the batch from further changes</li>
                                <li>Generate debit memos grouped by pharmacy + destination + labeler</li>
                                <li>Validate all items have destinations (no TBD items allowed)</li>
                            </ul>
                        </div>
                        <div className="flex justify-end gap-3">
                            <Button variant="ghost" onClick={() => setShowClose(false)}>Cancel</Button>
                            <Button variant="warning" onClick={handleClose} disabled={isActionLoading}>
                                {isActionLoading ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Lock className="w-4 h-4 mr-1" />}
                                Close Batch
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Submit Cardinal Confirm ──────────────────────────── */}
            {showSubmit && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowSubmit(false)}>
                    <div className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4 p-6" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                                <Send className="w-5 h-5 text-green-600" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-gray-900">Submit to Cardinal</h3>
                                <p className="text-sm text-gray-500">Mark this batch as submitted to Cardinal.</p>
                            </div>
                        </div>
                        <p className="text-sm text-gray-600 mb-4">
                            This records that the Cardinal file for batch <strong>{batch.batchName}</strong> has been submitted.
                        </p>
                        <div className="flex justify-end gap-3">
                            <Button variant="ghost" onClick={() => setShowSubmit(false)}>Cancel</Button>
                            <Button variant="success" onClick={handleSubmitCardinal} disabled={isActionLoading}>
                                {isActionLoading ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Send className="w-4 h-4 mr-1" />}
                                Confirm Submission
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
