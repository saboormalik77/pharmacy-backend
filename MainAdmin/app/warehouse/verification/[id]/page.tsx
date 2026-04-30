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
    Archive, Ban,
} from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { ToastContainer, Toast } from '@/components/ui/Toast';
import { formatDate, formatCurrency } from '@/lib/utils';
import { formatNonReturnableReason } from '@/lib/constants/nonReturnableReasons';
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
import {
    scanBarcode,
    // Removed unused imports: updateTransactionItem, moveItemToWineCellar, resolveTransactionItem
} from '@/lib/store/returnTransactionsSlice';
// import { checkReturnability } from '@/lib/store/policiesSlice'; // Moved to dedicated verification page
import type {
    VerificationV2Item,
    WarehouseSurplusItem,
    WarehouseDiscrepancy,
    CompleteVerificationSummary,
    BarcodeScanResponse,
    ReturnBatch,
    ReturnabilityCheckResult,
    WineCellarItem,
} from '@/lib/types';
import {
    shouldShowWarehouseBoxCountStep,
    isWarehouseVerificationAlreadyCompleted,
} from '@/lib/utils/warehouseVerificationUi';
import { buildAvailableBatchMonthOptions } from '@/lib/utils/batchMonths';

const QrScannerModal = dynamic(() => import('@/components/scanner/QrScannerModal'), { ssr: false });

type ActiveTab = 'items' | 'surplus' | 'discrepancies';

const normalizeNdc = (value?: string | null): string => (value || '').replace(/\D/g, '');

