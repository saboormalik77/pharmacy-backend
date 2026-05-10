'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import {
    ArrowLeft, Loader2, AlertCircle, Layers, Lock, Send,
    Plus, ChevronDown, ChevronUp, Package,
    CheckCircle, X, Search, ExternalLink, Trash2, UserX, Download,
} from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { ToastContainer, Toast } from '@/components/ui/Toast';
import { formatDate, formatDateTime } from '@/lib/utils';
import { cookieUtils } from '@/lib/utils/cookies';
import { useAppDispatch, useAppSelector } from '@/lib/store/hooks';
import {
    fetchBatchDetail, assignReturnsToBatch, closeBatch, submitCardinal,
    deleteBatch, unassignReturnsFromBatch, getBatchPermissions,
    clearCurrentBatch, clearError, fetchBatchWorkflow,
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

function statusPillStyle(status: string): React.CSSProperties {
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
}

function cardinalPillStyle(state: 'submitted' | 'file_ready' | 'pending'): React.CSSProperties {
    if (state === 'submitted') return { backgroundColor: 'var(--secondary-container)', color: 'var(--on-secondary-container)', borderColor: 'var(--outline-variant)' };
    if (state === 'file_ready') return { backgroundColor: 'var(--primary-container)', color: 'var(--on-primary-container)', borderColor: 'var(--outline-variant)' };
    return { backgroundColor: 'var(--surface-container-low)', color: 'var(--on-surface-variant)', borderColor: 'var(--outline-variant)' };
}

function returnTransactionStatusBadgeVariant(status: ReturnTransaction['status']): 'success' | 'info' | 'warning' | 'default' {
    switch (status) {
        case 'received':
            return 'success';
        case 'completed':
        case 'finalized':
            return 'info';
        case 'in_progress':
            return 'warning';
        case 'paused':
        case 'closed_out':
        default:
            return 'default';
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
        batchMemos,
        isLoading,
        isActionLoading,
        error,
        workflowState,
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
    const [assignReturnsLoading, setAssignReturnsLoading] = useState(false);
    const [returnsExpanded, setReturnsExpanded] = useState(true);
    const [downloadingReturnId, setDownloadingReturnId] = useState<string | null>(null);

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
        
        // Fetch workflow state for closed/submitted batches to determine if workflow is complete
        dispatch(fetchBatchWorkflow(batchId));
        
        return () => { dispatch(clearCurrentBatch()); };
    }, [dispatch, batchId]);

    // Warm eligible returns for Assign modal (same API as modal uses). Avoids empty list flash before fetch completes.
    useEffect(() => {
        if (!batch || batch.status !== 'open') return;
        dispatch(fetchReceivedReturns({ limit: 100, verificationStatus: 'completed' }));
    }, [dispatch, batchId, batch?.status]);

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
        setAssignReturnsLoading(true);
        dispatch(fetchReceivedReturns({ limit: 100, verificationStatus: 'completed' }))
            .unwrap()
            .catch(() => addToast('Failed to load returns for assignment', 'error'))
            .finally(() => setAssignReturnsLoading(false));
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
            addToast('Batch closed. Navigating to workflow...', 'success');
            setShowClose(false);
            dispatch(fetchBatchDetail(batchId));
            router.push(`/warehouse/batches/${batchId}/workflow`);
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

    // API uses verificationStatus=completed (matches warehouse_list_received "completed" rules):
    // rows may still have status "received" with verification_completed_at / verified_integrity — do not require status === "verified".
    const filteredReceived = receivedReturns.filter(r => {
        if (r.batchId) return false;
        if (!assignSearch) return true;
        const s = assignSearch.toLowerCase();
        return (
            r.licensePlate?.toLowerCase().includes(s) ||
            r.pharmacyName?.toLowerCase().includes(s) ||
            r.fedexTracking?.toLowerCase().includes(s)
        );
    });

    const handleDownloadSummary = async (returnId: string, e: React.MouseEvent) => {
        e.stopPropagation();
        setDownloadingReturnId(returnId);
        try {
            const token = cookieUtils.getAuthToken();
            if (!token) { addToast('Not authenticated', 'error'); setDownloadingReturnId(null); return; }

            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';
            const response = await fetch(`${apiUrl}/admin/debit-memos/summary/${returnId}/${batchId}`, {
                method: 'GET',
                headers: { 'Authorization': `Bearer ${token}` },
            });

            if (!response.ok) throw new Error('Failed to download debit memo summary');

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `DM_Summary_${returnId.substring(0, 8)}.pdf`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
            addToast('Debit memo summary downloaded', 'success');
        } catch {
            addToast('Failed to download debit memo summary', 'error');
        } finally {
            setDownloadingReturnId(null);
        }
    };

    // Workflow completion from batch + debit memos (same rules as /workflow page).
    // Do not require workflowState — it loads in a second request and caused "Continue Workflow"
    // to flash before fetchBatchWorkflow returned. Optional workflow flags still merge when loaded.
    const isWorkflowComplete = () => {
        if (!batch) return false;

        const cardinalComplete = Boolean(workflowState?.cardinalGenerated || batch.cardinalFileGenerated);
        const cardinalSent = Boolean(workflowState?.cardinalSent || batch.cardinalSubmittedAt);
        const debitMemosCreated = Boolean(workflowState?.debitMemosCreated || batch.totalDebitMemos > 0);

        const allRasSent =
            batchMemos.length > 0 &&
            batchMemos.every(
                memo =>
                    memo.raRequestedAt ||
                    memo.raStatus === 'requested' ||
                    memo.raStatus === 'received' ||
                    memo.raStatus === 'shipped'
            );
        const raComplete = Boolean(workflowState?.raRequested || allRasSent);

        return cardinalComplete && cardinalSent && debitMemosCreated && raComplete;
    };

    // ─────────────────────────────────────────────────────────

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
                <AlertCircle className="w-12 h-12 mx-auto mb-3" style={{ color: 'var(--error)' }} />
                <p className="text-lg font-medium" style={{ color: 'var(--foreground)' }}>Batch not found</p>
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
                    <button onClick={() => router.push('/warehouse/batches')} className="p-0.5" style={{ color: 'var(--outline)' }}>
                        <ArrowLeft className="w-4 h-4" />
                    </button>
                    <div>
                        <div className="flex items-center gap-1.5">
                            <h1 className="font-heading text-base font-bold" style={{ color: 'var(--foreground)' }}>{batch.batchName}</h1>
                            <span className="inline-flex items-center px-2 py-0.5 rounded border text-[10px] font-medium" style={statusPillStyle(batch.status)}>
                                {sb.label}
                            </span>
                        </div>
                        <p className="text-xs" style={{ color: 'var(--on-surface-variant)' }}>{formatBatchMonth(batch.batchMonth)}</p>
                    </div>
                </div>
                <div className="flex flex-wrap gap-1.5">
                    {batch.status === 'open' && (
                        <>
                            <button
                                onClick={openAssignModal}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-[4px] text-xs font-medium bg-primary-600 text-white hover:bg-primary-700 transition-colors cursor-pointer"
                            >
                                <Plus className="w-3.5 h-3.5" /> Assign Returns
                            </button>
                            {batchReturns.length > 0 && (
                                <button
                                    onClick={openUnassignModal}
                                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-[4px] text-xs font-medium border transition-colors hover:opacity-95 cursor-pointer bg-[var(--secondary-container)] text-[var(--on-secondary-container)] border-[var(--outline-variant)]"
                                >
                                    <UserX className="w-3.5 h-3.5" /> Unassign Returns
                                </button>
                            )}
                            <button
                                onClick={() => setShowClose(true)}
                                disabled={batch.totalReturns === 0}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-[4px] text-xs font-medium border transition-colors hover:opacity-95 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed bg-[var(--tertiary)] text-[var(--on-tertiary)] border-[var(--outline-variant)]"
                            >
                                <Lock className="w-3.5 h-3.5" /> Close Batch
                            </button>
                            {batchPermissions?.canDelete && (
                                <button
                                    onClick={() => setShowDelete(true)}
                                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-[4px] text-xs font-medium border transition-colors hover:bg-[var(--surface-container-low)] cursor-pointer"
                                    style={{ backgroundColor: 'var(--error-container)', color: '#000000', borderColor: 'var(--outline-variant)' }}
                                >
                                    <Trash2 className="w-3.5 h-3.5" /> Delete Batch
                                </button>
                            )}
                        </>
                    )}
                    {(batch.status === 'closed' || batch.status === 'submitted') && !isWorkflowComplete() && (
<button
                    onClick={() => router.push(`/warehouse/batches/${batchId}/workflow`)}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-[4px] text-xs font-medium text-white transition-colors"
                    style={{ backgroundColor: 'var(--primary)' }}
                >
                    <Layers className="w-3.5 h-3.5" />
                    Continue Workflow
                </button>
                    )}
                    {(batch.status === 'closed' || batch.status === 'submitted') && isWorkflowComplete() && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-[4px] text-xs font-medium border"
                              style={{ backgroundColor: 'var(--secondary-container)', color: 'var(--on-secondary-container)', borderColor: 'var(--outline-variant)' }}
                        >
                            <CheckCircle className="w-3.5 h-3.5" />
                            Workflow Complete
                        </span>
                    )}
                </div>
            </div>

            {/* Batch Info Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                <div className="rounded-[4px] shadow px-3 py-2 border" style={{ backgroundColor: 'var(--surface-container-lowest)', borderColor: 'var(--outline-variant)' }}>
                    <p className="text-[10px] uppercase font-medium" style={{ color: 'var(--on-surface-variant)' }}>Returns</p>
                    <p className="text-lg font-bold mt-0.5">{batch.totalReturns}</p>
                </div>
                <div className="rounded-[4px] shadow px-3 py-2 border" style={{ backgroundColor: 'var(--surface-container-lowest)', borderColor: 'var(--outline-variant)' }}>
                    <p className="text-[10px] uppercase font-medium" style={{ color: 'var(--on-surface-variant)' }}>Debit Memos</p>
                    <p className="text-lg font-bold mt-0.5">{batch.totalDebitMemos}</p>
                </div>
                <div className="rounded-[4px] shadow px-3 py-2 border" style={{ backgroundColor: 'var(--surface-container-lowest)', borderColor: 'var(--outline-variant)' }}>
                    <p className="text-[10px] uppercase font-medium" style={{ color: 'var(--on-surface-variant)' }}>Total Value</p>
                    <p className="text-lg font-bold mt-0.5" style={{ color: 'var(--secondary)' }}>{formatCurrency(batch.totalValue)}</p>
                </div>
                <div className="rounded-[4px] shadow px-3 py-2 border" style={{ backgroundColor: 'var(--surface-container-lowest)', borderColor: 'var(--outline-variant)' }}>
                    <p className="text-[10px] uppercase font-medium" style={{ color: 'var(--on-surface-variant)' }}>Cardinal Status</p>
                    <div className="mt-0.5">
                        {batch.cardinalSubmittedAt ? (
                            <div>
                                <span className="inline-flex items-center px-2 py-0.5 rounded border text-[10px] font-medium" style={cardinalPillStyle('submitted')}>
                                    Submitted
                                </span>
                                <p className="text-[10px] mt-0.5" style={{ color: 'var(--on-surface-variant)' }}>{formatDate(batch.cardinalSubmittedAt)}</p>
                            </div>
                        ) : batch.cardinalFileGenerated ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded border text-[10px] font-medium" style={cardinalPillStyle('file_ready')}>
                                File Ready
                            </span>
                        ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded border text-[10px] font-medium" style={cardinalPillStyle('pending')}>
                                Pending
                            </span>
                        )}
                    </div>
                </div>
            </div>

            {/* Batch Metadata */}
            <div className="rounded-[4px] shadow px-4 py-3 border" style={{ backgroundColor: 'var(--surface-container-lowest)', borderColor: 'var(--outline-variant)' }}>
                <h2 className="text-xs font-semibold mb-2" style={{ color: 'var(--foreground)' }}>Batch Details</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div>
                        <p className="text-[10px]" style={{ color: 'var(--on-surface-variant)' }}>Created</p>
                        <p className="text-xs font-medium">{formatDateTime(batch.createdAt)}</p>
                    </div>
                    {batch.closedAt && (
                        <div>
                            <p className="text-[10px]" style={{ color: 'var(--on-surface-variant)' }}>Closed</p>
                            <p className="text-xs font-medium">{formatDateTime(batch.closedAt)}</p>
                        </div>
                    )}
                    {batch.cardinalApprovedAt && (
                        <div>
                            <p className="text-[10px]" style={{ color: 'var(--on-surface-variant)' }}>Cardinal Approved</p>
                            <p className="text-xs font-medium">{formatDateTime(batch.cardinalApprovedAt)}</p>
                        </div>
                    )}
                    {batch.cardinalFileUrl && (
                        <div>
                            <p className="text-[10px]" style={{ color: 'var(--on-surface-variant)' }}>Cardinal File</p>
                            <a href={batch.cardinalFileUrl} target="_blank" rel="noopener noreferrer"
                               className="text-xs hover:underline flex items-center gap-1"
                               style={{ color: 'var(--primary)' }}
                            >
                                Download <ExternalLink className="w-3 h-3" />
                            </a>
                        </div>
                    )}
                </div>
            </div>

            {/* Returns in Batch */}
            <div className="rounded-[4px] shadow overflow-hidden border" style={{ backgroundColor: 'var(--surface-container-lowest)', borderColor: 'var(--outline-variant)' }}>
                <button
                    onClick={() => setReturnsExpanded(e => !e)}
                    className="w-full flex items-center justify-between px-4 py-2.5 transition-colors hover:bg-[var(--surface-container-low)]"
                >
                    <div className="flex items-center gap-1.5">
                        <Package className="w-3.5 h-3.5" style={{ color: 'var(--on-surface-variant)' }} />
                        <h2 className="text-xs font-semibold" style={{ color: 'var(--foreground)' }}>Returns in Batch</h2>
                        <Badge variant="default"><span className="text-[10px]">{batchReturns.length}</span></Badge>
                    </div>
                    {returnsExpanded ? <ChevronUp className="w-3.5 h-3.5" style={{ color: 'var(--outline)' }} /> : <ChevronDown className="w-3.5 h-3.5" style={{ color: 'var(--outline)' }} />}
                </button>

                {returnsExpanded && (
                    <div className="border-t" style={{ borderColor: 'var(--outline-variant)' }}>
                        {batchReturns.length === 0 ? (
                            <p className="text-center py-6 text-xs" style={{ color: 'var(--on-surface-variant)' }}>No returns assigned yet.</p>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="min-w-full text-sm border" style={{ borderColor: 'var(--outline)' }}>
                                    <thead className="bg-[var(--surface-container-low)] border-b" style={{ borderColor: 'var(--outline)', borderBottomWidth: '1.5px' }}>
                                        <tr className="bg-[var(--surface-container-low)]">
                                            <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--on-surface-variant)] whitespace-nowrap">License Plate</th>
                                            <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--on-surface-variant)] whitespace-nowrap">Pharmacy</th>
                                            <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--on-surface-variant)] whitespace-nowrap">Status</th>
                                            <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--on-surface-variant)] whitespace-nowrap">Items</th>
                                            <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--on-surface-variant)] whitespace-nowrap">Value</th>
                                            <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--on-surface-variant)] whitespace-nowrap">Tracking</th>
                                            <th className="px-3 py-3 text-center text-xs font-semibold uppercase tracking-wider text-[var(--on-surface-variant)]">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y" style={{ borderColor: 'var(--outline-variant)' }}>
                                        {batchReturns.map((rt: ReturnTransaction) => (
                                            <tr key={rt.id} className="hover:bg-[var(--surface-container)] cursor-pointer" style={{ borderColor: 'var(--outline-variant)' }} onClick={() => router.push(`/warehouse/returns/${rt.id}`)}>
                                                <td className="px-3 py-3 text-sm font-medium" style={{ color: 'var(--foreground)' }}>{rt.licensePlate}</td>
                                                <td className="px-3 py-3 text-sm" style={{ color: 'var(--on-surface)' }}>{rt.pharmacyName}</td>
                                                <td className="px-3 py-3"><Badge variant="default"><span className="text-[10px]">{rt.status?.replace(/_/g, ' ')}</span></Badge></td>
                                                <td className="px-3 py-3 text-sm" style={{ color: 'var(--on-surface)' }}>{rt.totalItems}</td>
                                                <td className="px-3 py-3 text-sm font-medium">{formatCurrency(rt.totalReturnableValue || 0)}</td>
                                                <td className="px-3 py-3 text-sm" style={{ color: 'var(--on-surface-variant)' }}>{rt.fedexTracking || '—'}</td>
                                                <td className="px-3 py-3 text-center">
                                                    {(batch.status === 'closed' || batch.status === 'submitted') && (
                                                        <button
                                                            onClick={(e) => handleDownloadSummary(rt.id, e)}
                                                            disabled={downloadingReturnId === rt.id}
                                                            className="inline-flex items-center gap-1 px-2 py-1 rounded-[4px] text-[10px] font-medium border transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[var(--surface-container-low)]"
                                                            style={{ borderColor: 'var(--outline-variant)', backgroundColor: 'var(--surface-container-lowest)', color: 'var(--on-surface)' }}
                                                        >
                                                            {downloadingReturnId === rt.id ? (
                                                                <><Loader2 className="w-3 h-3 animate-spin" /> Downloading...</>
                                                            ) : (
                                                                <><Download className="w-3 h-3" /> DM Summary</>
                                                            )}
                                                        </button>
                                                    )}
                                                </td>
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
                <div className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm" style={{ backgroundColor: 'color-mix(in srgb, var(--inverse-surface) 55%, transparent)' }} onClick={() => setShowAssign(false)}>
                    <div className="rounded-[4px] shadow-xl max-w-xl w-full mx-4 max-h-[80vh] flex flex-col border" style={{ backgroundColor: 'var(--surface-container-lowest)', borderColor: 'var(--outline-variant)' }} onClick={e => e.stopPropagation()}>
                        <div className="px-4 py-3 border-b" style={{ borderColor: 'var(--outline-variant)' }}>
                            <div className="flex items-center justify-between">
                                <h2 className="text-sm font-bold" style={{ color: 'var(--foreground)' }}>Assign Returns to Batch</h2>
                                <button onClick={() => setShowAssign(false)} style={{ color: 'var(--outline)' }}><X className="w-4 h-4" /></button>
                            </div>
                            <div className="relative mt-2">
                                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2" style={{ color: 'var(--outline)' }} />
                                <input
                                    type="text"
                                    placeholder="Search by license plate, pharmacy, tracking..."
                                    className="w-full pl-8 pr-3 py-1.5 border rounded text-xs focus:ring-1 focus:ring-primary-500"
                                    style={{ borderColor: 'var(--outline-variant)', backgroundColor: 'var(--surface-container-low)' }}
                                    value={assignSearch}
                                    onChange={e => setAssignSearch(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="overflow-y-auto flex-1 p-3">
                            {assignReturnsLoading ? (
                                <div className="flex flex-col items-center justify-center gap-2 py-10 text-xs" style={{ color: 'var(--on-surface-variant)' }}>
                                    <Loader2 className="w-6 h-6 animate-spin" style={{ color: 'var(--primary)' }} />
                                    Loading returns…
                                </div>
                            ) : filteredReceived.length === 0 ? (
                                <p className="text-center py-6 text-xs" style={{ color: 'var(--on-surface-variant)' }}>No verified returns available for assignment.</p>
                            ) : (
                                <div className="space-y-1.5">
                                    {filteredReceived.map(rt => {
                                        const selected = selectedReturnIds.includes(rt.id);
                                        return (
                                            <label
                                                key={rt.id}
                                                className={`flex items-center gap-2.5 px-3 py-2 rounded-[4px] border-2 cursor-pointer transition-colors ${
                                                    selected ? '' : ''
                                                }`}
                                                style={selected ? { borderColor: 'var(--primary)', backgroundColor: 'var(--primary-container)' } : { borderColor: 'var(--outline-variant)' }}
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={selected}
                                                    onChange={() => toggleReturnSelection(rt.id)}
                                                    className="w-3.5 h-3.5 text-primary-600 rounded focus:ring-primary-500"
                                                />
                                                <div className="flex-1 min-w-0">
                                                    <p
                                                        className="text-xs font-medium"
                                                        style={{ color: selected ? '#ffffff' : 'var(--foreground)' }}
                                                    >
                                                        {rt.licensePlate}
                                                    </p>
                                                    <p
                                                        className="text-[10px]"
                                                        style={{
                                                            color: selected ? 'rgba(255, 255, 255, 0.85)' : 'var(--on-surface-variant)',
                                                        }}
                                                    >
                                                        {rt.pharmacyName} · {rt.totalItems} items · {formatCurrency(rt.totalReturnableValue || 0)}
                                                    </p>
                                                </div>
                                                <Badge
                                                    variant="default"
                                                    style={
                                                        selected
                                                            ? {
                                                                  backgroundColor: 'rgba(255, 255, 255, 0.18)',
                                                                  color: '#ffffff',
                                                                  borderColor: 'rgba(255, 255, 255, 0.35)',
                                                              }
                                                            : undefined
                                                    }
                                                >
                                                    <span className="text-[10px]">{rt.status?.replace(/_/g, ' ')}</span>
                                                </Badge>
                                            </label>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        <div className="px-4 py-3 border-t flex items-center justify-between" style={{ borderColor: 'var(--outline-variant)', backgroundColor: 'var(--surface-container-low)' }}>
                            <p className="text-xs" style={{ color: 'var(--on-surface-variant)' }}>{selectedReturnIds.length} selected</p>
                            <div className="flex gap-2">
                                <button onClick={() => setShowAssign(false)} className="px-3 py-1.5 text-xs rounded border transition-colors hover:bg-primary-50/40" style={{ borderColor: 'var(--outline-variant)', backgroundColor: 'var(--surface-container-lowest)', color: 'var(--on-surface)' }}>Cancel</button>
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
                <div className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm" style={{ backgroundColor: 'color-mix(in srgb, var(--inverse-surface) 55%, transparent)' }} onClick={() => setShowClose(false)}>
                    <div className="rounded-[4px] shadow-xl max-w-sm w-full mx-4 p-4 border" style={{ backgroundColor: 'var(--surface-container-lowest)', borderColor: 'var(--outline-variant)' }} onClick={e => e.stopPropagation()}>
                        <div className="flex items-center gap-2.5 mb-3">
                            <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: 'var(--tertiary-fixed)' }}>
                                <Lock className="w-4 h-4" style={{ color: 'var(--tertiary)' }} />
                            </div>
                            <div>
                                <h3 className="text-sm font-bold" style={{ color: 'var(--foreground)' }}>Close Batch</h3>
                                <p className="text-xs" style={{ color: 'var(--on-surface-variant)' }}>This will generate debit memos and cannot be undone.</p>
                            </div>
                        </div>
                        <div
                            className="border rounded-[4px] p-2.5 text-xs mb-3"
                            style={{
                                backgroundColor: 'var(--secondary-container)',
                                borderColor: 'var(--outline-variant)',
                                color: 'var(--on-secondary-container)',
                            }}
                        >
                            <p className="font-semibold mb-1.5" style={{ color: 'var(--on-surface)' }}>This action will:</p>
                            <ul className="list-disc ml-4 space-y-0.5" style={{ color: 'var(--on-surface)' }}>
                                <li>Lock the batch from further changes</li>
                                <li>Generate debit memos grouped by pharmacy + destination + labeler</li>
                                <li>Validate all items have destinations (no TBD items allowed)</li>
                            </ul>
                        </div>
                        <div className="flex justify-end gap-2">
                            <button onClick={() => setShowClose(false)} className="px-3 py-1.5 text-xs rounded border transition-colors hover:bg-primary-50/40" style={{ borderColor: 'var(--outline-variant)', backgroundColor: 'var(--surface-container-lowest)', color: 'var(--on-surface)' }}>Cancel</button>
                            <button onClick={handleClose} disabled={isActionLoading} className="inline-flex items-center gap-1 px-3 py-1.5 text-xs rounded text-white disabled:opacity-50 transition-colors" style={{ backgroundColor: 'var(--tertiary)' }}>
                                {isActionLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Lock className="w-3.5 h-3.5" />}
                                Close Batch
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Submit Cardinal Confirm ──────────────────────────── */}
            {showSubmit && (
                <div className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm" style={{ backgroundColor: 'color-mix(in srgb, var(--inverse-surface) 55%, transparent)' }} onClick={() => setShowSubmit(false)}>
                    <div className="rounded-[4px] shadow-xl max-w-sm w-full mx-4 p-4 border" style={{ backgroundColor: 'var(--surface-container-lowest)', borderColor: 'var(--outline-variant)' }} onClick={e => e.stopPropagation()}>
                        <div className="flex items-center gap-2.5 mb-3">
                            <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: 'var(--secondary-container)' }}>
                                <Send className="w-4 h-4" style={{ color: 'var(--secondary)' }} />
                            </div>
                            <div>
                                <h3 className="text-sm font-bold" style={{ color: 'var(--foreground)' }}>Submit to Cardinal</h3>
                                <p className="text-xs" style={{ color: 'var(--on-surface-variant)' }}>Mark this batch as submitted to Cardinal.</p>
                            </div>
                        </div>
                        <p className="text-xs mb-3" style={{ color: 'var(--on-surface)' }}>
                            This records that the Cardinal file for batch <strong>{batch.batchName}</strong> has been submitted.
                        </p>
                        <div className="flex justify-end gap-2">
                            <button onClick={() => setShowSubmit(false)} className="px-3 py-1.5 text-xs rounded border transition-colors hover:bg-primary-50/40" style={{ borderColor: 'var(--outline-variant)', backgroundColor: 'var(--surface-container-lowest)', color: 'var(--on-surface)' }}>Cancel</button>
                            <button onClick={handleSubmitCardinal} disabled={isActionLoading} className="inline-flex items-center gap-1 px-3 py-1.5 text-xs rounded text-white disabled:opacity-50 transition-colors" style={{ backgroundColor: 'var(--secondary)' }}>
                                {isActionLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                                Confirm Submission
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Delete Batch Confirm ──────────────────────────── */}
            {showDelete && (
                <div className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm" style={{ backgroundColor: 'color-mix(in srgb, var(--inverse-surface) 55%, transparent)' }} onClick={() => setShowDelete(false)}>
                    <div className="rounded-[4px] shadow-xl max-w-sm w-full mx-4 p-4 border" style={{ backgroundColor: 'var(--surface-container-lowest)', borderColor: 'var(--outline-variant)' }} onClick={e => e.stopPropagation()}>
                        <div className="flex items-center gap-2.5 mb-3">
                            <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: 'var(--error-container)' }}>
                                <Trash2 className="w-4 h-4" style={{ color: 'var(--error)' }} />
                            </div>
                            <div>
                                <h3 className="text-sm font-bold" style={{ color: 'var(--foreground)' }}>Delete Batch</h3>
                                <p className="text-xs" style={{ color: 'var(--on-surface-variant)' }}>This action cannot be undone.</p>
                            </div>
                        </div>
                        <p className="text-xs mb-3" style={{ color: 'var(--on-surface)' }}>
                            Are you sure you want to delete batch <strong>{batch.batchName}</strong>?
                            {batch.totalReturns > 0 && ` All ${batch.totalReturns} assigned return(s) will be unassigned.`}
                        </p>
                        <div className="flex justify-end gap-2">
                            <button onClick={() => setShowDelete(false)} className="px-3 py-1.5 text-xs rounded border transition-colors hover:bg-primary-50/40" style={{ borderColor: 'var(--outline-variant)', backgroundColor: 'var(--surface-container-lowest)', color: 'var(--on-surface)' }}>Cancel</button>
                            <button onClick={handleDeleteBatch} disabled={isActionLoading} className="inline-flex items-center gap-1 px-3 py-1.5 text-xs rounded text-white disabled:opacity-50 transition-colors" style={{ backgroundColor: 'var(--error)' }}>
                                {isActionLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                                Delete Batch
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Unassign Returns Modal ──────────────────────────────── */}
            {showUnassign && (
                <div className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm" style={{ backgroundColor: 'color-mix(in srgb, var(--inverse-surface) 55%, transparent)' }} onClick={() => setShowUnassign(false)}>
                    <div className="rounded-[4px] shadow-xl max-w-xl w-full mx-4 max-h-[80vh] flex flex-col border" style={{ backgroundColor: 'var(--surface-container-lowest)', borderColor: 'var(--outline-variant)' }} onClick={e => e.stopPropagation()}>
                        <div className="px-4 py-3 border-b" style={{ borderColor: 'var(--outline-variant)' }}>
                            <div className="flex items-center justify-between">
                                <h2 className="text-sm font-bold" style={{ color: 'var(--foreground)' }}>Unassign Returns from Batch</h2>
                                <button onClick={() => setShowUnassign(false)} style={{ color: 'var(--outline)' }}><X className="w-4 h-4" /></button>
                            </div>
                            <p className="text-xs mt-1" style={{ color: 'var(--on-surface-variant)' }}>Select returns to remove from this batch</p>
                        </div>

                        <div className="overflow-y-auto flex-1 p-3">
                            {batchReturns.length === 0 ? (
                                <div className="text-center py-8">
                                    <Package className="w-8 h-8 mx-auto mb-2" style={{ color: 'var(--outline-variant)' }} />
                                    <p className="text-xs" style={{ color: 'var(--on-surface-variant)' }}>No returns assigned to this batch</p>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {batchReturns.map(ret => (
                                        <div key={ret.id} className="flex items-center gap-2 p-2 border rounded hover:bg-primary-50/40 transition-colors" style={{ borderColor: 'var(--outline-variant)', backgroundColor: 'var(--surface-container-lowest)' }}>
                                            <input
                                                type="checkbox"
                                                checked={selectedUnassignIds.includes(ret.id)}
                                                onChange={() => toggleUnassignSelection(ret.id)}
                                                className="w-3.5 h-3.5 text-primary-600 rounded focus:ring-primary-500"
                                                style={{ borderColor: 'var(--outline-variant)' }}
                                            />
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-1.5 mb-0.5">
                                                    <span className="text-xs font-medium" style={{ color: 'var(--foreground)' }}>{ret.licensePlate}</span>
                                                    <Badge variant={returnTransactionStatusBadgeVariant(ret.status)}>
                                                        <span className="text-[10px]">{ret.status}</span>
                                                    </Badge>
                                                </div>
                                                <p className="text-[10px]" style={{ color: 'var(--on-surface-variant)' }}>{ret.pharmacyName}</p>
                                                <p className="text-[10px]" style={{ color: 'var(--on-surface-variant)' }}>{formatCurrency(ret.totalReturnableValue + ret.totalNonReturnableValue)}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="px-4 py-3 border-t" style={{ borderColor: 'var(--outline-variant)', backgroundColor: 'var(--surface-container-low)' }}>
                            <div className="flex items-center justify-between">
                                <p className="text-xs" style={{ color: 'var(--on-surface-variant)' }}>
                                    {selectedUnassignIds.length} of {batchReturns.length} selected
                                </p>
                                <div className="flex gap-2">
                                    <button onClick={() => setShowUnassign(false)} className="px-3 py-1.5 text-xs rounded border transition-colors hover:bg-primary-50/40" style={{ borderColor: 'var(--outline-variant)', backgroundColor: 'var(--surface-container-lowest)', color: 'var(--on-surface)' }}>
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleUnassignReturns}
                                        disabled={isActionLoading || selectedUnassignIds.length === 0}
                                        className="inline-flex items-center gap-1 px-3 py-1.5 text-xs rounded text-white disabled:opacity-50 transition-colors"
                                        style={{ backgroundColor: 'var(--tertiary)' }}
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
