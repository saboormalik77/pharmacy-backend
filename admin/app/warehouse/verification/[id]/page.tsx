'use client';

import { PermissionGate } from '@/components/auth/PermissionGate';
import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
    ArrowLeft, ChevronLeft, Loader2, CheckCircle, XCircle, AlertTriangle,
    HelpCircle, Plus, ClipboardCheck, BarChart3, ShieldAlert,
    BoxIcon, Package, ScanLine, Camera, Keyboard, Layers, PlusCircle, X,
} from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { ToastContainer, Toast } from '@/components/ui/Toast';
import { formatDate, formatCurrency } from '@/lib/utils';
import { useAppDispatch, useAppSelector } from '@/lib/store/hooks';
import {
    startVerification,
    fetchVerificationSummary,
    verifyItemV2,
    addSurplus,
    completeVerification,
    resolveDiscrepancy,
} from '@/lib/store/warehouseSlice';
import {
    fetchBatches,
    createBatch,
    assignReturnsToBatch,
    fetchUsedBatchMonths,
} from '@/lib/store/batchSlice';
import type {
    VerificationV2Item,
    WarehouseSurplusItem,
    WarehouseDiscrepancy,
    VerificationV2Counts,
    CompleteVerificationSummary,
    BarcodeScanResponse,
    ReturnBatch,
} from '@/lib/types';
import {
    shouldShowWarehouseBoxCountStep,
    isWarehouseVerificationAlreadyCompleted,
} from '@/lib/utils/warehouseVerificationUi';
import { buildAvailableBatchMonthOptions } from '@/lib/utils/batchMonths';
import {
    NON_RETURNABLE_REASONS,
    isValidNonReturnableReason,
} from '@/lib/constants/nonReturnableReasons';

const QrScannerModal = dynamic(() => import('@/components/scanner/QrScannerModal'), { ssr: false });

type ActiveTab = 'items' | 'surplus' | 'discrepancies';

