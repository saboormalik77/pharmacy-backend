'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import {
    ArrowLeft, Loader2, AlertCircle, Layers, Lock, Send,
    Plus, ChevronDown, ChevronUp, Package,
    CheckCircle, X, Search, ExternalLink, Trash2, UserX,
    Download, Upload, FileText, GitPullRequest, ChevronRight, Mail,
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
    clearCurrentBatch, clearError,
    fetchBatchWorkflow, completeBatchWorkflowStep, generateBatchMemos,
} from '@/lib/store/batchSlice';
import { sendRARequest } from '@/lib/store/raTrackingSlice';
import { fetchReceivedReturns } from '@/lib/store/warehouseSlice';
import { ReturnTransaction, DebitMemo } from '@/lib/types';

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

// ── Stepper step definitions ──────────────────────────────────

const WORKFLOW_STEPS = [
    {
        key: 'cardinal_generated',
        stateKey: 'cardinalGenerated' as const,
        label: 'Generate Cardinal Invoice',
        description: 'Download the Cardinal Invoice PDF for this batch.',
        icon: Download,
        color: 'blue',
    },
    {
        key: 'cardinal_sent',
        stateKey: 'cardinalSent' as const,
        label: 'Send Cardinal Invoice',
        description: 'Upload and send the Cardinal file.',
        icon: Upload,
        color: 'purple',
    },
    {
        key: 'debit_memos_created',
        stateKey: 'debitMemosCreated' as const,
        label: 'Create Debit Memos',
        description: 'Review and confirm debit memos generated for this batch.',
        icon: FileText,
        color: 'orange',
    },
    {
        key: 'ra_requested',
        stateKey: 'raRequested' as const,
        label: 'Request RA',
        description: 'Submit Return Authorization requests for all debit memos to reverse distributors.',
        icon: GitPullRequest,
        color: 'green',
    },
] as const;