const normalizeDateKey = (value?: string | null): string => {
    if (!value) return '';
    return value.slice(0, 10);
};

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
    
    // Reverse distributors
    const [reverseDistributors, setReverseDistributors] = useState<Array<{id: string; name: string; email: string}>>([]);
    const [loadingDistributors, setLoadingDistributors] = useState(false);

    // Box count step
    const [needsBoxCount, setNeedsBoxCount] = useState(false);
    const [boxCount, setBoxCount] = useState('');
    const [boxResult, setBoxResult] = useState<{ expectedBoxes: number; receivedBoxes: number; boxCountMatch: boolean } | null>(null);

    // Verify item modal - state moved to dedicated page
    // const [verifyingItem, setVerifyingItem] = useState<VerificationV2Item | null>(null);
    // const [verifyStatus, setVerifyStatus] = useState('');
    // const [verifyActualQty, setVerifyActualQty] = useState('');
    // const [verifyNotes, setVerifyNotes] = useState('');
    // Policy and routing state moved to dedicated verification page
    // const [policyResult, setPolicyResult] = useState<ReturnabilityCheckResult | null>(null);
    // const [isPolicyChecking, setIsPolicyChecking] = useState(false);
    // const [disposition, setDisposition] = useState<'returnable' | 'wine_cellar' | 'destruction'>('returnable');
    // const [returnStatus, setReturnStatus] = useState<'returnable' | 'non_returnable'>('returnable');
    // const [nonReturnableRoute, setNonReturnableRoute] = useState<'wine_cellar' | 'destruction'>('destruction');
    // const [wineCellarDate, setWineCellarDate] = useState('');
    // const [manualDestination, setManualDestination] = useState('');

    // Item scanner (verification tab)
    const [itemScanMode, setItemScanMode] = useState<'camera' | 'input'>('input');
    const [itemScanInput, setItemScanInput] = useState('');
    const [itemCameraOpen, setItemCameraOpen] = useState(false);
    const [itemScanError, setItemScanError] = useState('');
    const [isItemScanning, setIsItemScanning] = useState(false);
    const itemScanInputRef = useRef<HTMLInputElement>(null);

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

    // Mark as missing
    const [markingMissingId, setMarkingMissingId] = useState<string | null>(null);

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

    // Wine Cellar integration state
    const [wcModal, setWcModal] = useState(false);
    const [wcItems, setWcItems] = useState<WineCellarItem[]>([]);
    const [wcLoading, setWcLoading] = useState(false);
    const [wcSelected, setWcSelected] = useState<Set<string>>(new Set());
    const [wcAdding, setWcAdding] = useState(false);

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

    useEffect(() => {
        if (activeTab === 'items' && itemScanMode === 'input') {
            itemScanInputRef.current?.focus();
        }
    }, [activeTab, itemScanMode]);

    // Verification routing functions moved to dedicated page
    // const resetVerificationRoutingState = useCallback(() => { ... }, []);
    // const fetchReverseDistributors = useCallback(async () => { ... }, [reverseDistributors.length, showToast]);

    // Policy check useEffect moved to dedicated verification page
    /*
    useEffect(() => {
        if (!verifyingItem || verifyStatus !== 'correct') {
            setIsPolicyChecking(false);
            return;
        }
        // ... (policy checking logic moved to dedicated page)
    }, [dispatch, verifyingItem, verifyStatus]);
    */

    // Calculate policy counts - moved here to avoid React Hooks order violation
    const policyCounts = useMemo(() => {
        if (!v2Summary?.items) {
            return { returnable: 0, nonReturnable: 0, wineCellar: 0, destruction: 0, pending: 0 };
        }

        let returnable = 0;
        let nonReturnable = 0;
        let wineCellar = 0;
        let destruction = 0;
        let pending = 0;

        for (const item of v2Summary.items) {
            const destination = String(item.destination || '').trim().toLowerCase();
            if (item.wineCellarId) {
                wineCellar++;
            } else if (destination === 'destruction') {
                destruction++;
            } else if (item.returnStatus === 'returnable') {
                returnable++;
            } else if (item.returnStatus === 'non_returnable') {
                nonReturnable++;
            } else {
                pending++;
            }
        }

        return { returnable, nonReturnable, wineCellar, destruction, pending };
    }, [v2Summary?.items]);

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

    // Verification functions moved to dedicated page
    // const openVerifyItem = (item: VerificationV2Item) => { ... };
    // const closeVerifyModal = () => { ... };

    const runPhysicalVerification = async (
        itemId: string,
        verificationStatus: string,
        actualQuantity?: number,
        conditionNotes?: string,
        nonReturnableReason?: string,
    ): Promise<boolean> => {
        const body: any = { verificationStatus };
        if (verificationStatus === 'missing') body.actualQuantity = 0;
        else if (actualQuantity != null) body.actualQuantity = actualQuantity;
        if (conditionNotes) body.conditionNotes = conditionNotes;
        if (nonReturnableReason) body.nonReturnableReason = nonReturnableReason;

        const result = await dispatch(verifyItemV2({ transactionId: returnId, itemId, ...body }));
        if (!verifyItemV2.fulfilled.match(result)) {
            showToast((result.payload as string) || 'Failed to verify item', 'error');
            return false;
        }
        return true;
    };

    const handleMarkAsMissing = async (itemId: string) => {
        setMarkingMissingId(itemId);
        try {
            const success = await runPhysicalVerification(itemId, 'missing', undefined, undefined, 'other');
            if (success) {
                showToast('Item marked as missing', 'success');
                await loadSummary();
            }
        } finally {
            setMarkingMissingId(null);
        }
    };

    const findScannedItemMatch = (scanData: BarcodeScanResponse): { item: VerificationV2Item | null; error?: string } => {
        if (!v2Summary?.items?.length) return { item: null };

        const ndcCandidates = new Set<string>();
        if (scanData.autoFill?.ndc) ndcCandidates.add(normalizeNdc(scanData.autoFill.ndc));
        if (scanData.product?.ndc) ndcCandidates.add(normalizeNdc(scanData.product.ndc));
        for (const ndc of scanData.scan.ndcCandidates || []) {
            ndcCandidates.add(normalizeNdc(ndc));
        }

        const usableNdcs = Array.from(ndcCandidates).filter(Boolean);
        if (usableNdcs.length === 0) return { item: null };

        const serial = (scanData.scan.serialNumber || '').trim();
        const lot = (scanData.scan.lotNumber || '').trim();
        const exp = normalizeDateKey(scanData.scan.expirationDate);

        const allMatches = v2Summary.items.filter((item) =>
            usableNdcs.includes(normalizeNdc(item.ndc))
        );
        if (allMatches.length === 0) return { item: null };

        const unverifiedMatches = allMatches.filter(item => !item.verificationStatus);
        const candidates = unverifiedMatches.length > 0 ? unverifiedMatches : allMatches;

        // Strict matching: NDC matched, now verify serial and lot also match
        const mismatches: string[] = [];

        if (serial) {
            const expectedItem = candidates.find(item => (item.serialNumber || '').trim().toLowerCase() === serial.toLowerCase());
            if (!expectedItem) {
                const expectedSerials = candidates
                    .filter(item => (item.serialNumber || '').trim())
                    .map(item => (item.serialNumber || '').trim());
                if (expectedSerials.length > 0) {
                    mismatches.push(`Serial number "${serial}" does not match expected: "${expectedSerials[0]}"`);
                }
            }
        }

        if (lot) {
            const expectedItem = candidates.find(item => (item.lotNumber || '').trim().toLowerCase() === lot.toLowerCase());
            if (!expectedItem) {
                const expectedLots = candidates
                    .filter(item => (item.lotNumber || '').trim())
                    .map(item => (item.lotNumber || '').trim());
                if (expectedLots.length > 0) {
                    mismatches.push(`Lot number "${lot}" does not match expected: "${expectedLots[0]}"`);
                }
            }
        }

        if (mismatches.length > 0) {
            return { item: null, error: mismatches.join('. ') };
        }

        // All scanned fields match — find best candidate
        if (serial) {
            const bySerial = candidates.find(item => (item.serialNumber || '').trim().toLowerCase() === serial.toLowerCase());
            if (bySerial) return { item: bySerial };
        }

        if (lot && exp) {
            const byLotAndExp = candidates.find(item =>
                (item.lotNumber || '').trim().toLowerCase() === lot.toLowerCase() &&
                normalizeDateKey(item.expirationDate) === exp
            );
            if (byLotAndExp) return { item: byLotAndExp };
        }

        if (lot) {
            const byLot = candidates.find(item => (item.lotNumber || '').trim().toLowerCase() === lot.toLowerCase());
            if (byLot) return { item: byLot };
        }

        if (exp) {
            const byExpOnly = candidates.find(item => normalizeDateKey(item.expirationDate) === exp);
            if (byExpOnly) return { item: byExpOnly };
        }

        return { item: candidates[0] || null };
    };

    const handleItemScan = async (raw: string) => {
        const trimmed = raw.trim();
        if (!trimmed) return;

        setItemCameraOpen(false);
        setItemScanInput('');
        setItemScanError('');
        setIsItemScanning(true);

        try {
            const result = await dispatch(scanBarcode(trimmed));
            if (!scanBarcode.fulfilled.match(result)) {
                const msg = (result.payload as string) || 'Failed to scan barcode';
                setItemScanError(msg);
                showToast(msg, 'error');
                return;
            }

            const { item: matched, error: matchError } = findScannedItemMatch(result.payload);
            if (matchError) {
                const msg = 'Product is not valid';
                setItemScanError(msg);
                showToast(msg, 'error');
                return;
            }
            if (!matched) {
                const msg = 'Scanned item was not found in this return';
                setItemScanError(msg);
                showToast(msg, 'warning');
                return;
            }

            if (matched.verificationStatus) {
                showToast('This item is already verified', 'warning');
                return;
            }

            // Navigate to verification page instead of modal
            router.push(`/warehouse/verification/${returnId}/verify-item?itemId=${matched.id}`);
            showToast('Item scanned. Redirecting to verification page.');
        } finally {
            setIsItemScanning(false);
        }
    };

    const handleItemScanKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            if (itemScanInput.trim()) {
                void handleItemScan(itemScanInput);
            }
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

    // ── Wine Cellar handlers ────────────────────────────────────
    const openWcModal = async () => {
        if (!v2Summary?.transaction) return;
        
        setWcModal(true);
        setWcLoading(true);
        setWcSelected(new Set());
        try {
            const { apiClient } = await import('@/lib/api/apiClient');
            const res = await apiClient.get<{ status: string; data: { items: WineCellarItem[] } }>(
                '/admin/wine-cellar', true, { 
                    pharmacy_id: v2Summary.transaction.pharmacyId, 
                    status: 'ready_to_return', 
                    limit: '100' 
                }
            );
            setWcItems(res.data.items || []);
        } catch (error) {
            console.error('Failed to fetch wine cellar items:', error);
            showToast('Failed to load wine cellar items', 'error');
            setWcItems([]);
        } finally {
            setWcLoading(false);
        }
    };

    const handleAddWineCellarItems = async () => {
        if (!v2Summary?.transaction || wcSelected.size === 0) return;
        
        setWcAdding(true);
        let successCount = 0;
        
        try {
            const { apiClient } = await import('@/lib/api/apiClient');
            for (const wcId of wcSelected) {
                try {
                    await apiClient.post(`/admin/wine-cellar/${encodeURIComponent(wcId)}/return`, 
                        { transactionId: v2Summary.transaction.id }, true);
                    successCount++;
                } catch (error) {
                    console.error('Failed to add wine cellar item:', error);
                }
            }
        } finally {
            setWcAdding(false);
            setWcModal(false);
            if (successCount > 0) {
                showToast(`${successCount} wine cellar item(s) added to return!`);
                await loadSummary(); // Refresh the summary
            } else {
                showToast('Failed to add wine cellar items', 'error');
            }
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
                            <div className="p-3 rounded-md border border-gray-200 bg-gray-50">
                                <p className="text-[10px] text-gray-500">Total Items</p>
                                <p className="text-xl font-bold text-gray-900">{completedSummary.totalItems ?? 0}</p>
                            </div>
                            <div className="p-3 rounded-md border border-emerald-200 bg-emerald-50">
                                <p className="text-[10px] text-emerald-700">Returnable</p>
                                <p className="text-xl font-bold text-emerald-700">{v2Summary ? policyCounts.returnable : completedSummary.correctItems ?? 0}</p>
                            </div>
                            <div className="p-3 rounded-md border border-rose-200 bg-rose-50">
                                <p className="text-[10px] text-rose-700">Non-Returnable</p>
                                <p className="text-xl font-bold text-rose-700">{v2Summary ? (policyCounts.nonReturnable + policyCounts.wineCellar + policyCounts.destruction) : ((completedSummary.damagedItems ?? 0) + (completedSummary.missingItems ?? 0) + (completedSummary.wrongItems ?? 0))}</p>
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
                            <div className="p-3 rounded-md bg-green-50 border border-green-200 text-center">
                                <p className="text-[10px] text-green-700">Correct Items Value</p>
                                <p className="text-2xl font-bold text-green-900">{formatCurrency(completedSummary.correctItemsValue)}</p>
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
                    <div className="flex gap-3 mt-2 text-[10px] font-medium">
                        <span className="text-emerald-700">{policyCounts.returnable} returnable</span>
                        <span className="text-rose-700">{policyCounts.nonReturnable} non-returnable</span>
                        <span className="text-amber-700">{policyCounts.wineCellar} wine cellar</span>
                        <span className="text-orange-700">{policyCounts.destruction} destruction</span>
                        <span className="text-gray-500">{counts.missing} missing</span>
                        <span className="text-gray-400">{policyCounts.pending} pending policy</span>
                    </div>
                </div>

                {/* Wine Cellar Items Button */}
                {v2Summary?.transaction?.status !== 'completed' && (
                    <div className="flex justify-end">
                        <button
                            onClick={openWcModal}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-purple-700 bg-purple-50 border border-purple-200 rounded-md hover:bg-purple-100 transition-colors"
                        >
                            <Archive className="w-3.5 h-3.5" />
                            Wine Cellar Items
                        </button>
                    </div>
                )}

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
                    <div className="space-y-3">
                        <div className="bg-white rounded-lg shadow p-3 space-y-2">
                            <div className="flex items-center justify-between gap-2 flex-wrap">
                                <div>
                                    <p className="text-xs font-semibold text-gray-800">Scan item during verification</p>
                                    <p className="text-[10px] text-gray-500">Scan barcode and auto-open the matching return item.</p>
                                </div>
                                <div className="flex gap-1">
                                    <button
                                        type="button"
                                        onClick={() => setItemScanMode('input')}
                                        className={`flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium transition-colors ${
                                            itemScanMode === 'input'
                                                ? 'bg-primary-100 text-primary-700 ring-1 ring-primary-300'
                                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                        }`}
                                    >
                                        <Keyboard className="w-3 h-3" /> USB / Keyboard
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setItemScanMode('camera')}
                                        className={`flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium transition-colors ${
                                            itemScanMode === 'camera'
                                                ? 'bg-primary-100 text-primary-700 ring-1 ring-primary-300'
                                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                        }`}
                                    >
                                        <Camera className="w-3 h-3" /> Camera
                                    </button>
                                </div>
                            </div>

                            {itemScanMode === 'input' && (
                                <div className="flex gap-2">
                                    <div className="relative flex-1">
                                        <ScanLine className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                                        <input
                                            ref={itemScanInputRef}
                                            type="text"
                                            value={itemScanInput}
                                            onChange={e => setItemScanInput(e.target.value)}
                                            onKeyDown={handleItemScanKeyDown}
                                            placeholder="Scan item barcode and press Enter..."
                                            className="w-full pl-8 pr-3 py-2 text-xs border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-primary-500 font-mono"
                                            disabled={isItemScanning}
                                        />
                                    </div>
                                    <button
                                        type="button"
                                        disabled={isItemScanning || !itemScanInput.trim()}
                                        onClick={() => void handleItemScan(itemScanInput)}
                                        className="px-3 py-2 text-xs font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-md disabled:opacity-50 flex items-center gap-1"
                                    >
                                        {isItemScanning ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ScanLine className="w-3.5 h-3.5" />}
                                        Scan
                                    </button>
                                </div>
                            )}

                            {itemScanMode === 'camera' && (
                                <button
                                    type="button"
                                    onClick={() => setItemCameraOpen(true)}
                                    disabled={isItemScanning}
                                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 border border-dashed border-primary-300 bg-primary-50 hover:bg-primary-100 rounded-lg transition-colors disabled:opacity-50"
                                >
                                    {isItemScanning ? (
                                        <>
                                            <Loader2 className="w-4 h-4 animate-spin text-primary-600" />
                                            <span className="text-xs font-medium text-primary-700">Processing scan…</span>
                                        </>
                                    ) : (
                                        <>
                                            <Camera className="w-4 h-4 text-primary-600" />
                                            <span className="text-xs font-semibold text-primary-800">Open camera scanner</span>
                                        </>
                                    )}
                                </button>
                            )}

                            {itemScanError && (
                                <p className="text-[11px] text-red-600 flex items-center gap-1">
                                    <XCircle className="w-3 h-3 flex-shrink-0" /> {itemScanError}
                                </p>
                            )}
                        </div>

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
                                            <th className="text-left text-[10px] font-semibold text-gray-500 uppercase px-3 py-1.5">Full Qty</th>
                                            <th className="text-left text-[10px] font-semibold text-gray-500 uppercase px-3 py-1.5">Partial Qty</th>
                                            <th className="text-left text-[10px] font-semibold text-gray-500 uppercase px-3 py-1.5">Verification</th>
                                            <th className="text-left text-[10px] font-semibold text-gray-500 uppercase px-3 py-1.5">Return Status</th>
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
                                                <td className="px-3 py-2 text-xs font-medium">
                                                    {item.isPartial ? '—' : (item.fullPackageQtyReturned ?? item.quantity ?? '—')}
                                                </td>
                                                <td className="px-3 py-2 text-xs font-medium">
                                                    {item.isPartial ? (item.quantity ?? '—') : '—'}
                                                </td>
                                                <td className="px-3 py-2">
                                                    <Badge className={`text-[10px] border ${statusColor(item.verificationStatus)}`}>
                                                        {item.verificationStatus ? item.verificationStatus.replace('_', ' ') : 'unverified'}
                                                    </Badge>
                                                </td>
                                                <td className="px-3 py-2">
                                                    {item.returnStatus ? (
                                                        <div className="space-y-1">
                                                            <Badge className={`text-[10px] border ${
                                                                item.returnStatus === 'returnable'
                                                                    ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
                                                                    : item.returnStatus === 'tbd'
                                                                        ? 'bg-amber-100 text-amber-700 border-amber-200'
                                                                        : item.wineCellarId
                                                                            ? 'bg-purple-100 text-purple-700 border-purple-200'
                                                                            : 'bg-rose-100 text-rose-700 border-rose-200'
                                                            }`}>
                                                                {item.returnStatus === 'tbd'
                                                                    ? 'tbd'
                                                                    : item.wineCellarId
                                                                        ? 'wine cellar'
                                                                        : item.returnStatus === 'returnable'
                                                                            ? 'returnable'
                                                                            : 'non-returnable'
                                                                }
                                                            </Badge>
                                                            {item.returnStatus === 'non_returnable' && item.nonReturnableReason && (
                                                                <div className="text-[9px] text-gray-500 font-medium">
                                                                    {formatNonReturnableReason(item.nonReturnableReason)}
                                                                </div>
                                                            )}
                                                        </div>
                                                    ) : (
                                                        <span className="text-[10px] text-gray-400">pending</span>
                                                    )}
                                                </td>
                                                <td className="px-3 py-2">
                                                    {!item.verificationStatus ? (
                                                        <button
                                                            type="button"
                                                            disabled={markingMissingId === item.id}
                                                            onClick={() => handleMarkAsMissing(item.id)}
                                                            className="px-2 py-1 text-[10px] font-medium rounded-md transition text-white bg-gray-500 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                                                        >
                                                            {markingMissingId === item.id ? (
                                                                <span className="flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" />Marking...</span>
                                                            ) : (
                                                                'Mark as Missing'
                                                            )}
                                                        </button>
                                                    ) : (
                                                        <button
                                                            type="button"
                                                            disabled
                                                            className="px-2 py-1 text-[10px] font-medium rounded-md bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed"
                                                        >
                                                            Mark as Missing
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

                        {itemCameraOpen && (
                            <QrScannerModal onScan={(raw) => void handleItemScan(raw)} onClose={() => setItemCameraOpen(false)} />
                        )}
                    </div>
                )}

                {/* VERIFY ITEM MODAL - Moved to dedicated page /warehouse/verification/[id]/verify-item */}

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
                                {/* <div className="grid grid-cols-3 gap-2 text-[11px]">
                                    <div className="p-2 bg-green-50 rounded border border-green-200"><span className="text-green-700">Correct:</span> <strong>{counts.correct}</strong></div>
                                    <div className="p-2 bg-red-50 rounded border border-red-200"><span className="text-red-700">Damaged:</span> <strong>{counts.damaged}</strong></div>
                                    <div className="p-2 bg-gray-50 rounded border border-gray-200"><span className="text-gray-600">Missing:</span> <strong>{counts.missing}</strong></div>
                                </div> */}
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

                {/* ── Wine Cellar Items Modal ─────────────────────── */}
                {wcModal && (
                    <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-md flex items-center justify-center z-50 p-4" onClick={() => setWcModal(false)}>
                        <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] flex flex-col shadow-xl" onClick={e => e.stopPropagation()}>
                            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-gray-50 flex-shrink-0">
                                <div>
                                    <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                                        <Archive className="w-4 h-4 text-purple-600" />
                                        Wine Cellar Items
                                    </h2>
                                    <p className="text-xs text-gray-500">Select ready-to-return items for {v2Summary?.transaction?.pharmacyName}</p>
                                </div>
                                <button onClick={() => setWcModal(false)} className="text-gray-400 hover:text-gray-600">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                            
                            <div className="flex-1 overflow-auto">
                                {wcLoading ? (
                                    <div className="flex items-center justify-center py-12">
                                        <div className="text-center">
                                            <Loader2 className="w-6 h-6 animate-spin text-primary-600 mx-auto mb-2" />
                                            <p className="text-sm text-gray-500">Loading wine cellar items...</p>
                                        </div>
                                    </div>
                                ) : wcItems.length === 0 ? (
                                    <div className="flex items-center justify-center py-12">
                                        <div className="text-center">
                                            <Archive className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                                            <p className="text-sm font-medium text-gray-500">No wine cellar items ready</p>
                                            <p className="text-xs text-gray-400 mt-1">
                                                Items will appear here when they reach their expected return date
                                            </p>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="overflow-x-auto">
                                        <table className="w-full table-auto text-xs">
                                            <thead>
                                                <tr className="bg-gray-50 border-b border-gray-200">
                                                    <th className="text-left px-3 py-2 w-8">
                                                        <input
                                                            type="checkbox"
                                                            checked={wcSelected.size === wcItems.length && wcItems.length > 0}
                                                            onChange={e => {
                                                                if (e.target.checked) {
                                                                    setWcSelected(new Set(wcItems.map(item => item.id)));
                                                                } else {
                                                                    setWcSelected(new Set());
                                                                }
                                                            }}
                                                            className="text-primary-600 focus:ring-primary-500"
                                                        />
                                                    </th>
                                                    <th className="text-left px-3 py-2 font-medium text-gray-500 uppercase tracking-wider">NDC</th>
                                                    <th className="text-left px-3 py-2 font-medium text-gray-500 uppercase tracking-wider">Product</th>
                                                    <th className="text-center px-3 py-2 font-medium text-gray-500 uppercase tracking-wider">QTY</th>
                                                    <th className="text-right px-3 py-2 font-medium text-gray-500 uppercase tracking-wider">Value</th>
                                                    <th className="text-left px-3 py-2 font-medium text-gray-500 uppercase tracking-wider">Shelved</th>
                                                    <th className="text-left px-3 py-2 font-medium text-gray-500 uppercase tracking-wider">Expected Return</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {wcItems.map((item) => (
                                                    <tr key={item.id} className="border-b border-gray-100 hover:bg-gray-50">
                                                        <td className="px-3 py-2">
                                                            <input
                                                                type="checkbox"
                                                                checked={wcSelected.has(item.id)}
                                                                onChange={e => {
                                                                    const newSelected = new Set(wcSelected);
                                                                    if (e.target.checked) {
                                                                        newSelected.add(item.id);
                                                                    } else {
                                                                        newSelected.delete(item.id);
                                                                    }
                                                                    setWcSelected(newSelected);
                                                                }}
                                                                className="text-primary-600 focus:ring-primary-500"
                                                            />
                                                        </td>
                                                        <td className="px-3 py-2 font-mono text-gray-900">{item.ndc || '—'}</td>
                                                        <td className="px-3 py-2 text-gray-900 max-w-[200px] truncate" title={item.productName || ''}>
                                                            <div>
                                                                <p className="truncate font-medium">{item.productName || '—'}</p>
                                                                {item.manufacturer && (
                                                                    <p className="text-gray-400 truncate text-[10px]">{item.manufacturer}</p>
                                                                )}
                                                                {item.lotNumber && (
                                                                    <p className="text-gray-500 truncate text-[10px]">Lot: {item.lotNumber}</p>
                                                                )}
                                                            </div>
                                                        </td>
                                                        <td className="px-3 py-2 text-center text-gray-900">
                                                            {item.quantity}{item.isPartial && <span className="text-yellow-600 ml-0.5">P</span>}
                                                        </td>
                                                        <td className="px-3 py-2 text-right text-gray-900">
                                                            {item.standardPrice != null ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(item.standardPrice) : '—'}
                                                        </td>
                                                        <td className="px-3 py-2 text-gray-600">{item.dateShelved ? new Date(item.dateShelved).toLocaleDateString() : '—'}</td>
                                                        <td className="px-3 py-2 text-gray-600">
                                                            {item.expectedReturnableDate ? new Date(item.expectedReturnableDate).toLocaleDateString() : '—'}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                            
                            {wcItems.length > 0 && (
                                <div className="flex justify-between items-center px-4 py-3 border-t border-gray-200 bg-gray-50 flex-shrink-0">
                                    <p className="text-xs text-gray-500">
                                        {wcSelected.size} of {wcItems.length} items selected
                                    </p>
                                    <div className="flex gap-2">
                                        <button 
                                            onClick={() => setWcModal(false)}
                                            className="px-3 py-1.5 text-xs rounded border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            onClick={handleAddWineCellarItems}
                                            disabled={wcAdding || wcSelected.size === 0}
                                            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs rounded bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-50 transition-colors"
                                        >
                                            {wcAdding ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Archive className="w-4 h-4 mr-1" />}
                                            Add Selected ({wcSelected.size})
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}

            </div>
        </PermissionGate>
    );
}