export default function VerificationSessionPage() {
    const dispatch = useAppDispatch();
    const router = useRouter();
    const params = useParams();
    const returnId = params.id as string;
    const { v2Summary, isLoading, isActionLoading } = useAppSelector(s => s.warehouse);
    const verificationAlreadyCompleted = isWarehouseVerificationAlreadyCompleted(v2Summary?.transaction);

    // Local state for used batch months
    const [usedBatchMonths, setUsedBatchMonths] = useState<string[]>([]);

    // Available batch months for creating new batches
    const availableNewBatchMonths = useMemo(() => {
        return buildAvailableBatchMonthOptions(usedBatchMonths);
    }, [usedBatchMonths]);

    const [toasts, setToasts] = useState<Toast[]>([]);
    const [activeTab, setActiveTab] = useState<ActiveTab>('items');

    // Box count step
    const [needsBoxCount, setNeedsBoxCount] = useState(false);
    const [boxCount, setBoxCount] = useState('');
    const [boxResult, setBoxResult] = useState<{ expectedBoxes: number; receivedBoxes: number; boxCountMatch: boolean } | null>(null);

    // Verify item modal
    const [verifyingItem, setVerifyingItem] = useState<VerificationV2Item | null>(null);
    const [verifyStatus, setVerifyStatus] = useState('');
    const [verifyActualQty, setVerifyActualQty] = useState('');
    const [verifyNotes, setVerifyNotes] = useState('');
    // FCR-52: Required when an item is marked non-returnable
    const [verifyNonReturnableReason, setVerifyNonReturnableReason] = useState('');

    // Surplus form
    const [showSurplusForm, setShowSurplusForm] = useState(false);
    const [surplusForm, setSurplusForm] = useState({
        ndc: '', productName: '', manufacturer: '', lotNumber: '',
        expirationDate: '', quantity: '', warehouseLocation: '', condition: 'good', notes: '',
    });

    // Surplus scanner
    const [surplusEntryMode, setSurplusEntryMode] = useState<'manual' | 'scanner'>('manual');
    const [surplusScanMode, setSurplusScanMode] = useState<'camera' | 'input'>('camera');
    const [surplusScanInput, setSurplusScanInput] = useState('');
    const [surplusCameraOpen, setSurplusCameraOpen] = useState(false);
    const [surplusScanError, setSurplusScanError] = useState('');
    const [isSurplusScanning, setIsSurplusScanning] = useState(false);
    const surplusScanInputRef = useRef<HTMLInputElement>(null);

    // Complete
    const [showCompleteConfirm, setShowCompleteConfirm] = useState(false);
    const [completeNotes, setCompleteNotes] = useState('');
    const [completedSummary, setCompletedSummary] = useState<CompleteVerificationSummary | null>(null);

    // Discrepancy resolve
    const [resolvingId, setResolvingId] = useState<string | null>(null);
    const [resolveNotes, setResolveNotes] = useState('');

    // Batch assignment modal
    const [batchModal, setBatchModal] = useState(false);
    const [openBatches, setOpenBatches] = useState<ReturnBatch[]>([]);
    const [selectedBatchId, setSelectedBatchId] = useState('');
    const [createNewBatch, setCreateNewBatch] = useState(false);
    const [newBatchMonth, setNewBatchMonth] = useState('');
    const [newBatchName, setNewBatchName] = useState('');
    const [batchesLoading, setBatchesLoading] = useState(false);
    const [batchAssigning, setBatchAssigning] = useState(false);
    const [usedMonthsLoading, setUsedMonthsLoading] = useState(false);

    const showToast = (msg: string, type: Toast['type'] = 'success') => {
        setToasts(prev => [...prev, { id: Date.now().toString(), message: msg, type }]);
    };
    const removeToast = (id: string) => setToasts(prev => prev.filter(t => t.id !== id));

    const loadSummary = useCallback(async () => {
        const result = await dispatch(fetchVerificationSummary(returnId));
        if (fetchVerificationSummary.rejected.match(result)) {
            const msg = (result.payload as string) || '';
            showToast(msg || 'Failed to load verification data', 'error');
            setNeedsBoxCount(false);
        } else {
            const data = result.payload;
            const txn = data?.transaction;
            setNeedsBoxCount(shouldShowWarehouseBoxCountStep(txn));
        }
    }, [dispatch, returnId]);

    useEffect(() => { loadSummary(); }, [loadSummary]);

    useEffect(() => {
        if (verificationAlreadyCompleted) setShowCompleteConfirm(false);
    }, [verificationAlreadyCompleted]);

    const handleStartVerification = async () => {
        const count = Number(boxCount);
        if (!boxCount || count < 0) { showToast('Enter a valid box count', 'error'); return; }
        const result = await dispatch(startVerification({ transactionId: returnId, boxCount: count }));
        if (startVerification.fulfilled.match(result)) {
            const d = result.payload;
            setBoxResult({ expectedBoxes: d.expectedBoxes, receivedBoxes: d.receivedBoxes, boxCountMatch: d.boxCountMatch });
            if (!d.boxCountMatch) {
                showToast(`Box mismatch: expected ${d.expectedBoxes}, received ${d.receivedBoxes}. Discrepancy recorded.`, 'warning');
            }
            setNeedsBoxCount(false);
            await loadSummary();
        } else {
            showToast((result.payload as string) || 'Failed to start verification', 'error');
        }
    };

    const openVerifyItem = (item: VerificationV2Item) => {
        setVerifyingItem(item);
        setVerifyStatus('');
        setVerifyActualQty(String(item.quantity));
        setVerifyNotes('');
        setVerifyNonReturnableReason('');
    };

    // FCR-52: any status other than `correct` flips the row to non_returnable.
    const STATUSES_FLIP_NON_RETURNABLE = new Set(['damaged', 'missing', 'wrong_item']);

    const handleVerifyItem = async () => {
        if (!verifyStatus || !verifyingItem) return;
        const body: any = { verificationStatus: verifyStatus };
        if (verifyStatus === 'missing') body.actualQuantity = 0;
        else if (verifyActualQty !== '') body.actualQuantity = Number(verifyActualQty);
        if (verifyNotes.trim()) body.conditionNotes = verifyNotes.trim();

        if (STATUSES_FLIP_NON_RETURNABLE.has(verifyStatus)) {
            if (!isValidNonReturnableReason(verifyNonReturnableReason)) {
                showToast('Please select a non-returnable reason for this item.', 'error');
                return;
            }
            body.nonReturnableReason = verifyNonReturnableReason;
        }

        const result = await dispatch(verifyItemV2({ transactionId: returnId, itemId: verifyingItem.id, ...body }));
        if (verifyItemV2.fulfilled.match(result)) {
            showToast('Item verified');
            setVerifyingItem(null);
            await loadSummary();
        } else {
            showToast((result.payload as string) || 'Failed to verify item', 'error');
        }
    };

    const handleAddSurplus = async () => {
        if (!surplusForm.warehouseLocation.trim()) { showToast('Warehouse location is required', 'error'); return; }
        const result = await dispatch(addSurplus({
            transactionId: returnId,
            warehouseLocation: surplusForm.warehouseLocation,
            condition: surplusForm.condition as 'good' | 'damaged' | 'unknown',
            ...(surplusForm.ndc && { ndc: surplusForm.ndc }),
            ...(surplusForm.productName && { productName: surplusForm.productName }),
            ...(surplusForm.manufacturer && { manufacturer: surplusForm.manufacturer }),
            ...(surplusForm.lotNumber && { lotNumber: surplusForm.lotNumber }),
            ...(surplusForm.expirationDate && { expirationDate: surplusForm.expirationDate }),
            ...(surplusForm.quantity && { quantity: Number(surplusForm.quantity) }),
            ...(surplusForm.notes && { notes: surplusForm.notes }),
        }));
        if (addSurplus.fulfilled.match(result)) {
            showToast('Surplus item added');
            setShowSurplusForm(false);
            setSurplusForm({ ndc: '', productName: '', manufacturer: '', lotNumber: '', expirationDate: '', quantity: '', warehouseLocation: '', condition: 'good', notes: '' });
            await loadSummary();
        } else {
            showToast((result.payload as string) || 'Failed to add surplus item', 'error');
        }
    };

    const handleSurplusScan = async (raw: string) => {
        setSurplusCameraOpen(false);
        setSurplusScanInput('');
        setSurplusScanError('');
        setIsSurplusScanning(true);
        try {
            const { apiClient } = await import('@/lib/api/apiClient');
            const res = await apiClient.post<{ status: string; data: BarcodeScanResponse }>(
                '/barcode/scan',
                { scanData: raw },
                true
            );
            const { scan, product } = res.data;
            setSurplusForm(prev => ({
                ...prev,
                ndc: product?.ndc || scan.ndcCandidates[0] || prev.ndc,
                productName: product?.proprietaryName || product?.genericName || prev.productName,
                manufacturer: product?.manufacturer || prev.manufacturer,
                lotNumber: scan.lotNumber || prev.lotNumber,
                expirationDate: scan.expirationDate || prev.expirationDate,
            }));
            setSurplusEntryMode('manual');
        } catch (err: any) {
            setSurplusScanError(err?.message || 'Failed to scan barcode');
        } finally {
            setIsSurplusScanning(false);
        }
    };

    const handleSurplusScanKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            const val = surplusScanInput.trim();
            if (val) void handleSurplusScan(val);
        }
    };

    const handleCompleteVerification = async () => {
        const result = await dispatch(completeVerification({ transactionId: returnId, notes: completeNotes.trim() || undefined }));
        if (completeVerification.fulfilled.match(result)) {
            showToast('Verification completed');
            setShowCompleteConfirm(false);
            setCompletedSummary(result.payload.summary);
        } else {
            showToast((result.payload as string) || 'Failed to complete verification', 'error');
        }
    };

    const handleResolve = async (discrepancyId: string, resolution: 'resolved' | 'dismissed') => {
        const result = await dispatch(resolveDiscrepancy({ discrepancyId, resolution, resolutionNotes: resolveNotes.trim() || undefined }));
        if (resolveDiscrepancy.fulfilled.match(result)) {
            showToast(resolution === 'resolved' ? 'Discrepancy resolved' : 'Discrepancy dismissed');
            setResolvingId(null);
            setResolveNotes('');
            await loadSummary();
        } else {
            showToast((result.payload as string) || 'Failed to resolve discrepancy', 'error');
        }
    };

    const handleOpenBatchModal = async () => {
        // Set modal state first to ensure it shows
        setBatchModal(true);
        setBatchesLoading(true);
        setSelectedBatchId('');
        setCreateNewBatch(false);
        setNewBatchName('');
        
        try {
            // Load open batches and used months
            const [batchResult, monthsResult] = await Promise.all([
                dispatch(fetchBatches({ status: 'open', limit: 100 })),
                dispatch(fetchUsedBatchMonths())
            ]);
            
            if (fetchBatches.fulfilled.match(batchResult)) {
                setOpenBatches(batchResult.payload.data);
            }
            
            let months: string[] = [];
            if (fetchUsedBatchMonths.fulfilled.match(monthsResult)) {
                months = monthsResult.payload;
                setUsedBatchMonths(months);
            }
            
            // Set default month to first available
            const availableMonths = buildAvailableBatchMonthOptions(months);
            if (availableMonths.length > 0) {
                setNewBatchMonth(availableMonths[0].value);
            } else {
                setNewBatchMonth('');
            }
        } catch (error) {
            console.error('Error loading batch data:', error);
            showToast('Failed to load batch data', 'error');
        } finally {
            setBatchesLoading(false);
        }
    };

    const handleAssignToBatch = async () => {
        setBatchAssigning(true);
        try {
            let targetBatchId = selectedBatchId;

            if (createNewBatch) {
                if (!newBatchMonth) {
                    showToast('Please select a batch month', 'error');
                    setBatchAssigning(false);
                    return;
                }

                const createResult = await dispatch(createBatch({
                    batchMonth: `${newBatchMonth}-01`, // Convert YYYY-MM to YYYY-MM-DD format
                    batchName: newBatchName || undefined,
                }));

                if (createBatch.fulfilled.match(createResult)) {
                    targetBatchId = createResult.payload.id;
                    showToast('New batch created successfully');
                } else {
                    showToast(createResult.payload as string || 'Failed to create batch', 'error');
                    setBatchAssigning(false);
                    return;
                }
            }

            if (!targetBatchId) {
                showToast('Please select a batch', 'error');
                setBatchAssigning(false);
                return;
            }

            const assignResult = await dispatch(assignReturnsToBatch({
                batchId: targetBatchId,
                transactionIds: [returnId],
            }));

            if (assignReturnsToBatch.fulfilled.match(assignResult)) {
                showToast('Return assigned to batch successfully!');
                setBatchModal(false);
                router.push('/warehouse/verification');
            } else {
                showToast(assignResult.payload as string || 'Failed to assign to batch', 'error');
            }
        } finally {
            setBatchAssigning(false);
        }
    };

    // Show spinner while loading OR when cached summary belongs to a different return (stale data from previous navigation)
    if (isLoading || (v2Summary && v2Summary.transaction?.id !== returnId)) {
        return (
            <PermissionGate permission="warehouse">
                <div className="flex flex-col items-center justify-center py-24 gap-3">
                    <Loader2 className="h-6 w-6 animate-spin text-primary-500" />
                    <span className="text-xs text-gray-400">Loading verification session…</span>
                </div>
            </PermissionGate>
        );
    }

    // Box count step (before warehouse_start_verification; list page /warehouse/verification has no box UI by design)
    if (needsBoxCount && v2Summary) {
        return (
            <PermissionGate permission="warehouse">
                <ToastContainer toasts={toasts} onClose={removeToast} />
                <div className="max-w-lg mx-auto mt-6 space-y-4">
                    <Link href="/warehouse/verification" className="inline-flex items-center gap-1 text-xs text-primary-600 hover:underline">
                        <ArrowLeft className="w-3.5 h-3.5" /> Back to list
                    </Link>
                    <div className="bg-white rounded-lg shadow p-6 space-y-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-primary-50">
                                <BoxIcon className="w-5 h-5 text-primary-600" />
                            </div>
                            <div>
                                <h2 className="text-base font-bold text-gray-900">Start Verification</h2>
                                <p className="text-[11px] text-gray-500">How many boxes did you physically receive?</p>
                                {v2Summary.transaction?.boxCount != null && Number(v2Summary.transaction.boxCount) > 0 && (
                                    <p className="text-[11px] text-gray-600 mt-1">
                                        Expected on return manifest:{' '}
                                        <span className="font-semibold">{v2Summary.transaction.boxCount}</span> boxes
                                    </p>
                                )}
                            </div>
                        </div>
                        <input
                            type="number"
                            min="0"
                            placeholder="Enter box count..."
                            value={boxCount}
                            onChange={e => setBoxCount(e.target.value)}
                            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-primary-500"
                        />
                        {boxResult && !boxResult.boxCountMatch && (
                            <div className="p-3 rounded-md bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-start gap-2">
                                <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                                <span>Expected {boxResult.expectedBoxes} boxes, you received {boxResult.receivedBoxes} — a discrepancy has been automatically recorded.</span>
                            </div>
                        )}
                        <button
                            disabled={isActionLoading || !boxCount}
                            onClick={handleStartVerification}
                            className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-md disabled:opacity-50 transition"
                        >
                            {isActionLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                            Start Verification
                        </button>
                    </div>
                </div>
            </PermissionGate>
        );
    }

    // Completed summary screen
    if (completedSummary) {
        return (
            <PermissionGate permission="warehouse">
                <ToastContainer toasts={toasts} onClose={removeToast} />
                <div className="max-w-2xl mx-auto mt-6 space-y-4">
                    <div className="bg-white rounded-lg shadow p-6 space-y-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-green-50">
                                <CheckCircle className="w-6 h-6 text-green-600" />
                            </div>
                            <div>
                                <h2 className="text-base font-bold text-gray-900">Verification Complete</h2>
                                <p className="text-[11px] text-gray-500">Summary of verification results</p>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                            <div className="bg-white rounded-lg shadow px-4 py-3 border border-gray-100">
                                <p className="text-xs font-medium text-gray-500 mb-1">Total Items</p>
                                <p className="text-lg font-bold text-gray-900">{completedSummary.totalItems ?? 0}</p>
                            </div>
                            <div className="bg-white rounded-lg shadow px-4 py-3 border border-emerald-100">
                                <p className="text-xs font-medium text-emerald-700 mb-1">Returnable</p>
                                <p className="text-lg font-bold text-emerald-700">{completedSummary.correctItems ?? 0}</p>
                            </div>
                            <div className="bg-white rounded-lg shadow px-4 py-3 border border-rose-100">
                                <p className="text-xs font-medium text-rose-700 mb-1">Non-Returnable</p>
                                <p className="text-lg font-bold text-rose-700">{(completedSummary.damagedItems ?? 0) + (completedSummary.missingItems ?? 0) + (completedSummary.wrongItems ?? 0)}</p>
                            </div>
                        </div>
                        {/* Hidden verification stats - showing only routing-focused summary now
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                            {([
                                { label: 'Total Items', value: completedSummary.totalItems, color: 'text-gray-900' },
                                { label: 'Correct', value: completedSummary.correctItems, color: 'text-green-700' },
                                { label: 'Damaged', value: completedSummary.damagedItems, color: 'text-red-700' },
                                { label: 'Missing', value: completedSummary.missingItems, color: 'text-gray-500' },
                                { label: 'Wrong Items', value: completedSummary.wrongItems, color: 'text-orange-700' },
                                { label: 'Surplus', value: completedSummary.surplusItems, color: 'text-blue-700' },
                            ]).map(s => (
                                <div key={s.label} className="p-3 rounded-md border border-gray-200 bg-gray-50">
                                    <p className="text-[10px] text-gray-500">{s.label}</p>
                                    <p className={`text-xl font-bold ${s.color}`}>{s.value ?? 0}</p>
                                </div>
                            ))}
                        </div>
                        */}
                        {completedSummary.correctItemsValue != null && (
                            <div className="bg-white rounded-lg shadow px-4 py-3 border border-green-100">
                                <p className="text-xs font-medium text-green-700 mb-1">Correct Items Value</p>
                                <p className="text-lg font-bold text-green-900">{formatCurrency(completedSummary.correctItemsValue)}</p>
                            </div>
                        )}
                        {(completedSummary.excludedFromBatch ?? 0) > 0 && (
                            <div className="p-3 rounded-md bg-blue-50 border border-blue-200 text-blue-800 text-xs flex items-start gap-2">
                                <Package className="w-4 h-4 flex-shrink-0 mt-0.5" />
                                <span>{completedSummary.excludedFromBatch} non-correct item(s) have been excluded from batching and will not appear in debit memos.</span>
                            </div>
                        )}
                        {completedSummary.openDiscrepancies > 0 && (
                            <div className="p-3 rounded-md bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-center gap-2">
                                <AlertTriangle className="w-4 h-4" />
                                {completedSummary.openDiscrepancies} open discrepancies remain.
                            </div>
                        )}
                        <button 
                            onClick={handleOpenBatchModal}
                            className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-md mt-2 transition"
                        >
                            <Layers className="w-4 h-4" /> Create Batch
                        </button>
                    </div>
                </div>

                {/* ── Batch Assignment Modal ──────────────────── */}
                {batchModal && (
                    <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-md flex items-center justify-center z-50 p-4" onClick={() => setBatchModal(false)}>
                        <div className="bg-white rounded-lg max-w-md w-full shadow-xl" onClick={e => e.stopPropagation()}>
                            <div className="flex items-center justify-between p-5 border-b bg-gray-50">
                                <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                                    <Layers className="w-5 h-5 text-primary-600" />
                                    Add to Batch
                                </h2>
                                <button onClick={() => setBatchModal(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
                            </div>
                            <div className="p-5 space-y-4">
                                <p className="text-sm text-gray-600">
                                    Verification complete for <span className="font-semibold">{v2Summary?.transaction?.licensePlate || returnId}</span>.
                                    Assign this return to a monthly batch for close-out processing.
                                </p>

                                {batchesLoading ? (
                                    <div className="flex justify-center py-6">
                                        <Loader2 className="w-5 h-5 animate-spin text-primary-600" />
                                    </div>
                                ) : (
                                    <>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => setCreateNewBatch(false)}
                                                className={`flex-1 py-2 text-sm rounded-lg border font-medium transition-colors ${!createNewBatch ? 'bg-primary-600 text-white border-primary-600' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}
                                            >
                                                Existing Batch
                                            </button>
                                            <button
                                                onClick={() => setCreateNewBatch(true)}
                                                className={`flex-1 py-2 text-sm rounded-lg border font-medium transition-colors ${createNewBatch ? 'bg-primary-600 text-white border-primary-600' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}
                                            >
                                                <PlusCircle className="w-4 h-4 inline mr-1" />Create New
                                            </button>
                                        </div>

                                        {!createNewBatch ? (
                                            <div>
                                                <label className="block text-xs font-medium text-gray-700 mb-1">Select Open Batch</label>
                                                {openBatches.length === 0 ? (
                                                    <div className="text-sm text-gray-500 bg-gray-50 rounded-lg p-3 text-center">
                                                        No open batches found. Switch to "Create New" to start one.
                                                    </div>
                                                ) : (
                                                    <select
                                                        value={selectedBatchId}
                                                        onChange={e => setSelectedBatchId(e.target.value)}
                                                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                                                    >
                                                        <option value="">— Choose a batch —</option>
                                                        {openBatches.map(b => (
                                                            <option key={b.id} value={b.id}>
                                                                {b.batchName || b.batchMonth} ({b.totalReturns} returns)
                                                            </option>
                                                        ))}
                                                    </select>
                                                )}
                                            </div>
                                        ) : (
                                            <div className="space-y-3">
                                                <div>
                                                    <label className="block text-xs font-medium text-gray-700 mb-1">Batch Month <span className="text-red-500">*</span></label>
                                                    {usedMonthsLoading ? (
                                                        <div className="flex items-center gap-2 py-2 text-sm text-gray-500">
                                                            <Loader2 className="w-4 h-4 animate-spin text-primary-600" /> Loading months…
                                                        </div>
                                                    ) : availableNewBatchMonths.length === 0 ? (
                                                        <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
                                                            No open month slots in the allowed range. Create a batch from Warehouse → Monthly Batches or free a month by deleting an unused open batch.
                                                        </p>
                                                    ) : (
                                                        <select
                                                            value={newBatchMonth}
                                                            onChange={e => setNewBatchMonth(e.target.value)}
                                                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white"
                                                        >
                                                            {availableNewBatchMonths.map(o => (
                                                                <option key={o.value} value={o.value}>{o.label}</option>
                                                            ))}
                                                        </select>
                                                    )}
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-medium text-gray-700 mb-1">Batch Name <span className="text-gray-400 font-normal">(optional)</span></label>
                                                    <input
                                                        type="text"
                                                        value={newBatchName}
                                                        onChange={e => setNewBatchName(e.target.value)}
                                                        placeholder="e.g. March 2026 Batch"
                                                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-primary-500"
                                                    />
                                                </div>
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>
                            <div className="flex justify-end gap-2 p-5 border-t bg-gray-50">
                                <button onClick={() => setBatchModal(false)} className="px-3 py-1.5 text-xs rounded border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors">Skip</button>
                                <button
                                    onClick={handleAssignToBatch}
                                    disabled={
                                        batchAssigning || batchesLoading
                                        || (!createNewBatch && !selectedBatchId)
                                        || (createNewBatch && (usedMonthsLoading || !newBatchMonth || availableNewBatchMonths.length === 0))
                                    }
                                    className="inline-flex items-center gap-1 px-3 py-1.5 text-xs rounded bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-50 transition-colors"
                                >
                                    {batchAssigning ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Layers className="w-4 h-4 mr-1" />}
                                    {createNewBatch ? 'Create & Assign' : 'Assign to Batch'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </PermissionGate>
        );
    }

    if (!v2Summary) {
        return (
            <PermissionGate permission="warehouse">
                <div className="text-center py-16 text-gray-500">
                    <p className="text-sm">Could not load verification data.</p>
                    <Link href="/warehouse/verification" className="inline-flex items-center gap-1 mt-3 text-xs text-primary-600 hover:underline">
                        <ArrowLeft className="w-3.5 h-3.5" /> Back
                    </Link>
                </div>
            </PermissionGate>
        );
    }

    const { items, counts, surplus, discrepancies, discrepancyCounts } = v2Summary;
    const verified = counts.correct + counts.damaged + counts.missing + counts.wrongItem;
    const progressPct = counts.totalItems > 0 ? Math.round((verified / counts.totalItems) * 100) : 0;

    const statusColor = (s: string | null) => {
        switch (s) {
            case 'correct': return 'bg-green-100 text-green-700 border-green-200';
            case 'damaged': return 'bg-red-100 text-red-700 border-red-200';
            case 'missing': return 'bg-gray-200 text-gray-600 border-gray-300';
            case 'wrong_item': return 'bg-orange-100 text-orange-700 border-orange-200';
            default: return 'bg-white text-gray-400 border-gray-200';
        }
    };

    const discrepancyColor = (type: string) => {
        switch (type) {
            case 'missing': return 'bg-red-100 text-red-700';
            case 'damaged': return 'bg-amber-100 text-amber-700';
            case 'surplus': case 'extra': return 'bg-blue-100 text-blue-700';
            default: return 'bg-gray-100 text-gray-600';
        }
    };

    return (
        <PermissionGate permission="warehouse">
            <ToastContainer toasts={toasts} onClose={removeToast} />
            <div className="space-y-3">
                {/* Header */}
                <div>
                    <Link href="/warehouse" className="inline-flex items-center gap-1 text-[11px] text-gray-400 hover:text-primary-600 mb-1.5 transition-colors">
                        <ChevronLeft className="w-3 h-3" /> Back to Warehouse
                    </Link>
                    <div className="flex items-center gap-3">
                        <Link href="/warehouse/verification" className="p-1.5 rounded-md hover:bg-gray-100 transition">
                            <ArrowLeft className="w-4 h-4 text-gray-500" />
                        </Link>
                        <div>
                            <h1 className="text-base font-bold text-gray-900">Verification Session</h1>
                            <p className="text-[11px] text-gray-500">
                                {v2Summary.transaction?.licensePlate || returnId}
                                {v2Summary.transaction?.pharmacyName && ` — ${v2Summary.transaction.pharmacyName}`}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Progress */}
                <div className="bg-white rounded-lg shadow p-3">
                    <div className="flex items-center gap-3">
                        <BarChart3 className="w-4 h-4 text-primary-600 flex-shrink-0" />
                        <div className="flex-1">
                            <div className="flex justify-between text-[11px] mb-1">
                                <span className="font-medium text-gray-700">{verified} / {counts.totalItems} items verified</span>
                                <span className="font-bold text-primary-700">{progressPct}%</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-1.5">
                                <div className="bg-primary-500 h-1.5 rounded-full transition-all duration-300" style={{ width: `${progressPct}%` }} />
                            </div>
                        </div>
                    </div>
                    {/* <div className="flex gap-3 mt-2 text-[10px] font-medium">
                        <span className="text-green-700">{counts.correct} correct</span>
                        <span className="text-red-700">{counts.damaged} damaged</span>
                        <span className="text-gray-500">{counts.missing} missing</span>
                        <span className="text-orange-700">{counts.wrongItem} wrong</span>
                        <span className="text-blue-700">{counts.surplus} surplus</span>
                    </div> */}
                </div>

                {/* Tabs */}
                <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
                    {([
                        { key: 'items' as ActiveTab, label: 'Items', count: counts.totalItems },
                        { key: 'surplus' as ActiveTab, label: 'Surplus', count: surplus.length },
                        { key: 'discrepancies' as ActiveTab, label: 'Discrepancies', count: discrepancyCounts.open },
                    ]).map(tab => (
                        <button
                            key={tab.key}
                            onClick={() => setActiveTab(tab.key)}
                            className={`px-3 py-1.5 text-[11px] font-medium rounded-md transition-all ${
                                activeTab === tab.key
                                    ? 'bg-white text-primary-700 shadow-sm'
                                    : 'text-gray-500 hover:text-gray-700'
                            }`}
                        >
                            {tab.label} <span className="font-bold">({tab.count})</span>
                        </button>
                    ))}
                </div>

                {/* ITEMS TAB */}
                {activeTab === 'items' && (
                    <div className="bg-white rounded-lg shadow overflow-hidden">
                        {items.length === 0 ? (
                            <div className="text-center py-12 text-gray-400 text-xs">No items found</div>
                        ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="bg-gray-50 border-b border-gray-200">
                                        <th className="text-left text-[10px] font-semibold text-gray-500 uppercase px-3 py-1.5">Product</th>
                                        <th className="text-left text-[10px] font-semibold text-gray-500 uppercase px-3 py-1.5">NDC</th>
                                        <th className="text-left text-[10px] font-semibold text-gray-500 uppercase px-3 py-1.5">Serial #</th>
                                        <th className="text-left text-[10px] font-semibold text-gray-500 uppercase px-3 py-1.5">Lot</th>
                                        <th className="text-left text-[10px] font-semibold text-gray-500 uppercase px-3 py-1.5">Exp</th>
                                        <th className="text-left text-[10px] font-semibold text-gray-500 uppercase px-3 py-1.5">Qty</th>
                                        <th className="text-left text-[10px] font-semibold text-gray-500 uppercase px-3 py-1.5">Status</th>
                                        <th className="text-left text-[10px] font-semibold text-gray-500 uppercase px-3 py-1.5">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {items.map(item => (
                                        <tr key={item.id} className="hover:bg-gray-50">
                                            <td className="px-3 py-2">
                                                <div className="text-xs font-medium text-gray-900">{item.proprietaryName || item.genericName}</div>
                                                {item.manufacturer && <div className="text-[10px] text-gray-400">{item.manufacturer}</div>}
                                            </td>
                                            <td className="px-3 py-2 text-[11px] font-mono text-gray-600">{item.ndc}</td>
                                            <td className="px-3 py-2 text-[11px] font-mono text-gray-600">{item.serialNumber || '—'}</td>
                                            <td className="px-3 py-2 text-[11px] text-gray-600">{item.lotNumber || '—'}</td>
                                            <td className="px-3 py-2 text-[11px] text-gray-600">{item.expirationDate ? formatDate(item.expirationDate) : '—'}</td>
                                            <td className="px-3 py-2 text-xs font-medium">{item.quantity}</td>
                                            <td className="px-3 py-2">
                                                <Badge className={`text-[10px] border ${statusColor(item.verificationStatus)}`}>
                                                    {item.verificationStatus ? item.verificationStatus.replace('_', ' ') : 'unverified'}
                                                </Badge>
                                            </td>
                                            <td className="px-3 py-2">
                                                {!item.verificationStatus ? (
                                                    <button
                                                        type="button"
                                                        onClick={() => openVerifyItem(item)}
                                                        className="px-2 py-1 text-[10px] font-medium rounded-md transition text-white bg-primary-600 hover:bg-primary-700"
                                                    >
                                                        Verify
                                                    </button>
                                                ) : (
                                                    <span className="text-[10px] text-gray-300">—</span>
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

                {/* VERIFY ITEM MODAL */}
                {verifyingItem && (
                    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
                        <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-5 space-y-4">
                            <h3 className="font-bold text-sm text-gray-900">Verify Item</h3>
                            <p className="text-[11px] text-gray-500">{verifyingItem.proprietaryName || verifyingItem.genericName}</p>

                            <div className="grid grid-cols-2 gap-2">
                                {([
                                    { value: 'correct', label: 'Correct', icon: CheckCircle, base: 'border-green-300 bg-green-50 text-green-700', active: 'border-green-500 bg-green-200 text-green-900 ring-2 ring-green-300' },
                                    { value: 'damaged', label: 'Damaged', icon: XCircle, base: 'border-red-300 bg-red-50 text-red-700', active: 'border-red-500 bg-red-200 text-red-900 ring-2 ring-red-300' },
                                    { value: 'missing', label: 'Missing', icon: HelpCircle, base: 'border-gray-300 bg-gray-50 text-gray-700', active: 'border-gray-500 bg-gray-300 text-gray-900 ring-2 ring-gray-400' },
                                    { value: 'wrong_item', label: 'Wrong Item', icon: AlertTriangle, base: 'border-orange-300 bg-orange-50 text-orange-700', active: 'border-orange-500 bg-orange-200 text-orange-900 ring-2 ring-orange-300' },
                                ] as const).map(opt => {
                                    const Icon = opt.icon;
                                    return (
                                        <button
                                            key={opt.value}
                                            type="button"
                                            onClick={() => { setVerifyStatus(opt.value); if (opt.value === 'missing') setVerifyActualQty('0'); }}
                                            className={`flex items-center gap-2 p-2.5 rounded-md border-2 text-xs font-medium transition-all ${verifyStatus === opt.value ? opt.active : opt.base}`}
                                        >
                                            <Icon className="w-4 h-4" /> {opt.label}
                                        </button>
                                    );
                                })}
                            </div>

                            {/* {verifyStatus && verifyStatus !== 'missing' && (
                                <div>
                                    <label className="text-[10px] font-medium text-gray-700">Actual Quantity (if different)</label>
                                    <input type="number" min="0" value={verifyActualQty} onChange={e => setVerifyActualQty(e.target.value)}
                                        className="mt-1 w-full px-3 py-1.5 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-primary-500" />
                                </div>
                            )} */}

                            {(verifyStatus === 'damaged' || verifyStatus === 'wrong_item') && (
                                <div>
                                    <label className="text-[10px] font-medium text-gray-700">Condition Notes</label>
                                    <textarea rows={2} placeholder="Describe the issue..." value={verifyNotes} onChange={e => setVerifyNotes(e.target.value)}
                                        className="mt-1 w-full px-3 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-primary-500 resize-none" />
                                </div>
                            )}

                            {/* FCR-52: Required reason when item is marked non-returnable
                                (damaged / missing / wrong_item). */}
                            {STATUSES_FLIP_NON_RETURNABLE.has(verifyStatus) && (
                                <div className="p-3 rounded-md border border-red-200 bg-red-50">
                                    <label className="block text-[11px] font-semibold text-red-800 mb-1">
                                        Non-Returnable Reason <span className="text-red-600">*</span>
                                    </label>
                                    <p className="text-[10px] text-red-700 mb-2">
                                        This item will be marked as non-returnable. Please choose a reason.
                                    </p>
                                    <select
                                        value={verifyNonReturnableReason}
                                        onChange={e => setVerifyNonReturnableReason(e.target.value)}
                                        className="w-full px-2 py-1.5 text-xs border border-red-300 rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-red-500"
                                    >
                                        <option value="">— Select a reason —</option>
                                        {NON_RETURNABLE_REASONS.map(r => (
                                            <option key={r.id} value={r.value}>{r.label}</option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            <div className="flex gap-2 justify-end">
                                <button onClick={() => setVerifyingItem(null)} className="px-3 py-1.5 text-xs font-medium text-gray-600 border border-gray-200 rounded-md hover:bg-gray-50">Cancel</button>
                                <button
                                    disabled={
                                        !verifyStatus
                                        || isActionLoading
                                        || (STATUSES_FLIP_NON_RETURNABLE.has(verifyStatus) && !isValidNonReturnableReason(verifyNonReturnableReason))
                                    }
                                    onClick={handleVerifyItem}
                                    className="px-3 py-1.5 text-xs font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-md disabled:opacity-50 flex items-center gap-1 transition"
                                >
                                    {isActionLoading && <Loader2 className="w-3 h-3 animate-spin" />} Save
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* SURPLUS TAB */}
                {activeTab === 'surplus' && (
                    <div className="space-y-3">
                        <div className="flex justify-end">
                            <button
                                onClick={() => setShowSurplusForm(!showSurplusForm)}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-[10px] font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-md transition"
                            >
                                <Plus className="w-3 h-3" /> Add Surplus Item
                            </button>
                        </div>

                        {showSurplusForm && (
                            <div className="bg-white rounded-lg shadow p-4 space-y-3">
                                <div className="flex items-center justify-between">
                                    <h3 className="font-bold text-xs text-gray-900">Add Surplus Item</h3>
                                    {/* Entry mode toggle */}
                                    <div className="flex gap-1">
                                        {([
                                            { key: 'manual' as const, icon: Keyboard, label: 'Manual' },
                                            { key: 'scanner' as const, icon: ScanLine, label: 'Scanner' },
                                        ]).map(({ key, icon: Icon, label }) => (
                                            <button
                                                key={key}
                                                type="button"
                                                onClick={() => { setSurplusEntryMode(key); setSurplusScanError(''); }}
                                                className={`flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium transition-colors ${
                                                    surplusEntryMode === key
                                                        ? 'bg-blue-100 text-blue-700 ring-1 ring-blue-300'
                                                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                                }`}
                                            >
                                                <Icon className="w-3 h-3" /> {label}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Scanner panel */}
                                {surplusEntryMode === 'scanner' && (
                                    <div className="space-y-2 p-3 rounded-md bg-gray-50 border border-gray-200">
                                        <div className="flex items-center justify-between flex-wrap gap-2">
                                            <span className="text-[11px] font-medium text-gray-700">Scan product barcode to pre-fill fields</span>
                                            <div className="flex gap-1">
                                                {([
                                                    { key: 'camera' as const, icon: Camera, label: 'Camera' },
                                                    { key: 'input' as const, icon: ScanLine, label: 'USB / Keyboard' },
                                                ]).map(({ key, icon: Icon, label }) => (
                                                    <button
                                                        key={key}
                                                        type="button"
                                                        onClick={() => setSurplusScanMode(key)}
                                                        className={`flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium transition-colors ${
                                                            surplusScanMode === key
                                                                ? 'bg-primary-100 text-primary-700 ring-1 ring-primary-300'
                                                                : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
                                                        }`}
                                                    >
                                                        <Icon className="w-3 h-3" /> {label}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        {surplusScanMode === 'camera' && (
                                            <button
                                                type="button"
                                                onClick={() => setSurplusCameraOpen(true)}
                                                disabled={isSurplusScanning}
                                                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 border border-dashed border-primary-300 bg-primary-50 hover:bg-primary-100 rounded-lg transition-colors disabled:opacity-50"
                                            >
                                                {isSurplusScanning ? (
                                                    <>
                                                        <Loader2 className="w-4 h-4 animate-spin text-primary-600" />
                                                        <span className="text-xs font-medium text-primary-700">Looking up product…</span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <Camera className="w-4 h-4 text-primary-600" />
                                                        <span className="text-xs font-semibold text-primary-800">Open camera scanner</span>
                                                    </>
                                                )}
                                            </button>
                                        )}

                                        {surplusScanMode === 'input' && (
                                            <div className="flex gap-2">
                                                <div className="relative flex-1">
                                                    <ScanLine className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                                                    <input
                                                        ref={surplusScanInputRef}
                                                        type="text"
                                                        value={surplusScanInput}
                                                        onChange={e => setSurplusScanInput(e.target.value)}
                                                        onKeyDown={handleSurplusScanKeyDown}
                                                        placeholder="Scan barcode or type and press Enter…"
                                                        className="w-full pl-8 pr-3 py-1.5 text-xs border-2 border-primary-300 rounded-md focus:outline-none focus:ring-1 focus:ring-primary-500 bg-primary-50 font-mono"
                                                        disabled={isSurplusScanning}
                                                        autoFocus
                                                    />
                                                </div>
                                                <button
                                                    type="button"
                                                    disabled={isSurplusScanning || !surplusScanInput.trim()}
                                                    onClick={() => void handleSurplusScan(surplusScanInput.trim())}
                                                    className="px-3 py-1.5 text-xs font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-md disabled:opacity-50 flex items-center gap-1 transition"
                                                >
                                                    {isSurplusScanning ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Scan'}
                                                </button>
                                            </div>
                                        )}

                                        {surplusScanError && (
                                            <p className="text-[11px] text-red-600 flex items-center gap-1">
                                                <XCircle className="w-3 h-3 flex-shrink-0" /> {surplusScanError}
                                            </p>
                                        )}
                                        <p className="text-[10px] text-gray-400">After scan, fields will be pre-filled. Complete the remaining fields and click Add Surplus.</p>
                                    </div>
                                )}

                                {surplusCameraOpen && (
                                    <QrScannerModal onScan={raw => void handleSurplusScan(raw)} onClose={() => setSurplusCameraOpen(false)} />
                                )}

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    {([
                                        { key: 'ndc', label: 'NDC', type: 'text', placeholder: 'e.g. 12345678901' },
                                        { key: 'productName', label: 'Product Name', type: 'text', placeholder: '' },
                                        { key: 'manufacturer', label: 'Manufacturer', type: 'text', placeholder: '' },
                                        { key: 'lotNumber', label: 'Lot Number', type: 'text', placeholder: '' },
                                        { key: 'expirationDate', label: 'Expiration Date', type: 'date', placeholder: '' },
                                        { key: 'quantity', label: 'Quantity', type: 'number', placeholder: '' },
                                        { key: 'warehouseLocation', label: 'Warehouse Location *', type: 'text', placeholder: 'e.g. Shelf B3, Row 2' },
                                    ] as const).map(f => (
                                        <div key={f.key}>
                                            <label className="text-[10px] font-medium text-gray-700">{f.label}</label>
                                            <input
                                                type={f.type}
                                                placeholder={f.placeholder || undefined}
                                                value={surplusForm[f.key as keyof typeof surplusForm]}
                                                onChange={e => setSurplusForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                                                className="mt-1 w-full px-3 py-1.5 text-xs border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-primary-500"
                                            />
                                        </div>
                                    ))}
                                    <div>
                                        <label className="text-[10px] font-medium text-gray-700">Condition</label>
                                        <select
                                            value={surplusForm.condition}
                                            onChange={e => setSurplusForm(prev => ({ ...prev, condition: e.target.value }))}
                                            className="mt-1 w-full px-3 py-1.5 text-xs border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-primary-500"
                                        >
                                            <option value="good">Good</option>
                                            <option value="damaged">Damaged</option>
                                            <option value="unknown">Unknown</option>
                                        </select>
                                    </div>
                                </div>
                                <div>
                                    <label className="text-[10px] font-medium text-gray-700">Notes</label>
                                    <textarea rows={2} value={surplusForm.notes} onChange={e => setSurplusForm(prev => ({ ...prev, notes: e.target.value }))} placeholder="Any additional notes..."
                                        className="mt-1 w-full px-3 py-2 text-xs border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-primary-500 resize-none" />
                                </div>
                                <div className="flex gap-2 justify-end">
                                    <button onClick={() => setShowSurplusForm(false)} className="px-3 py-1.5 text-xs font-medium text-gray-600 border border-gray-200 rounded-md hover:bg-gray-50">Cancel</button>
                                    <button
                                        disabled={isActionLoading}
                                        onClick={handleAddSurplus}
                                        className="px-3 py-1.5 text-xs font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-md disabled:opacity-50 flex items-center gap-1 transition"
                                    >
                                        {isActionLoading && <Loader2 className="w-3 h-3 animate-spin" />} Add Surplus
                                    </button>
                                </div>
                            </div>
                        )}

                        <div className="bg-white rounded-lg shadow overflow-hidden">
                            {surplus.length === 0 ? (
                                <div className="text-center py-12 text-gray-400 text-xs">No surplus items recorded yet</div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full">
                                        <thead>
                                            <tr className="bg-gray-50 border-b border-gray-200">
                                                <th className="text-left text-[10px] font-semibold text-gray-500 uppercase px-3 py-1.5">Product</th>
                                                <th className="text-left text-[10px] font-semibold text-gray-500 uppercase px-3 py-1.5">NDC</th>
                                                <th className="text-left text-[10px] font-semibold text-gray-500 uppercase px-3 py-1.5">Lot</th>
                                                <th className="text-left text-[10px] font-semibold text-gray-500 uppercase px-3 py-1.5">Qty</th>
                                                <th className="text-left text-[10px] font-semibold text-gray-500 uppercase px-3 py-1.5">Location</th>
                                                <th className="text-left text-[10px] font-semibold text-gray-500 uppercase px-3 py-1.5">Condition</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {surplus.map(s => (
                                                <tr key={s.id} className="hover:bg-gray-50">
                                                    <td className="px-3 py-2 text-xs font-medium text-gray-900">{s.productName || '—'}</td>
                                                    <td className="px-3 py-2 text-[11px] font-mono text-gray-600">{s.ndc || '—'}</td>
                                                    <td className="px-3 py-2 text-[11px] text-gray-600">{s.lotNumber || '—'}</td>
                                                    <td className="px-3 py-2 text-xs font-medium">{s.quantity}</td>
                                                    <td className="px-3 py-2 text-[11px] text-gray-600">{s.warehouseLocation}</td>
                                                    <td className="px-3 py-2">
                                                        <Badge className={`text-[10px] ${s.condition === 'good' ? 'bg-green-100 text-green-700' : s.condition === 'damaged' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'}`}>
                                                            {s.condition}
                                                        </Badge>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* DISCREPANCIES TAB */}
                {activeTab === 'discrepancies' && (
                    <div className="bg-white rounded-lg shadow overflow-hidden">
                        {discrepancies.filter(d => d.status === 'open').length === 0 ? (
                            <div className="text-center py-12 text-gray-400 text-xs">No open discrepancies</div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead>
                                        <tr className="bg-gray-50 border-b border-gray-200">
                                            <th className="text-left text-[10px] font-semibold text-gray-500 uppercase px-3 py-1.5">Type</th>
                                            <th className="text-left text-[10px] font-semibold text-gray-500 uppercase px-3 py-1.5">Product</th>
                                            <th className="text-left text-[10px] font-semibold text-gray-500 uppercase px-3 py-1.5">Expected</th>
                                            <th className="text-left text-[10px] font-semibold text-gray-500 uppercase px-3 py-1.5">Actual</th>
                                            <th className="text-left text-[10px] font-semibold text-gray-500 uppercase px-3 py-1.5">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {discrepancies.filter(d => d.status === 'open').map(d => (
                                            <tr key={d.id} className="hover:bg-gray-50">
                                                <td className="px-3 py-2"><Badge className={`text-[10px] ${discrepancyColor(d.type)}`}>{d.type}</Badge></td>
                                                <td className="px-3 py-2 text-xs text-gray-900">{d.productName || d.ndc || '—'}</td>
                                                <td className="px-3 py-2 text-xs font-medium">{d.expectedQuantity ?? '—'}</td>
                                                <td className="px-3 py-2 text-xs font-medium">{d.actualQuantity ?? '—'}</td>
                                                <td className="px-3 py-2">
                                                    {resolvingId === d.id ? (
                                                        <div className="space-y-1.5">
                                                            <textarea
                                                                rows={2}
                                                                placeholder="Resolution notes..."
                                                                value={resolveNotes}
                                                                onChange={e => setResolveNotes(e.target.value)}
                                                                className="w-full px-2 py-1 text-[10px] border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-primary-500 resize-none"
                                                            />
                                                            <div className="flex gap-1">
                                                                <button disabled={isActionLoading} onClick={() => handleResolve(d.id, 'resolved')}
                                                                    className="px-2 py-0.5 text-[9px] font-medium text-white bg-green-600 hover:bg-green-700 rounded disabled:opacity-50">Resolve</button>
                                                                <button disabled={isActionLoading} onClick={() => handleResolve(d.id, 'dismissed')}
                                                                    className="px-2 py-0.5 text-[9px] font-medium text-white bg-gray-500 hover:bg-gray-600 rounded disabled:opacity-50">Dismiss</button>
                                                                <button onClick={() => { setResolvingId(null); setResolveNotes(''); }}
                                                                    className="px-2 py-0.5 text-[9px] font-medium text-gray-500 border border-gray-200 rounded hover:bg-gray-50">Cancel</button>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <button onClick={() => setResolvingId(d.id)}
                                                            className="inline-flex items-center gap-1 px-2 py-1 text-[10px] font-medium text-amber-700 border border-amber-200 rounded-md hover:bg-amber-50 transition">
                                                            <ShieldAlert className="w-3 h-3" /> Resolve
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

                {/* COMPLETE VERIFICATION — hidden when return already finalized */}
                {verificationAlreadyCompleted ? (
                    <div className="bg-white rounded-lg shadow p-4 border border-green-200">
                        <p className="text-[11px] text-green-800 flex items-center gap-2">
                            <CheckCircle className="w-4 h-4 flex-shrink-0" />
                            Verification for this return is already completed.
                        </p>
                    </div>
                ) : (
                    <div className="bg-white rounded-lg shadow p-4">
                        {showCompleteConfirm ? (
                            <div className="space-y-3">
                                <h3 className="font-bold text-xs text-gray-900">Confirm Complete Verification</h3>
                                <div className="grid grid-cols-3 gap-2 text-[11px]">
                                    <div className="p-2 bg-green-50 rounded border border-green-200"><span className="text-green-700">Correct:</span> <strong>{counts.correct}</strong></div>
                                    <div className="p-2 bg-red-50 rounded border border-red-200"><span className="text-red-700">Damaged:</span> <strong>{counts.damaged}</strong></div>
                                    <div className="p-2 bg-gray-50 rounded border border-gray-200"><span className="text-gray-600">Missing:</span> <strong>{counts.missing}</strong></div>
                                </div>
                                <div>
                                    <label className="text-[10px] font-medium text-gray-700">Completion Notes (optional)</label>
                                    <textarea rows={2} value={completeNotes} onChange={e => setCompleteNotes(e.target.value)} placeholder="Summary notes..."
                                        className="mt-1 w-full px-3 py-2 text-xs border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-primary-500 resize-none" />
                                </div>
                                <div className="flex gap-2 justify-end">
                                    <button onClick={() => setShowCompleteConfirm(false)} className="px-3 py-1.5 text-xs font-medium text-gray-600 border border-gray-200 rounded-md hover:bg-gray-50">Cancel</button>
                                    <button
                                        disabled={isActionLoading}
                                        onClick={handleCompleteVerification}
                                        className="px-3 py-1.5 text-xs font-medium text-white bg-green-600 hover:bg-green-700 rounded-md disabled:opacity-50 flex items-center gap-1 transition"
                                    >
                                        {isActionLoading && <Loader2 className="w-3 h-3 animate-spin" />} Complete Verification
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="flex items-center justify-between">
                                <span className="text-[11px] text-gray-500">
                                    {counts.unverified > 0 ? `${counts.unverified} items still unverified` : 'All items verified — ready to complete'}
                                </span>
                                <button
                                    disabled={counts.unverified > 0}
                                    onClick={() => setShowCompleteConfirm(true)}
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-green-600 hover:bg-green-700 rounded-md disabled:opacity-40 transition"
                                >
                                    <ClipboardCheck className="w-3.5 h-3.5" /> Complete Verification
                                </button>
                            </div>
                        )}
                    </div>
                )}

                {/* ── Batch Assignment Modal ──────────────────── */}
                {batchModal && (
                    <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-md flex items-center justify-center z-50 p-4" onClick={() => setBatchModal(false)}>
                        <div className="bg-white rounded-lg max-w-md w-full shadow-xl" onClick={e => e.stopPropagation()}>
                            <div className="flex items-center justify-between p-5 border-b bg-gray-50">
                                <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                                    <Layers className="w-5 h-5 text-primary-600" />
                                    Add to Batch
                                </h2>
                                <button onClick={() => setBatchModal(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
                            </div>
                            <div className="p-5 space-y-4">
                                <p className="text-sm text-gray-600">
                                    Verification complete for <span className="font-semibold">{v2Summary?.transaction?.licensePlate || returnId}</span>.
                                    Assign this return to a monthly batch for close-out processing.
                                </p>

                                {batchesLoading ? (
                                    <div className="flex justify-center py-6">
                                        <Loader2 className="w-5 h-5 animate-spin text-primary-600" />
                                    </div>
                                ) : (
                                    <>
                                        {/* Toggle: existing vs new */}
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => setCreateNewBatch(false)}
                                                className={`flex-1 py-2 text-sm rounded-lg border font-medium transition-colors ${!createNewBatch ? 'bg-primary-600 text-white border-primary-600' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}
                                            >
                                                Existing Batch
                                            </button>
                                            <button
                                                onClick={() => setCreateNewBatch(true)}
                                                className={`flex-1 py-2 text-sm rounded-lg border font-medium transition-colors ${createNewBatch ? 'bg-primary-600 text-white border-primary-600' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}
                                            >
                                                <PlusCircle className="w-4 h-4 inline mr-1" />Create New
                                            </button>
                                        </div>

                                        {!createNewBatch ? (
                                            <div>
                                                <label className="block text-xs font-medium text-gray-700 mb-1">Select Open Batch</label>
                                                {openBatches.length === 0 ? (
                                                    <div className="text-sm text-gray-500 bg-gray-50 rounded-lg p-3 text-center">
                                                        No open batches found. Switch to "Create New" to start one.
                                                    </div>
                                                ) : (
                                                    <select
                                                        value={selectedBatchId}
                                                        onChange={e => setSelectedBatchId(e.target.value)}
                                                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                                                    >
                                                        <option value="">— Choose a batch —</option>
                                                        {openBatches.map(b => (
                                                            <option key={b.id} value={b.id}>
                                                                {b.batchName || b.batchMonth} ({b.totalReturns} returns)
                                                            </option>
                                                        ))}
                                                    </select>
                                                )}
                                            </div>
                                        ) : (
                                            <div className="space-y-3">
                                                <div>
                                                    <label className="block text-xs font-medium text-gray-700 mb-1">Batch Month <span className="text-red-500">*</span></label>
                                                    {usedMonthsLoading ? (
                                                        <div className="flex items-center gap-2 py-2 text-sm text-gray-500">
                                                            <Loader2 className="w-4 h-4 animate-spin text-primary-600" /> Loading months…
                                                        </div>
                                                    ) : availableNewBatchMonths.length === 0 ? (
                                                        <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
                                                            No open month slots in the allowed range. Create a batch from Warehouse → Monthly Batches or free a month by deleting an unused open batch.
                                                        </p>
                                                    ) : (
                                                        <select
                                                            value={newBatchMonth}
                                                            onChange={e => setNewBatchMonth(e.target.value)}
                                                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white"
                                                        >
                                                            {availableNewBatchMonths.map(o => (
                                                                <option key={o.value} value={o.value}>{o.label}</option>
                                                            ))}
                                                        </select>
                                                    )}
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-medium text-gray-700 mb-1">Batch Name <span className="text-gray-400 font-normal">(optional)</span></label>
                                                    <input
                                                        type="text"
                                                        value={newBatchName}
                                                        onChange={e => setNewBatchName(e.target.value)}
                                                        placeholder="e.g. March 2026 Batch"
                                                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-primary-500"
                                                    />
                                                </div>
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>
                            <div className="flex justify-end gap-2 p-5 border-t bg-gray-50">
                                <button 
                                    onClick={() => setBatchModal(false)}
                                    className="px-3 py-1.5 text-xs rounded border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
                                >
                                    Skip
                                </button>
                                <button
                                    onClick={handleAssignToBatch}
                                    disabled={
                                        batchAssigning || batchesLoading
                                        || (!createNewBatch && !selectedBatchId)
                                        || (createNewBatch && (usedMonthsLoading || !newBatchMonth || availableNewBatchMonths.length === 0))
                                    }
                                    className="inline-flex items-center gap-1 px-3 py-1.5 text-xs rounded bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-50 transition-colors"
                                >
                                    {batchAssigning ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Layers className="w-4 h-4 mr-1" />}
                                    {createNewBatch ? 'Create & Assign' : 'Assign to Batch'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </PermissionGate>
    );
}
