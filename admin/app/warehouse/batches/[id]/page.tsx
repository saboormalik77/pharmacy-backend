'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import {
    ArrowLeft, Loader2, AlertCircle, Layers, Lock, Send,
    Plus, ChevronDown, ChevronUp, Package,
    CheckCircle, X, Search, ExternalLink, Trash2, UserX,
} from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { ToastContainer, Toast } from '@/components/ui/Toast';
import { formatDate, formatDateTime } from '@/lib/utils';
import { useAppDispatch, useAppSelector } from '@/lib/store/hooks';
import {
    fetchBatchDetail, assignReturnsToBatch, closeBatch, submitCardinal,
    deleteBatch, unassignReturnsFromBatch, getBatchPermissions,
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
    const [showDelete, setShowDelete] = useState(false);
    const [showUnassign, setShowUnassign] = useState(false);
    const [selectedUnassignIds, setSelectedUnassignIds] = useState<string[]>([]);
    const [batchPermissions, setBatchPermissions] = useState<any>(null);
    const [selectedReturnIds, setSelectedReturnIds] = useState<string[]>([]);
    const [assignSearch, setAssignSearch] = useState('');
    const [returnsExpanded, setReturnsExpanded] = useState(true);

    const addToast = useCallback((msg: string, type: Toast['type']) => {
        setToasts(prev => [...prev, { id: Date.now().toString(), message: msg, type }]);
    }, []);

    useEffect(() => {
        dispatch(fetchBatchDetail(batchId));
        dispatch(getBatchPermissions(batchId)).then((result) => {
            if (getBatchPermissions.fulfilled.match(result)) {
                setBatchPermissions(result.payload);
            }
        });
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

    const handleDeleteBatch = async () => {
        const result = await dispatch(deleteBatch(batchId));
        if (deleteBatch.fulfilled.match(result)) {
            addToast(result.payload.message, 'success');
            router.push('/warehouse/batches');
        }
    };

    const openUnassignModal = () => {
        setShowUnassign(true);
        setSelectedUnassignIds([]);
    };

    const handleUnassignReturns = async () => {
        if (selectedUnassignIds.length === 0) {
            addToast('Select at least one return to unassign', 'warning');
            return;
        }
        const result = await dispatch(unassignReturnsFromBatch({ batchId, transactionIds: selectedUnassignIds }));
        if (unassignReturnsFromBatch.fulfilled.match(result)) {
            addToast(result.payload.message, 'success');
            setShowUnassign(false);
            dispatch(fetchBatchDetail(batchId));
        }
    };

    const toggleUnassignSelection = (id: string) => {
        setSelectedUnassignIds(prev =>
            prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
        );
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
        <div className="space-y-3">
            <ToastContainer toasts={toasts} onClose={id => setToasts(t => t.filter(x => x.id !== id))} />

            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div className="flex items-center gap-2">
                    <button onClick={() => router.push('/warehouse/batches')} className="text-gray-400 hover:text-gray-600 p-0.5">
                        <ArrowLeft className="w-4 h-4" />
                    </button>
                    <div>
                        <div className="flex items-center gap-1.5">
                            <h1 className="text-base font-bold text-gray-900">{batch.batchName}</h1>
                            <Badge variant={sb.variant}><span className="text-[10px]">{sb.label}</span></Badge>
                        </div>
                        <p className="text-xs text-gray-500">{formatBatchMonth(batch.batchMonth)}</p>
                    </div>
                </div>
                <div className="flex flex-wrap gap-1.5">
                    {batch.status === 'open' && (
                        <>
                            <button onClick={openAssignModal} className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded text-xs font-medium bg-primary-600 text-white hover:bg-primary-700 transition-colors">
                                <Plus className="w-3.5 h-3.5" /> Assign Returns
                            </button>
                            {batchReturns.length > 0 && (
                                <button onClick={openUnassignModal} className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded text-xs font-medium bg-orange-100 text-orange-800 border border-orange-300 hover:bg-orange-200 transition-colors">
                                    <UserX className="w-3.5 h-3.5" /> Unassign Returns
                                </button>
                            )}
                            <button onClick={() => setShowClose(true)} disabled={batch.totalReturns === 0} className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800 border border-yellow-300 hover:bg-yellow-200 disabled:opacity-40 transition-colors">
                                <Lock className="w-3.5 h-3.5" /> Close Batch
                            </button>
                            {batchPermissions?.canDelete && (
                                <button onClick={() => setShowDelete(true)} className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded text-xs font-medium bg-red-100 text-red-800 border border-red-300 hover:bg-red-200 transition-colors">
                                    <Trash2 className="w-3.5 h-3.5" /> Delete Batch
                                </button>
                            )}
                        </>
                    )}
                    {batch.status === 'closed' && !batch.cardinalSubmittedAt && (
                        <button onClick={() => setShowSubmit(true)} className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded text-xs font-medium bg-green-600 text-white hover:bg-green-700 transition-colors">
                            <Send className="w-3.5 h-3.5" /> Mark Cardinal Submitted
                        </button>
                    )}
                </div>
            </div>

            {/* Batch Info Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                <div className="bg-white rounded-lg shadow px-3 py-2">
                    <p className="text-[10px] text-gray-500 uppercase font-medium">Returns</p>
                    <p className="text-lg font-bold mt-0.5">{batch.totalReturns}</p>
                </div>
                <div className="bg-white rounded-lg shadow px-3 py-2">
                    <p className="text-[10px] text-gray-500 uppercase font-medium">Debit Memos</p>
                    <p className="text-lg font-bold mt-0.5">{batch.totalDebitMemos}</p>
                </div>
                <div className="bg-white rounded-lg shadow px-3 py-2">
                    <p className="text-[10px] text-gray-500 uppercase font-medium">Total Value</p>
                    <p className="text-lg font-bold mt-0.5 text-green-700">{formatCurrency(batch.totalValue)}</p>
                </div>
                <div className="bg-white rounded-lg shadow px-3 py-2">
                    <p className="text-[10px] text-gray-500 uppercase font-medium">Cardinal Status</p>
                    <div className="mt-0.5">
                        {batch.cardinalSubmittedAt ? (
                            <div>
                                <Badge variant="success"><span className="text-[10px]">Submitted</span></Badge>
                                <p className="text-[10px] text-gray-500 mt-0.5">{formatDate(batch.cardinalSubmittedAt)}</p>
                            </div>
                        ) : batch.cardinalFileGenerated ? (
                            <Badge variant="info"><span className="text-[10px]">File Ready</span></Badge>
                        ) : (
                            <Badge variant="default"><span className="text-[10px]">Pending</span></Badge>
                        )}
                    </div>
                </div>
            </div>

            {/* Batch Metadata */}
            <div className="bg-white rounded-lg shadow px-4 py-3">
                <h2 className="text-xs font-semibold text-gray-900 mb-2">Batch Details</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div>
                        <p className="text-[10px] text-gray-500">Created</p>
                        <p className="text-xs font-medium">{formatDateTime(batch.createdAt)}</p>
                    </div>
                    {batch.closedAt && (
                        <div>
                            <p className="text-[10px] text-gray-500">Closed</p>
                            <p className="text-xs font-medium">{formatDateTime(batch.closedAt)}</p>
                        </div>
                    )}
                    {batch.cardinalApprovedAt && (
                        <div>
                            <p className="text-[10px] text-gray-500">Cardinal Approved</p>
                            <p className="text-xs font-medium">{formatDateTime(batch.cardinalApprovedAt)}</p>
                        </div>
                    )}
                    {batch.cardinalFileUrl && (
                        <div>
                            <p className="text-[10px] text-gray-500">Cardinal File</p>
                            <a href={batch.cardinalFileUrl} target="_blank" rel="noopener noreferrer"
                               className="text-xs text-primary-600 hover:underline flex items-center gap-1">
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
                    className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-gray-50 transition-colors"
                >
                    <div className="flex items-center gap-1.5">
                        <Package className="w-3.5 h-3.5 text-gray-600" />
                        <h2 className="text-xs font-semibold text-gray-900">Returns in Batch</h2>
                        <Badge variant="default"><span className="text-[10px]">{batchReturns.length}</span></Badge>
                    </div>
                    {returnsExpanded ? <ChevronUp className="w-3.5 h-3.5 text-gray-400" /> : <ChevronDown className="w-3.5 h-3.5 text-gray-400" />}
                </button>

                {returnsExpanded && (
                    <div className="border-t border-gray-200">
                        {batchReturns.length === 0 ? (
                            <p className="text-center py-6 text-xs text-gray-500">No returns assigned yet.</p>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="min-w-full">
                                    <thead className="bg-gray-50 border-b border-gray-200">
                                        <tr>
                                            <th className="px-3 py-1.5 text-left text-[10px] font-semibold text-gray-500 uppercase">License Plate</th>
                                            <th className="px-3 py-1.5 text-left text-[10px] font-semibold text-gray-500 uppercase">Pharmacy</th>
                                            <th className="px-3 py-1.5 text-left text-[10px] font-semibold text-gray-500 uppercase">Status</th>
                                            <th className="px-3 py-1.5 text-left text-[10px] font-semibold text-gray-500 uppercase">Items</th>
                                            <th className="px-3 py-1.5 text-left text-[10px] font-semibold text-gray-500 uppercase">Value</th>
                                            <th className="px-3 py-1.5 text-left text-[10px] font-semibold text-gray-500 uppercase">Tracking</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {batchReturns.map((rt: ReturnTransaction) => (
                                            <tr key={rt.id} className="hover:bg-gray-50 cursor-pointer"
                                                onClick={() => router.push(`/warehouse/returns/${rt.id}`)}>
                                                <td className="px-3 py-1.5 text-xs font-medium text-gray-900">{rt.licensePlate}</td>
                                                <td className="px-3 py-1.5 text-xs text-gray-700">{rt.pharmacyName}</td>
                                                <td className="px-3 py-1.5"><Badge variant="default"><span className="text-[10px]">{rt.status?.replace(/_/g, ' ')}</span></Badge></td>
                                                <td className="px-3 py-1.5 text-xs text-gray-700">{rt.totalItems}</td>
                                                <td className="px-3 py-1.5 text-xs font-medium">{formatCurrency(rt.totalReturnableValue || 0)}</td>
                                                <td className="px-3 py-1.5 text-[11px] text-gray-500">{rt.fedexTracking || '—'}</td>
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
                    <div className="bg-white rounded-lg shadow-xl max-w-xl w-full mx-4 max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
                        <div className="px-4 py-3 border-b border-gray-200">
                            <div className="flex items-center justify-between">
                                <h2 className="text-sm font-bold text-gray-900">Assign Returns to Batch</h2>
                                <button onClick={() => setShowAssign(false)} className="text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
                            </div>
                            <div className="relative mt-2">
                                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="Search by license plate, pharmacy, tracking..."
                                    className="w-full pl-8 pr-3 py-1.5 border border-gray-300 rounded text-xs focus:ring-1 focus:ring-primary-500"
                                    value={assignSearch}
                                    onChange={e => setAssignSearch(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="overflow-y-auto flex-1 p-3">
                            {filteredReceived.length === 0 ? (
                                <p className="text-center py-6 text-xs text-gray-500">No received returns available for assignment.</p>
                            ) : (
                                <div className="space-y-1.5">
                                    {filteredReceived.map(rt => {
                                        const selected = selectedReturnIds.includes(rt.id);
                                        return (
                                            <label
                                                key={rt.id}
                                                className={`flex items-center gap-2.5 px-3 py-2 rounded-lg border-2 cursor-pointer transition-colors ${
                                                    selected ? 'border-primary-500 bg-primary-50' : 'border-gray-200 hover:border-gray-300'
                                                }`}
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={selected}
                                                    onChange={() => toggleReturnSelection(rt.id)}
                                                    className="w-3.5 h-3.5 text-primary-600 rounded focus:ring-primary-500"
                                                />
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-xs font-medium text-gray-900">{rt.licensePlate}</p>
                                                    <p className="text-[10px] text-gray-500">{rt.pharmacyName} · {rt.totalItems} items · {formatCurrency(rt.totalReturnableValue || 0)}</p>
                                                </div>
                                                <Badge variant="default"><span className="text-[10px]">{rt.status?.replace(/_/g, ' ')}</span></Badge>
                                            </label>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        <div className="px-4 py-3 border-t border-gray-200 flex items-center justify-between">
                            <p className="text-xs text-gray-500">{selectedReturnIds.length} selected</p>
                            <div className="flex gap-2">
                                <button onClick={() => setShowAssign(false)} className="px-3 py-1.5 text-xs rounded border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors">Cancel</button>
                                <button onClick={handleAssign} disabled={isActionLoading || selectedReturnIds.length === 0} className="inline-flex items-center gap-1 px-3 py-1.5 text-xs rounded bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-50 transition-colors">
                                    {isActionLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                                    Assign ({selectedReturnIds.length})
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Close Batch Confirm ──────────────────────────────── */}
            {showClose && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowClose(false)}>
                    <div className="bg-white rounded-lg shadow-xl max-w-sm w-full mx-4 p-4" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center gap-2.5 mb-3">
                            <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center flex-shrink-0">
                                <Lock className="w-4 h-4 text-yellow-600" />
                            </div>
                            <div>
                                <h3 className="text-sm font-bold text-gray-900">Close Batch</h3>
                                <p className="text-xs text-gray-500">This will generate debit memos and cannot be undone.</p>
                            </div>
                        </div>
                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-2.5 text-xs text-yellow-800 mb-3">
                            <p className="font-medium mb-1">This action will:</p>
                            <ul className="list-disc ml-4 space-y-0.5">
                                <li>Lock the batch from further changes</li>
                                <li>Generate debit memos grouped by pharmacy + destination + labeler</li>
                                <li>Validate all items have destinations (no TBD items allowed)</li>
                            </ul>
                        </div>
                        <div className="flex justify-end gap-2">
                            <button onClick={() => setShowClose(false)} className="px-3 py-1.5 text-xs rounded border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors">Cancel</button>
                            <button onClick={handleClose} disabled={isActionLoading} className="inline-flex items-center gap-1 px-3 py-1.5 text-xs rounded bg-yellow-500 text-white hover:bg-yellow-600 disabled:opacity-50 transition-colors">
                                {isActionLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Lock className="w-3.5 h-3.5" />}
                                Close Batch
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Submit Cardinal Confirm ──────────────────────────── */}
            {showSubmit && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowSubmit(false)}>
                    <div className="bg-white rounded-lg shadow-xl max-w-sm w-full mx-4 p-4" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center gap-2.5 mb-3">
                            <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                                <Send className="w-4 h-4 text-green-600" />
                            </div>
                            <div>
                                <h3 className="text-sm font-bold text-gray-900">Submit to Cardinal</h3>
                                <p className="text-xs text-gray-500">Mark this batch as submitted to Cardinal.</p>
                            </div>
                        </div>
                        <p className="text-xs text-gray-600 mb-3">
                            This records that the Cardinal file for batch <strong>{batch.batchName}</strong> has been submitted.
                        </p>
                        <div className="flex justify-end gap-2">
                            <button onClick={() => setShowSubmit(false)} className="px-3 py-1.5 text-xs rounded border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors">Cancel</button>
                            <button onClick={handleSubmitCardinal} disabled={isActionLoading} className="inline-flex items-center gap-1 px-3 py-1.5 text-xs rounded bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 transition-colors">
                                {isActionLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                                Confirm Submission
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Delete Batch Confirm ──────────────────────────── */}
            {showDelete && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowDelete(false)}>
                    <div className="bg-white rounded-lg shadow-xl max-w-sm w-full mx-4 p-4" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center gap-2.5 mb-3">
                            <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                                <Trash2 className="w-4 h-4 text-red-600" />
                            </div>
                            <div>
                                <h3 className="text-sm font-bold text-gray-900">Delete Batch</h3>
                                <p className="text-xs text-gray-500">This action cannot be undone.</p>
                            </div>
                        </div>
                        <p className="text-xs text-gray-600 mb-3">
                            Are you sure you want to delete batch <strong>{batch.batchName}</strong>? 
                            {batch.totalReturns > 0 && ` All ${batch.totalReturns} assigned return(s) will be unassigned.`}
                        </p>
                        <div className="flex justify-end gap-2">
                            <button onClick={() => setShowDelete(false)} className="px-3 py-1.5 text-xs rounded border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors">Cancel</button>
                            <button onClick={handleDeleteBatch} disabled={isActionLoading} className="inline-flex items-center gap-1 px-3 py-1.5 text-xs rounded bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 transition-colors">
                                {isActionLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                                Delete Batch
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Unassign Returns Modal ──────────────────────────────── */}
            {showUnassign && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowUnassign(false)}>
                    <div className="bg-white rounded-lg shadow-xl max-w-xl w-full mx-4 max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
                        <div className="px-4 py-3 border-b border-gray-200">
                            <div className="flex items-center justify-between">
                                <h2 className="text-sm font-bold text-gray-900">Unassign Returns from Batch</h2>
                                <button onClick={() => setShowUnassign(false)} className="text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
                            </div>
                            <p className="text-xs text-gray-500 mt-1">Select returns to remove from this batch</p>
                        </div>

                        <div className="overflow-y-auto flex-1 p-3">
                            {batchReturns.length === 0 ? (
                                <div className="text-center py-8">
                                    <Package className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                                    <p className="text-xs text-gray-500">No returns assigned to this batch</p>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {batchReturns.map(ret => (
                                        <div key={ret.id} className="flex items-center gap-2 p-2 border border-gray-200 rounded hover:bg-gray-50">
                                            <input
                                                type="checkbox"
                                                checked={selectedUnassignIds.includes(ret.id)}
                                                onChange={() => toggleUnassignSelection(ret.id)}
                                                className="w-3.5 h-3.5 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                                            />
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-1.5 mb-0.5">
                                                    <span className="text-xs font-medium text-gray-900">{ret.licensePlate}</span>
                                                    <Badge variant={ret.status === 'received' ? 'success' : ret.status === 'verified' ? 'info' : 'default'}>
                                                        <span className="text-[10px]">{ret.status}</span>
                                                    </Badge>
                                                </div>
                                                <p className="text-[10px] text-gray-500">{ret.pharmacyName}</p>
                                                <p className="text-[10px] text-gray-400">{formatCurrency(ret.totalReturnableValue + ret.totalNonReturnableValue)}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="px-4 py-3 border-t border-gray-200">
                            <div className="flex items-center justify-between">
                                <p className="text-xs text-gray-500">
                                    {selectedUnassignIds.length} of {batchReturns.length} selected
                                </p>
                                <div className="flex gap-2">
                                    <button onClick={() => setShowUnassign(false)} className="px-3 py-1.5 text-xs rounded border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors">
                                        Cancel
                                    </button>
                                    <button 
                                        onClick={handleUnassignReturns} 
                                        disabled={isActionLoading || selectedUnassignIds.length === 0}
                                        className="inline-flex items-center gap-1 px-3 py-1.5 text-xs rounded bg-orange-600 text-white hover:bg-orange-700 disabled:opacity-50 transition-colors"
                                    >
                                        {isActionLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UserX className="w-3.5 h-3.5" />}
                                        Unassign ({selectedUnassignIds.length})
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
