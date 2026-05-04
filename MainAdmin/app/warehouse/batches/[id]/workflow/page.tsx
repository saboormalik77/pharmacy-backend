'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
    ArrowLeft, Loader2, AlertCircle, Layers,
    CheckCircle, Send, ExternalLink, Mail,
    Download, Upload, FileText, GitPullRequest,
} from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { ToastContainer, Toast } from '@/components/ui/Toast';
import { formatDate, formatDateTime } from '@/lib/utils';
import { cookieUtils } from '@/lib/utils/cookies';
import { useAppDispatch, useAppSelector } from '@/lib/store/hooks';
import {
    fetchBatchDetail, clearCurrentBatch, clearError,
    fetchBatchWorkflow, completeBatchWorkflowStep, generateBatchMemos,
} from '@/lib/store/batchSlice';
import { sendRARequest } from '@/lib/store/raTrackingSlice';
import { DebitMemo } from '@/lib/types';

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

export default function BatchWorkflowPage() {
    const params = useParams();
    const router = useRouter();
    const dispatch = useAppDispatch();
    const batchId = params.id as string;

    const {
        currentBatch: batch,
        batchMemos,
        isLoading,
        isActionLoading,
        workflowState,
        error,
    } = useAppSelector(s => s.batch);

    const raActionLoading = useAppSelector(s => s.raTracking.isActionLoading);

    const [toasts, setToasts] = useState<Toast[]>([]);
    const [cardinalFile, setCardinalFile] = useState<File | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [raSendingGroup, setRaSendingGroup] = useState<string | null>(null);
    const [isSendingAllRA, setIsSendingAllRA] = useState(false);

    const addToast = useCallback((msg: string, type: Toast['type']) => {
        setToasts(prev => [...prev, { id: Date.now().toString(), message: msg, type }]);
    }, []);

    useEffect(() => {
        dispatch(fetchBatchDetail(batchId));
        dispatch(fetchBatchWorkflow(batchId));
        return () => { dispatch(clearCurrentBatch()); };
    }, [dispatch, batchId]);

    useEffect(() => {
        if (error) { addToast(error, 'error'); dispatch(clearError()); }
    }, [error, addToast, dispatch]);

    const handleCompleteStep = async (stepKey: string) => {
        const result = await dispatch(completeBatchWorkflowStep({ batchId, step: stepKey }));
        if (completeBatchWorkflowStep.rejected.match(result)) {
            addToast(result.payload as string || 'Failed to save step', 'error');
        }
    };

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
                    Authorization: `Bearer ${token}`,
                    'X-Tenant-Domain': typeof window !== 'undefined' ? window.location.hostname : '',
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
                    Authorization: `Bearer ${token}`,
                    'X-Tenant-Domain': typeof window !== 'undefined' ? window.location.hostname : '',
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
        } catch (error: unknown) {
            addToast(error instanceof Error ? error.message : 'Failed to generate Cardinal Invoice', 'error');
        }
    };

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

    const handleCreateDebitMemos = async () => {
        const result = await dispatch(generateBatchMemos(batchId));
        if (generateBatchMemos.fulfilled.match(result)) {
            addToast(`${result.payload.memosGenerated} debit memo(s) created.`, 'success');
            dispatch(fetchBatchDetail(batchId));
        } else {
            addToast((result.payload as string) || 'Failed to create debit memos', 'error');
        }
    };

    const handleConfirmDebitMemos = async () => {
        await handleCompleteStep('debit_memos_created');
        addToast('Debit memos confirmed. Proceed to Request RA from reverse distributors.', 'success');
    };

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

    const handleCompleteRAStep = async () => {
        await handleCompleteStep('ra_requested');
        addToast('RA request step completed.', 'success');
    };

    const getActiveStepIndex = () => {
        if (!workflowState) return 0;
        for (let i = 0; i < WORKFLOW_STEPS.length; i++) {
            if (!workflowState[WORKFLOW_STEPS[i].stateKey]) return i;
        }
        return WORKFLOW_STEPS.length;
    };

    const activeStepIndex = getActiveStepIndex();
    const allDone = workflowState !== null && activeStepIndex === WORKFLOW_STEPS.length;

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
                <button onClick={() => router.back()} className="mt-4 inline-flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900">
                    <ArrowLeft className="w-4 h-4" /> Go Back
                </button>
            </div>
        );
    }

    const sb = getStatusBadge(batch.status);

    return (
        <div className="space-y-3">
            <ToastContainer toasts={toasts} onClose={id => setToasts(t => t.filter(x => x.id !== id))} />

            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <button onClick={() => router.back()} className="text-gray-400 hover:text-gray-600 p-0.5">
                        <ArrowLeft className="w-4 h-4" />
                    </button>
                    <div>
                        <div className="flex items-center gap-1.5">
                            <Layers className="w-4 h-4 text-blue-600" />
                            <h1 className="text-base font-bold text-gray-900">Post-Closeout Workflow</h1>
                        </div>
                        <p className="text-sm text-gray-500 mt-0.5">{batch.batchName} · {formatBatchMonth(batch.batchMonth)}</p>
                    </div>
                </div>
                <Badge variant={sb.variant}><span className="text-[10px]">{sb.label}</span></Badge>
            </div>

            {/* Progress bar */}
            <div className="bg-white rounded-lg shadow px-5 pt-4 pb-3">
                <div className="flex items-center gap-0">
                    {WORKFLOW_STEPS.map((step, idx) => {
                        const done = workflowState?.[step.stateKey] ?? false;
                        const isLast = idx === WORKFLOW_STEPS.length - 1;
                        return (
                            <div key={step.key} className="flex items-center flex-1">
                                <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-[10px] font-bold border-2 transition-colors ${
                                    done
                                        ? 'bg-green-500 border-green-500 text-white'
                                        : idx === activeStepIndex
                                            ? 'bg-blue-600 border-blue-600 text-white'
                                            : 'bg-white border-gray-300 text-gray-400'
                                }`}>
                                    {done ? <CheckCircle className="w-3.5 h-3.5" /> : idx + 1}
                                </div>
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
            <div className="space-y-3">
                {WORKFLOW_STEPS.map((step, idx) => {
                    const done = workflowState?.[step.stateKey] ?? false;
                    const isActive = idx === activeStepIndex;
                    const isLocked = idx > activeStepIndex;
                    const Icon = step.icon;

                    return (
                        <div
                            key={step.key}
                            className={`bg-white rounded-lg shadow border-2 p-3.5 transition-all ${
                                done
                                    ? 'border-green-200 bg-green-50'
                                    : isActive
                                        ? 'border-blue-300 bg-blue-50'
                                        : 'border-gray-200 bg-gray-50 opacity-60'
                            }`}
                        >
                            <div className="flex items-start gap-3">
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
                                    <p className="text-sm text-gray-500">{step.description}</p>

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
                                                        <span className="text-sm text-blue-600 truncate">
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
                                                        <div className="space-y-1.5">
                                                            <p className="text-sm text-gray-500">
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
                                                        <div className="space-y-2">
                                                            <p className="text-sm text-gray-600">
                                                                <span className="font-semibold text-orange-600">{batchMemos.length}</span> debit memo{batchMemos.length !== 1 ? 's' : ''} created for this batch:
                                                            </p>
                                                            <div className="max-h-36 overflow-y-auto space-y-1 pr-1">
                                                                {batchMemos.map(m => (
                                                                    <div key={m.id} className="flex items-center justify-between bg-white border border-gray-200 rounded px-4 py-3 text-sm">
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
                                                                    className="inline-flex items-center gap-1 text-sm text-orange-600 hover:underline"
                                                                >
                                                                    View Details <ExternalLink className="w-3 h-3" />
                                                                </a>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            {/* Step 4: Request RA */}
                                            {step.key === 'ra_requested' && (
                                                <div className="space-y-2.5">
                                                    {batchMemos.length > 0 ? (() => {
                                                        const groups: Record<string, { destination: string; distributorName: string; memos: DebitMemo[] }> = {};
                                                        batchMemos.forEach(m => {
                                                            const key = m.destination || 'unknown';
                                                            if (!groups[key]) {
                                                                groups[key] = {
                                                                    destination: key,
                                                                    distributorName: key === 'unknown' ? 'Unknown Distributor' : 
                                                                        key.charAt(0).toUpperCase() + key.slice(1),
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
                                                                <p className="text-sm text-gray-600">
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
                                                                            <div key={group.destination} className={`flex items-center justify-between rounded px-4 py-3 text-sm border ${allSent ? 'bg-green-50 border-green-200' : 'bg-white border-gray-200'}`}>
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
                                                        <p className="text-sm text-gray-500">No debit memos to send RA requests for.</p>
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
                                                                    className="inline-flex items-center gap-1 text-sm text-green-700 hover:underline"
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

            {/* Footer */}
            <div className="bg-white rounded-lg shadow px-5 py-3 flex items-center justify-between">
                {allDone ? (
                    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-green-700">
                        <CheckCircle className="w-4 h-4 text-green-500" /> All steps completed
                    </span>
                ) : (
                    <span className="text-sm text-gray-500">
                        Step {Math.min(activeStepIndex + 1, WORKFLOW_STEPS.length)} of {WORKFLOW_STEPS.length}
                    </span>
                )}
                <button
                    onClick={() => router.back()}
                    className="px-3 py-1.5 text-xs rounded border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
                >
                    Back to Batch
                </button>
            </div>
        </div>
    );
}