type WorkflowStepKey = typeof WORKFLOW_STEPS[number]['stateKey'];

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
        workflowState,
        error,
    } = useAppSelector(s => s.batch);

    const { receivedReturns } = useAppSelector(s => s.warehouse);
    const raActionLoading = useAppSelector(s => s.raTracking.isActionLoading);

    const [toasts, setToasts] = useState<Toast[]>([]);
    const [showAssign, setShowAssign] = useState(false);
    const [showClose, setShowClose] = useState(false);
    const [showSubmit, setShowSubmit] = useState(false);
    const [showDelete, setShowDelete] = useState(false);
    const [showUnassign, setShowUnassign] = useState(false);
    const [showStepper, setShowStepper] = useState(false);
    const [selectedUnassignIds, setSelectedUnassignIds] = useState<string[]>([]);
    const [batchPermissions, setBatchPermissions] = useState<any>(null);
    const [selectedReturnIds, setSelectedReturnIds] = useState<string[]>([]);
    const [assignSearch, setAssignSearch] = useState('');
    const [returnsExpanded, setReturnsExpanded] = useState(true);

    // Cardinal send step — file upload state
    const [cardinalFile, setCardinalFile] = useState<File | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // RA request step — track which reverse distributor group's RA is being sent (by destination)
    const [raSendingGroup, setRaSendingGroup] = useState<string | null>(null);
    const [isSendingAllRA, setIsSendingAllRA] = useState(false);

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

    // Load workflow state whenever batch is closed/submitted
    useEffect(() => {
        if (batch && (batch.status === 'closed' || batch.status === 'submitted')) {
            dispatch(fetchBatchWorkflow(batchId));
        }
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
        dispatch(fetchReceivedReturns({ limit: 100, verificationStatus: 'verified' }));
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
            addToast('Batch closed. Use the workflow stepper to create debit memos.', 'success');
            setShowClose(false);
            dispatch(fetchBatchDetail(batchId));
            // Fetch workflow state then auto-open the stepper
            await dispatch(fetchBatchWorkflow(batchId));
            setShowStepper(true);
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
        // Only show verified returns
        if (r.status !== 'verified') return false;
        // Don't show returns already assigned to a batch
        if (r.batchId) return false;
        // Apply search filter
        if (!assignSearch) return true;
        const s = assignSearch.toLowerCase();
        return (
            r.licensePlate?.toLowerCase().includes(s) ||
            r.pharmacyName?.toLowerCase().includes(s) ||
            r.fedexTracking?.toLowerCase().includes(s)
        );
    });

    // ── Workflow / stepper helpers ────────────────────────────

    const openStepper = () => {
        dispatch(fetchBatchWorkflow(batchId));
        setShowStepper(true);
    };

    const handleCompleteStep = async (stepKey: string) => {
        const result = await dispatch(completeBatchWorkflowStep({ batchId, step: stepKey }));
        if (completeBatchWorkflowStep.rejected.match(result)) {
            addToast(result.payload as string || 'Failed to save step', 'error');
        }
    };

    // Step 1: Generate Cardinal — download Cardinal Invoice PDF and Pharmacy Itemized Return XLSX
    const handleGenerateCardinal = async () => {
        if (!batch) return;

        try {
            const token = cookieUtils.getAuthToken();
            if (!token) {
                addToast('Not signed in. Please log in again.', 'error');
                return;
            }
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

            // 1. Download Cardinal Invoice PDF
            const pdfResponse = await fetch(`${apiUrl}/admin/batches/${batchId}/cardinal-invoice`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'X-Tenant-Domain': window.location.hostname,
                },
            });

            if (!pdfResponse.ok) {
                const errorData = await pdfResponse.json().catch(() => ({ message: 'Failed to download' }));
                throw new Error(errorData.message || 'Failed to download Cardinal Invoice');
            }

            const pdfBlob = await pdfResponse.blob();
            const pdfUrl = URL.createObjectURL(pdfBlob);
            const pdfLink = document.createElement('a');
            pdfLink.href = pdfUrl;
            
            const pdfContentDisposition = pdfResponse.headers.get('Content-Disposition');
            let pdfFilename = `Cardinal_Invoice_${batch.batchName.replace(/\s+/g, '_')}.pdf`;
            if (pdfContentDisposition) {
                const filenameMatch = pdfContentDisposition.match(/filename="?([^";\n]+)"?/);
                if (filenameMatch) pdfFilename = filenameMatch[1];
            }
            
            pdfLink.download = pdfFilename;
            pdfLink.click();
            URL.revokeObjectURL(pdfUrl);

            // 2. Download Pharmacy Itemized Return XLSX files
            const xlsxResponse = await fetch(`${apiUrl}/admin/batches/${batchId}/pharmacy-returns`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'X-Tenant-Domain': window.location.hostname,
                },
            });

            if (!xlsxResponse.ok) {
                const errorData = await xlsxResponse.json().catch(() => ({ message: 'Failed to download' }));
                throw new Error(errorData.message || 'Failed to download Pharmacy Returns');
            }

            const xlsxData = await xlsxResponse.json();
            const files = xlsxData.data?.files || [];
            
            // Download each XLSX file
            for (const file of files) {
                const byteCharacters = atob(file.base64);
                const byteNumbers = new Array(byteCharacters.length);
                for (let i = 0; i < byteCharacters.length; i++) {
                    byteNumbers[i] = byteCharacters.charCodeAt(i);
                }
                const byteArray = new Uint8Array(byteNumbers);
                const fileBlob = new Blob([byteArray], { 
                    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
                });
                
                const fileUrl = URL.createObjectURL(fileBlob);
                const fileLink = document.createElement('a');
                fileLink.href = fileUrl;
                fileLink.download = file.filename;
                fileLink.click();
                URL.revokeObjectURL(fileUrl);
            }

            await handleCompleteStep('cardinal_generated');
            addToast(`Cardinal Invoice (PDF) and ${files.length} Pharmacy Return (XLSX) file(s) downloaded. Step saved.`, 'success');
        } catch (error: any) {
            addToast(error.message || 'Failed to generate Cardinal Invoice', 'error');
        }
    };

    // Step 2: Send Cardinal — mark file as sent
    const handleSendCardinal = async () => {
        if (!cardinalFile) {
            addToast('Please select a file first', 'warning');
            return;
        }
        await handleCompleteStep('cardinal_sent');
        setCardinalFile(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
        addToast('Cardinal file marked as sent.', 'success');
    };

    // Step 3: Generate debit memos then refresh batch (so memos list appears)
    const handleCreateDebitMemos = async () => {
        const result = await dispatch(generateBatchMemos(batchId));
        if (generateBatchMemos.fulfilled.match(result)) {
            addToast(`${result.payload.memosGenerated} debit memo(s) created.`, 'success');
            dispatch(fetchBatchDetail(batchId));
        } else {
            addToast((result.payload as string) || 'Failed to create debit memos', 'error');
        }
    };

    // Step 3: Confirm debit memos — stay in modal, advance to Step 4
    const handleConfirmDebitMemos = async () => {
        await handleCompleteStep('debit_memos_created');
        addToast('Debit memos confirmed. Proceed to Request RA from reverse distributors.', 'success');
    };

    // Step 4: Send RA requests for all unsent memos in a reverse distributor group
    const handleSendRAForGroup = async (destination: string, distributorName: string, memos: DebitMemo[]) => {
        const unsent = memos.filter(
            m => !m.raRequestedAt && m.raStatus !== 'requested' && m.raStatus !== 'received' && m.raStatus !== 'shipped'
        );
        if (unsent.length === 0) return;
        setRaSendingGroup(destination);
        let sentCount = 0;
        for (const memo of unsent) {
            const result = await dispatch(sendRARequest({ memoId: memo.id }));
            if (sendRARequest.fulfilled.match(result)) {
                sentCount++;
            } else {
                addToast(`Failed to send RA for ${memo.memoNumber}`, 'error');
            }
        }
        setRaSendingGroup(null);
        if (sentCount > 0) {
            addToast(`RA request${sentCount > 1 ? 's' : ''} sent to ${distributorName}`, 'success');
            dispatch(fetchBatchDetail(batchId));
        }
    };

    // Step 4: Send RA requests for ALL pending distributor groups at once
    const handleSendAllRA = async () => {
        const groups: Record<string, { destination: string; distributorName: string; memos: DebitMemo[] }> = {};
        batchMemos.forEach(m => {
            const key = m.destination || 'unknown';
            if (!groups[key]) {
                groups[key] = {
                    destination: key,
                    distributorName: key === 'unknown' ? 'Unknown Distributor' : key.charAt(0).toUpperCase() + key.slice(1),
                    memos: [],
                };
            }
            groups[key].memos.push(m);
        });
        const pendingGroups = Object.values(groups).filter(group =>
            !group.memos.every(m => m.raRequestedAt || m.raStatus === 'requested' || m.raStatus === 'received' || m.raStatus === 'shipped')
        );
        if (pendingGroups.length === 0) return;

        setIsSendingAllRA(true);
        let totalSent = 0;
        for (const group of pendingGroups) {
            const unsent = group.memos.filter(
                m => !m.raRequestedAt && m.raStatus !== 'requested' && m.raStatus !== 'received' && m.raStatus !== 'shipped'
            );
            setRaSendingGroup(group.destination);
            for (const memo of unsent) {
                const result = await dispatch(sendRARequest({ memoId: memo.id }));
                if (sendRARequest.fulfilled.match(result)) {
                    totalSent++;
                } else {
                    addToast(`Failed to send RA for ${memo.memoNumber}`, 'error');
                }
            }
        }
        setRaSendingGroup(null);
        setIsSendingAllRA(false);
        if (totalSent > 0) {
            addToast(`${totalSent} RA request${totalSent > 1 ? 's' : ''} sent to all distributors.`, 'success');
            dispatch(fetchBatchDetail(batchId));
        }
    };

    // Step 4: Mark RA step as complete
    const handleCompleteRAStep = async () => {
        await handleCompleteStep('ra_requested');
        addToast('RA request step completed.', 'success');
    };

    // Which step is currently active (first incomplete step)
    const getActiveStepIndex = () => {
        if (!workflowState) return 0;
        for (let i = 0; i < WORKFLOW_STEPS.length; i++) {
            if (!workflowState[WORKFLOW_STEPS[i].stateKey]) return i;
        }
        return WORKFLOW_STEPS.length; // all done
    };

    const activeStepIndex = getActiveStepIndex();
    const allDone = workflowState !== null && activeStepIndex === WORKFLOW_STEPS.length;

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
                    {(batch.status === 'closed' || batch.status === 'submitted') && (
                        <button
                            onClick={openStepper}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded text-xs font-medium bg-blue-600 text-white hover:bg-blue-700 transition-colors"
                        >
                            <Layers className="w-3.5 h-3.5" />
                            {allDone ? 'View Workflow' : 'Continue Workflow'}
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

            {/* ── Workflow Stepper Modal ──────────────────────────────── */}
            {showStepper && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
                        {/* Modal header */}
                        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
                            <div>
                                <h2 className="text-sm font-bold text-gray-900">Post-Closeout Workflow</h2>
                                <p className="text-[11px] text-gray-500 mt-0.5">{batch.batchName} · {formatBatchMonth(batch.batchMonth)}</p>
                            </div>
                            <button onClick={() => setShowStepper(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        {/* Progress bar */}
                        <div className="px-5 pt-4 pb-2">
                            <div className="flex items-center gap-0">
                                {WORKFLOW_STEPS.map((step, idx) => {
                                    const done = workflowState?.[step.stateKey] ?? false;
                                    const isLast = idx === WORKFLOW_STEPS.length - 1;
                                    return (
                                        <div key={step.key} className="flex items-center flex-1">
                                            {/* Circle */}
                                            <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-[10px] font-bold border-2 transition-colors ${
                                                done
                                                    ? 'bg-green-500 border-green-500 text-white'
                                                    : idx === activeStepIndex
                                                        ? 'bg-blue-600 border-blue-600 text-white'
                                                        : 'bg-white border-gray-300 text-gray-400'
                                            }`}>
                                                {done ? <CheckCircle className="w-3.5 h-3.5" /> : idx + 1}
                                            </div>
                                            {/* Connector line */}
                                            {!isLast && (
                                                <div className={`flex-1 h-0.5 mx-1 transition-colors ${done ? 'bg-green-400' : 'bg-gray-200'}`} />
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                            <div className="flex justify-between mt-1">
                                {WORKFLOW_STEPS.map((step) => (
                                    <span key={step.key} className="text-[9px] text-gray-500 text-center flex-1">{step.label}</span>
                                ))}
                            </div>
                        </div>

                        {/* Steps list */}
                        <div className="overflow-y-auto flex-1 px-5 py-3 space-y-3">
                            {WORKFLOW_STEPS.map((step, idx) => {
                                const done = workflowState?.[step.stateKey] ?? false;
                                const isActive = idx === activeStepIndex;
                                const isLocked = idx > activeStepIndex;
                                const Icon = step.icon;

                                return (
                                    <div
                                        key={step.key}
                                        className={`rounded-lg border-2 p-3.5 transition-all ${
                                            done
                                                ? 'border-green-200 bg-green-50'
                                                : isActive
                                                    ? 'border-blue-300 bg-blue-50'
                                                    : 'border-gray-200 bg-gray-50 opacity-60'
                                        }`}
                                    >
                                        <div className="flex items-start gap-3">
                                            {/* Step icon */}
                                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                                                done
                                                    ? 'bg-green-500'
                                                    : isActive
                                                        ? 'bg-blue-600'
                                                        : 'bg-gray-300'
                                            }`}>
                                                {done
                                                    ? <CheckCircle className="w-4 h-4 text-white" />
                                                    : <Icon className="w-4 h-4 text-white" />
                                                }
                                            </div>

                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-0.5">
                                                    <p className="text-xs font-semibold text-gray-900">{step.label}</p>
                                                    {done && <span className="text-[10px] font-medium text-green-600 bg-green-100 px-1.5 py-0.5 rounded">Done</span>}
                                                    {isLocked && !done && <span className="text-[10px] text-gray-400">Locked</span>}
                                                </div>
                                                <p className="text-[11px] text-gray-500">{step.description}</p>

                                                {/* Step actions — only shown when active */}
                                                {isActive && !done && (
                                                    <div className="mt-2.5">
                                                        {/* Step 1: Generate Cardinal Invoice */}
                                                        {step.key === 'cardinal_generated' && (
                                                            <button
                                                                onClick={handleGenerateCardinal}
                                                                disabled={isActionLoading}
                                                                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 transition-colors font-medium"
                                                            >
                                                                {isActionLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                                                                Generate Cardinal Invoice
                                                            </button>
                                                        )}

                                                        {/* Step 2: Send Cardinal */}
                                                        {step.key === 'cardinal_sent' && (
                                                            <div className="space-y-2">
                                                                <div
                                                                    onClick={() => fileInputRef.current?.click()}
                                                                    className="flex items-center gap-2 px-3 py-2 border-2 border-dashed border-blue-300 rounded-lg cursor-pointer hover:bg-blue-50 transition-colors"
                                                                >
                                                                    <Upload className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />
                                                                    <span className="text-[11px] text-blue-600 truncate">
                                                                        {cardinalFile ? cardinalFile.name : 'Click to select file'}
                                                                    </span>
                                                                    <input
                                                                        ref={fileInputRef}
                                                                        type="file"
                                                                        className="hidden"
                                                                        onChange={e => setCardinalFile(e.target.files?.[0] || null)}
                                                                    />
                                                                </div>
                                                                <button
                                                                    onClick={handleSendCardinal}
                                                                    disabled={isActionLoading || !cardinalFile}
                                                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-50 transition-colors font-medium"
                                                                >
                                                                    {isActionLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                                                                    Send Cardinal Invoice
                                                                </button>
                                                            </div>
                                                        )}

                                                        {/* Step 3: Create Debit Memos */}
                                                        {step.key === 'debit_memos_created' && (
                                                            <div className="space-y-2.5">
                                                                {batchMemos.length === 0 ? (
                                                                    /* Phase 1: no memos yet — show create button */
                                                                    <div className="space-y-1.5">
                                                                        <p className="text-[11px] text-gray-500">
                                                                            No debit memos created yet. Click below to generate them grouped by pharmacy, destination and labeler.
                                                                        </p>
                                                                        <button
                                                                            onClick={handleCreateDebitMemos}
                                                                            disabled={isActionLoading}
                                                                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg bg-orange-500 text-white hover:bg-orange-600 disabled:opacity-50 transition-colors font-medium"
                                                                        >
                                                                            {isActionLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileText className="w-3.5 h-3.5" />}
                                                                            Create Debit Memos
                                                                        </button>
                                                                    </div>
                                                                ) : (
                                                                    /* Phase 2: memos exist — review and confirm */
                                                                    <div className="space-y-2">
                                                                        <p className="text-[11px] text-gray-600">
                                                                            <span className="font-semibold text-orange-600">{batchMemos.length}</span> debit memo{batchMemos.length !== 1 ? 's' : ''} created for this batch:
                                                                        </p>
                                                                        <div className="max-h-36 overflow-y-auto space-y-1 pr-1">
                                                                            {batchMemos.map(m => (
                                                                                <div key={m.id} className="flex items-center justify-between bg-white border border-gray-200 rounded px-2.5 py-1.5 text-[11px]">
                                                                                    <div className="flex items-center gap-2 min-w-0">
                                                                                        <span className="font-semibold text-gray-900">{m.memoNumber}</span>
                                                                                        <span className="text-gray-500 truncate">{m.pharmacyName}</span>
                                                                                    </div>
                                                                                    <div className="flex items-center gap-2 flex-shrink-0">
                                                                                        <span className="text-gray-500">{m.destination || '—'}</span>
                                                                                        <span className="font-medium text-green-700">{formatCurrency(m.totalAskValue)}</span>
                                                                                    </div>
                                                                                </div>
                                                                            ))}
                                                                        </div>
                                                                        <div className="flex items-center gap-2 flex-wrap">
                                                                            <button
                                                                                onClick={handleConfirmDebitMemos}
                                                                                disabled={isActionLoading}
                                                                                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg bg-orange-500 text-white hover:bg-orange-600 disabled:opacity-50 transition-colors font-medium"
                                                                            >
                                                                                {isActionLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
                                                                                Confirm &amp; Next Step
                                                                            </button>
                                                                            <a
                                                                                href={`/warehouse/debit-memos?batchId=${batchId}`}
                                                                                target="_blank"
                                                                                rel="noopener noreferrer"
                                                                                className="inline-flex items-center gap-1 text-[11px] text-orange-600 hover:underline"
                                                                            >
                                                                                View Details <ExternalLink className="w-3 h-3" />
                                                                            </a>
                                                                        </div>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        )}

                                                        {/* Step 4: Request RA — one row per reverse distributor */}
                                                        {step.key === 'ra_requested' && (
                                                            <div className="space-y-2.5">
                                                                {batchMemos.length > 0 ? (() => {
                                                                    // Group memos by destination (reverse distributor)
                                                                    const groups: Record<string, { destination: string; distributorName: string; memos: DebitMemo[] }> = {};
                                                                    batchMemos.forEach(m => {
                                                                        const key = m.destination || 'unknown';
                                                                        if (!groups[key]) {
                                                                            groups[key] = {
                                                                                destination: key,
                                                                                distributorName: key === 'unknown' ? 'Unknown Distributor' : 
                                                                                    key.charAt(0).toUpperCase() + key.slice(1), // Capitalize first letter
                                                                                memos: [],
                                                                            };
                                                                        }
                                                                        groups[key].memos.push(m);
                                                                    });
                                                                    const distributorGroups = Object.values(groups);
                                                                    const pendingGroupsCount = distributorGroups.filter(g =>
                                                                        !g.memos.every(m => m.raRequestedAt || m.raStatus === 'requested' || m.raStatus === 'received' || m.raStatus === 'shipped')
                                                                    ).length;
                                                                    return (
                                                                        <div className="space-y-1.5">
                                                                            <p className="text-[11px] text-gray-600">
                                                                                Send one RA request per reverse distributor ({distributorGroups.length} distributor{distributorGroups.length !== 1 ? 's' : ''}):
                                                                            </p>
                                                                            <div className="max-h-48 overflow-y-auto space-y-1 pr-1">
                                                                                {distributorGroups.map(group => {
                                                                                    const allSent = group.memos.every(
                                                                                        m => m.raRequestedAt || m.raStatus === 'requested' || m.raStatus === 'received' || m.raStatus === 'shipped'
                                                                                    );
                                                                                    const isSending = raSendingGroup === group.destination;
                                                                                    const sentCount = group.memos.filter(
                                                                                        m => m.raRequestedAt || m.raStatus === 'requested' || m.raStatus === 'received' || m.raStatus === 'shipped'
                                                                                    ).length;
                                                                                    return (
                                                                                        <div key={group.destination} className={`flex items-center justify-between rounded px-2.5 py-1.5 text-[11px] border ${allSent ? 'bg-green-50 border-green-200' : 'bg-white border-gray-200'}`}>
                                                                                            <div className="flex items-center gap-2 min-w-0">
                                                                                                {allSent ? (
                                                                                                    <CheckCircle className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />
                                                                                                ) : isSending ? (
                                                                                                    <Loader2 className="w-3.5 h-3.5 text-green-500 animate-spin flex-shrink-0" />
                                                                                                ) : (
                                                                                                    <Mail className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                                                                                                )}
                                                                                                <span className="font-semibold text-gray-900">{group.distributorName}</span>
                                                                                                <span className="text-gray-400">
                                                                                                    {group.memos.length} memo{group.memos.length !== 1 ? 's' : ''}
                                                                                                    {sentCount > 0 && !allSent && ` · ${sentCount} sent`}
                                                                                                </span>
                                                                                            </div>
                                                                                            <div className="flex-shrink-0">
                                                                                                {allSent ? (
                                                                                                    <span className="text-[10px] font-medium text-green-600 bg-green-100 px-1.5 py-0.5 rounded">RA Sent</span>
                                                                                                ) : (
                                                                                                    <button
                                                                                                        onClick={() => handleSendRAForGroup(group.destination, group.distributorName, group.memos)}
                                                                                                        disabled={isSending || !!raSendingGroup || isSendingAllRA}
                                                                                                        className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] rounded bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 transition-colors font-medium"
                                                                                                    >
                                                                                                        {isSending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
                                                                                                        Send RA
                                                                                                    </button>
                                                                                                )}
                                                                                            </div>
                                                                                        </div>
                                                                                    );
                                                                                })}
                                                                            </div>
                                                                        </div>
                                                                    );
                                                                })() : (
                                                                    <p className="text-[11px] text-gray-500">No debit memos to send RA requests for.</p>
                                                                )}
                                                                {(() => {
                                                                    const anyRaSent = batchMemos.some(
                                                                        m => m.raRequestedAt || m.raStatus === 'requested' || m.raStatus === 'received' || m.raStatus === 'shipped'
                                                                    );
                                                                    const hasPending = batchMemos.some(
                                                                        m => !m.raRequestedAt && m.raStatus !== 'requested' && m.raStatus !== 'received' && m.raStatus !== 'shipped'
                                                                    );
                                                                    return (
                                                                        <div className="flex items-center gap-2 flex-wrap">
                                                                            <button
                                                                                onClick={handleCompleteRAStep}
                                                                                disabled={isActionLoading || !anyRaSent}
                                                                                title={!anyRaSent ? 'Send at least one RA request before completing this step' : undefined}
                                                                                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
                                                                            >
                                                                                {isActionLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
                                                                                Complete Step
                                                                            </button>
                                                                            {hasPending && (
                                                                                <button
                                                                                    onClick={handleSendAllRA}
                                                                                    disabled={isSendingAllRA || !!raSendingGroup}
                                                                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg bg-green-700 text-white hover:bg-green-800 disabled:opacity-50 transition-colors font-medium"
                                                                                >
                                                                                    {isSendingAllRA ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                                                                                    Send All RA
                                                                                </button>
                                                                            )}
                                                                            {!anyRaSent && (
                                                                                <span className="text-[10px] text-amber-600">
                                                                                    Send at least one RA request to enable
                                                                                </span>
                                                                            )}
                                                                            <a
                                                                                href="/warehouse/ra-tracking"
                                                                                target="_blank"
                                                                                rel="noopener noreferrer"
                                                                                className="inline-flex items-center gap-1 text-[11px] text-green-700 hover:underline"
                                                                            >
                                                                                Open RA Tracking <ExternalLink className="w-3 h-3" />
                                                                            </a>
                                                                        </div>
                                                                    );
                                                                })()}
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Modal footer */}
                        <div className="px-5 py-3 border-t border-gray-200 flex items-center justify-between">
                            {allDone ? (
                                <span className="inline-flex items-center gap-1.5 text-xs font-medium text-green-700">
                                    <CheckCircle className="w-4 h-4 text-green-500" /> All steps completed
                                </span>
                            ) : (
                                <span className="text-[11px] text-gray-500">
                                    Step {Math.min(activeStepIndex + 1, WORKFLOW_STEPS.length)} of {WORKFLOW_STEPS.length}
                                </span>
                            )}
                            <button
                                onClick={() => setShowStepper(false)}
                                className="px-3 py-1.5 text-xs rounded border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}

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
                                <p className="text-center py-6 text-xs text-gray-500">No verified returns available for assignment.</p>
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
                                                    <Badge variant={returnTransactionStatusBadgeVariant(ret.status)}>
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
