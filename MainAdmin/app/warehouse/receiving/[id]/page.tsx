'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter, useParams } from 'next/navigation';
import {
    ArrowLeft, Loader2, CheckCircle, X, AlertTriangle, Package, ClipboardCheck,
    ShieldCheck, Check, Search, Layers, PlusCircle,
} from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { ToastContainer, Toast } from '@/components/ui/Toast';
import { formatDate, formatDateTime } from '@/lib/utils';
import { useAppDispatch, useAppSelector } from '@/lib/store/hooks';
import {
    fetchTransactionForVerification,
    verifyReturn,
    verifyItem,
    reportDiscrepancy,
    fetchDiscrepancies,
    clearCurrentReturn,
} from '@/lib/store/warehouseSlice';
import {
    fetchBatches,
    createBatch,
    assignReturnsToBatch,
    fetchUsedBatchMonths,
} from '@/lib/store/batchSlice';
import { buildAvailableBatchMonthOptions } from '@/lib/utils/batchMonths';
import { ReturnTransactionItem, ReturnBatch } from '@/lib/types';

export default function WarehouseVerificationPage() {
    const dispatch = useAppDispatch();
    const router = useRouter();
    const params = useParams();
    const transactionId = params.id as string;

    const { currentReturn, currentItems, discrepancies, verificationSummary, isLoading, isActionLoading } = useAppSelector(s => s.warehouse);

    const [piecesReceived, setPiecesReceived] = useState('');
    const [integrityConfirmed, setIntegrityConfirmed] = useState(false);
    const [verifyNotes, setVerifyNotes] = useState('');
    const [itemSearch, setItemSearch] = useState('');

    // Discrepancy modal
    const [discModal, setDiscModal] = useState(false);
    const [discForm, setDiscForm] = useState({ type: 'missing' as string, itemId: '', ndc: '', productName: '', expectedQuantity: '', actualQuantity: '', notes: '' });

    // Batch assignment modal
    const [batchModal, setBatchModal] = useState(false);
    const [openBatches, setOpenBatches] = useState<ReturnBatch[]>([]);
    const [batchesLoading, setBatchesLoading] = useState(false);
    const [selectedBatchId, setSelectedBatchId] = useState<string>('');
    const [createNewBatch, setCreateNewBatch] = useState(false);
    const [newBatchMonth, setNewBatchMonth] = useState('');
    const [newBatchName, setNewBatchName] = useState('');
    const [batchAssigning, setBatchAssigning] = useState(false);
    const [usedBatchMonths, setUsedBatchMonths] = useState<string[]>([]);
    const [usedMonthsLoading, setUsedMonthsLoading] = useState(false);

    // Toasts
    const [toasts, setToasts] = useState<Toast[]>([]);
    const showToast = (msg: string, type: Toast['type'] = 'success') => {
        setToasts(prev => [...prev, { id: Date.now().toString(), message: msg, type }]);
    };
    const removeToast = (id: string) => setToasts(prev => prev.filter(t => t.id !== id));

    useEffect(() => {
        if (transactionId) {
            dispatch(fetchTransactionForVerification(transactionId));
            dispatch(fetchDiscrepancies({ transactionId }));
        }
        return () => { dispatch(clearCurrentReturn()); };
    }, [transactionId, dispatch]);

    useEffect(() => {
        if (currentReturn?.piecesReceived != null) {
            setPiecesReceived(String(currentReturn.piecesReceived));
        }
        if (currentReturn?.verifiedIntegrity) {
            setIntegrityConfirmed(true);
        }
    }, [currentReturn]);

    const availableNewBatchMonths = useMemo(
        () => buildAvailableBatchMonthOptions(usedBatchMonths),
        [usedBatchMonths]
    );

    useEffect(() => {
        if (!batchModal) {
            setUsedBatchMonths([]);
            return;
        }
        let cancelled = false;
        setUsedMonthsLoading(true);
        dispatch(fetchUsedBatchMonths())
            .unwrap()
            .then((months) => { if (!cancelled) setUsedBatchMonths(months); })
            .catch(() => { if (!cancelled) setUsedBatchMonths([]); })
            .finally(() => { if (!cancelled) setUsedMonthsLoading(false); });
        return () => { cancelled = true; };
    }, [batchModal, dispatch]);

    useEffect(() => {
        if (!batchModal || !createNewBatch || usedMonthsLoading) return;
        const opts = availableNewBatchMonths;
        setNewBatchMonth((prev) =>
            (prev && opts.some((o) => o.value === prev) ? prev : opts[0]?.value ?? '')
        );
    }, [batchModal, createNewBatch, usedMonthsLoading, availableNewBatchMonths]);

    // Filter items
    const filteredItems = useMemo(() => {
        if (!itemSearch) return currentItems;
        const s = itemSearch.toLowerCase();
        return currentItems.filter(i =>
            (i.ndc && i.ndc.toLowerCase().includes(s)) ||
            (i.proprietaryName && i.proprietaryName.toLowerCase().includes(s)) ||
            (i.manufacturer && i.manufacturer.toLowerCase().includes(s)) ||
            (i.lotNumber && i.lotNumber.toLowerCase().includes(s))
        );
    }, [currentItems, itemSearch]);

    const verifiedCount = currentItems.filter(i => i.verified).length;
    const totalCount = currentItems.length;
    const allItemsVerified = totalCount > 0 && verifiedCount === totalCount;
    const openDiscrepancies = discrepancies.filter(d => d.status === 'open').length;

    const expectedBoxCount = currentReturn?.boxCount ?? null;

    // All four checklist conditions must be met to enable Complete Verification
    const checklistDone = {
        pieces: !!piecesReceived && Number(piecesReceived) > 0 &&
            (expectedBoxCount === null || Number(piecesReceived) <= expectedBoxCount),
        integrity: integrityConfirmed,
        items: allItemsVerified,
        notes: !!verifyNotes.trim(),
    };
    const canComplete = checklistDone.pieces && checklistDone.integrity && checklistDone.items && checklistDone.notes;

    // ── Handlers ──────────────────────────────────────────────

    const handleVerifyItem = async (item: ReturnTransactionItem, verified: boolean) => {
        const result = await dispatch(verifyItem({
            transactionId,
            itemId: item.id,
            verified,
        }));
        if (verifyItem.fulfilled.match(result)) {
            showToast(verified ? `${item.proprietaryName || item.ndc || 'Item'} verified` : 'Verification removed');
        } else {
            showToast(result.payload as string || 'Failed', 'error');
        }
    };

    const handleVerifyAll = async () => {
        const unverified = currentItems.filter(i => !i.verified);
        if (unverified.length === 0) return;
        await Promise.all(
            unverified.map(item => dispatch(verifyItem({ transactionId, itemId: item.id, verified: true })))
        );
        showToast(`${unverified.length} item${unverified.length !== 1 ? 's' : ''} verified`);
    };

    const handleCompleteVerification = async () => {
        const result = await dispatch(verifyReturn({
            id: transactionId,
            piecesReceived: piecesReceived ? Number(piecesReceived) : undefined,
            verifiedIntegrity: integrityConfirmed,
            notes: verifyNotes || undefined,
        }));

        if (verifyReturn.fulfilled.match(result)) {
            showToast('Verification complete!');
            // Immediately open the batch assignment modal
            setBatchModal(true);
            setBatchesLoading(true);
            setSelectedBatchId('');
            setCreateNewBatch(false);
            setNewBatchMonth('');
            setNewBatchName('');
            
            // Load open batches and used months
            const [batchResult, monthsResult] = await Promise.all([
                dispatch(fetchBatches({ status: 'open', limit: 100 })),
                dispatch(fetchUsedBatchMonths())
            ]);
            
            if (fetchBatches.fulfilled.match(batchResult)) {
                setOpenBatches(batchResult.payload.data);
            }
            setBatchesLoading(false);
        } else {
            showToast(result.payload as string || 'Failed to complete verification', 'error');
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
                const createResult = await dispatch(createBatch({ batchMonth: `${newBatchMonth}-01`, batchName: newBatchName || undefined }));
                if (!createBatch.fulfilled.match(createResult)) {
                    showToast(createResult.payload as string || 'Failed to create batch', 'error');
                    setBatchAssigning(false);
                    return;
                }
                targetBatchId = createResult.payload.id;
            }

            if (!targetBatchId) {
                showToast('Please select a batch or create a new one', 'error');
                setBatchAssigning(false);
                return;
            }

            const assignResult = await dispatch(assignReturnsToBatch({ batchId: targetBatchId, transactionIds: [transactionId] }));
            if (assignReturnsToBatch.fulfilled.match(assignResult)) {
                setBatchModal(false);
                router.push('/warehouse/batches');
            } else {
                showToast(assignResult.payload as string || 'Failed to assign to batch', 'error');
            }
        } finally {
            setBatchAssigning(false);
        }
    };

    const handleReportDiscrepancy = async () => {
        const result = await dispatch(reportDiscrepancy({
            transactionId,
            type: discForm.type,
            itemId: discForm.itemId || undefined,
            ndc: discForm.ndc || undefined,
            productName: discForm.productName || undefined,
            expectedQuantity: discForm.expectedQuantity ? Number(discForm.expectedQuantity) : undefined,
            actualQuantity: discForm.actualQuantity ? Number(discForm.actualQuantity) : undefined,
            notes: discForm.notes || undefined,
        }));

        if (reportDiscrepancy.fulfilled.match(result)) {
            showToast('Discrepancy reported');
            setDiscModal(false);
            setDiscForm({ type: 'missing', itemId: '', ndc: '', productName: '', expectedQuantity: '', actualQuantity: '', notes: '' });
        } else {
            showToast(result.payload as string || 'Failed to report', 'error');
        }
    };

    const discTypeBadge = (type: string) => {
        const map: Record<string, 'danger' | 'warning' | 'info' | 'secondary'> = { missing: 'danger', extra: 'info', damaged: 'warning', wrong_store: 'warning', other: 'secondary' };
        return <Badge variant={map[type] || 'secondary'}>{type.replace('_', ' ')}</Badge>;
    };

    // ── Render ────────────────────────────────────────────────

    if (isLoading && !currentReturn) {
        return <div className="flex justify-center py-24"><Loader2 className="w-8 h-8 animate-spin text-primary-600" /></div>;
    }

    if (!currentReturn) {
        return (
            <div className="text-center py-24">
                <Package className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">Return transaction not found</p>
                <Button variant="outline" onClick={() => router.push('/warehouse/receiving')} className="mt-4">
                    <ArrowLeft className="w-4 h-4 mr-1" />Back to Receiving
                </Button>
            </div>
        );
    }

    return (
        <div className="space-y-3">
            <ToastContainer toasts={toasts} onClose={removeToast} />

            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <button onClick={() => router.push('/warehouse/receiving')} className="text-gray-400 hover:text-gray-600"><ArrowLeft className="w-4 h-4" /></button>
                    <div>
                        <h1 className="text-base font-bold text-gray-900 flex items-center gap-1.5">
                            <ClipboardCheck className="w-4 h-4 text-primary-600" />
                            Verify: {currentReturn.licensePlate}
                        </h1>
                        <p className="text-xs text-gray-500">{currentReturn.pharmacyName} — Received {currentReturn.receivedInWarehouseDate ? formatDateTime(currentReturn.receivedInWarehouseDate) : '—'}</p>
                    </div>
                </div>
                <div className="flex items-center gap-1.5">
                    {currentReturn.verifiedIntegrity && <Badge variant="success"><span className="text-[10px]">Verified</span></Badge>}
                    <Badge variant="info"><span className="text-[10px]">{currentReturn.status}</span></Badge>
                </div>
            </div>

            {/* Return Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                {[
                    { label: 'Total Items', value: totalCount },
                    { label: 'Verified Items', value: `${verifiedCount} / ${totalCount}` },
                    { label: 'Open Discrepancies', value: openDiscrepancies },
                    { label: 'FedEx Tracking', value: currentReturn.fedexTracking || '—' },
                    { label: 'Box Count', value: currentReturn.boxCount ?? '—' },
                ].map(c => (
                    <div key={c.label} className="bg-white rounded-lg shadow-sm border px-3 py-2">
                        <p className="text-[10px] text-gray-500">{c.label}</p>
                        <p className="text-xs font-semibold text-gray-900 mt-0.5 font-mono">{c.value}</p>
                    </div>
                ))}
            </div>

            {/* Verification Checklist */}
            <div className="bg-white rounded-lg shadow px-4 py-3 space-y-3">
                <h2 className="text-xs font-semibold text-gray-800 flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-primary-600" />Verification Checklist
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {/* 1. Pieces Received */}
                    <div className={`flex items-center gap-2 px-3 py-2 border rounded-lg transition-colors ${checklistDone.pieces ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'}`}>
                        <div className={`w-5 h-5 rounded flex items-center justify-center flex-shrink-0 ${checklistDone.pieces ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-400'}`}>
                            {checklistDone.pieces ? <Check className="w-3.5 h-3.5" /> : <span className="text-[10px] font-bold">1</span>}
                        </div>
                        <div className="flex-1">
                            <label className="text-[10px] font-medium text-gray-700">
                                Pieces Received <span className="text-red-500">*</span>
                            </label>
                            <div className="flex items-center gap-1.5 mt-0.5">
                                <input
                                    type="number"
                                    value={piecesReceived}
                                    onChange={e => {
                                        const val = e.target.value;
                                        if (expectedBoxCount !== null && Number(val) > expectedBoxCount) return;
                                        setPiecesReceived(val);
                                    }}
                                    placeholder="Count"
                                    className={`w-16 px-2 py-0.5 text-xs border rounded focus:outline-none focus:ring-1 ${checklistDone.pieces ? 'border-green-300 focus:ring-green-400' : 'border-gray-300 focus:ring-primary-500'}`}
                                    min={0}
                                    max={expectedBoxCount ?? undefined}
                                />
                                <span className="text-[10px] text-gray-500">/ {currentReturn.boxCount ?? '?'} expected</span>
                            </div>
                        </div>
                    </div>

                    {/* 2. All Items Verified */}
                    <div className={`flex items-center gap-2 px-3 py-2 border rounded-lg ${checklistDone.items ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'}`}>
                        <div className={`w-5 h-5 rounded flex items-center justify-center flex-shrink-0 ${checklistDone.items ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-400'}`}>
                            {checklistDone.items ? <Check className="w-3.5 h-3.5" /> : <span className="text-[10px] font-bold">2</span>}
                        </div>
                        <div className="flex-1">
                            <label className="text-[10px] font-medium text-gray-700">
                                All Items Verified <span className="text-red-500">*</span>
                            </label>
                            <p className={`text-[10px] ${checklistDone.items ? 'text-green-600 font-medium' : 'text-gray-500'}`}>
                                {checklistDone.items ? `All ${totalCount} items verified ✓` : `${verifiedCount} of ${totalCount} verified — check each item below`}
                            </p>
                        </div>
                    </div>

                    {/* 3. Integrity Confirmed */}
                    <label className={`flex items-center gap-2 px-3 py-2 border rounded-lg cursor-pointer transition-colors ${checklistDone.integrity ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'}`}>
                        <div className={`w-5 h-5 rounded flex items-center justify-center flex-shrink-0 ${checklistDone.integrity ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-400'}`}>
                            {checklistDone.integrity ? <Check className="w-3.5 h-3.5" /> : <span className="text-[10px] font-bold">3</span>}
                        </div>
                        <div className="flex-1">
                            <span className="text-[10px] font-medium text-gray-700">
                                Integrity Confirmed <span className="text-red-500">*</span>
                            </span>
                            <p className="text-[10px] text-gray-500">No leaking, broken, or damaged bottles</p>
                        </div>
                        <input
                            type="checkbox"
                            checked={integrityConfirmed}
                            onChange={e => setIntegrityConfirmed(e.target.checked)}
                            className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
                        />
                    </label>

                    {/* 4. Verification Notes */}
                    <div className={`px-3 py-2 border rounded-lg transition-colors ${checklistDone.notes ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'}`}>
                        <div className="flex items-center gap-1.5 mb-0.5">
                            <div className={`w-5 h-5 rounded flex items-center justify-center flex-shrink-0 ${checklistDone.notes ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-400'}`}>
                                {checklistDone.notes ? <Check className="w-3.5 h-3.5" /> : <span className="text-[10px] font-bold">4</span>}
                            </div>
                            <label className="text-[10px] font-medium text-gray-700">
                                Verification Notes <span className="text-red-500">*</span>
                            </label>
                        </div>
                        <textarea
                            value={verifyNotes}
                            onChange={e => setVerifyNotes(e.target.value)}
                            rows={2}
                            placeholder="Required — enter any issues or confirm everything is OK..."
                            className={`w-full mt-0.5 px-2 py-1 text-xs border rounded focus:outline-none focus:ring-1 resize-none ${checklistDone.notes ? 'border-green-300 focus:ring-green-400' : 'border-gray-300 focus:ring-primary-500'}`}
                        />
                    </div>
                </div>

                {/* Completion hint */}
                {!canComplete && (
                    <div className="flex items-start gap-1.5 bg-amber-50 border border-amber-200 rounded px-3 py-2">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-500 flex-shrink-0 mt-0.5" />
                        <p className="text-[10px] text-amber-700">
                            Complete all checklist items to enable verification:&nbsp;
                            {[
                                !checklistDone.pieces && 'Pieces Received',
                                !checklistDone.items && 'All Items Verified',
                                !checklistDone.integrity && 'Integrity Confirmed',
                                !checklistDone.notes && 'Verification Notes',
                            ].filter(Boolean).join(' · ')}
                        </p>
                    </div>
                )}

                <div className="flex gap-2 pt-1">
                    <button
                        onClick={handleCompleteVerification}
                        disabled={isActionLoading || !canComplete}
                        title={!canComplete ? 'Complete all checklist items first' : 'Complete verification'}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded text-xs font-medium bg-green-600 text-white hover:bg-green-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                        {isActionLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
                        Complete Verification
                    </button>
                    <button
                        onClick={() => setDiscModal(true)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800 hover:bg-yellow-200 border border-yellow-300 transition-colors"
                    >
                        <AlertTriangle className="w-3.5 h-3.5" />Report Discrepancy
                    </button>
                </div>
            </div>

            {/* Items Grid */}
            <div className="bg-white rounded-lg shadow overflow-hidden">
                <div className="flex items-center justify-between px-4 py-2 border-b bg-gray-50">
                    <h2 className="text-xs font-semibold text-gray-800">Items ({totalCount})</h2>
                    <div className="flex items-center gap-2">
                        <div className="relative">
                            <Search className="w-3 h-3 absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                                type="text"
                                value={itemSearch}
                                onChange={e => setItemSearch(e.target.value)}
                                placeholder="Filter items..."
                                className="pl-7 pr-3 py-1 text-[11px] border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-primary-500 w-40"
                            />
                        </div>
                        {verifiedCount < totalCount && (
                            <button
                                onClick={handleVerifyAll}
                                disabled={isActionLoading}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-medium border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 transition-colors"
                            >
                                <Check className="w-3 h-3" />Verify All
                            </button>
                        )}
                    </div>
                </div>

                {filteredItems.length === 0 ? (
                    <div className="py-6 text-center text-xs text-gray-400">No items found</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="bg-gradient-to-r from-indigo-500 to-indigo-400">
                                    <th className="text-center px-4 py-3.5 text-xs font-semibold uppercase tracking-wider whitespace-nowrap text-white whitespace-nowrap w-10">✓</th>
                                    <th className="text-left px-4 py-3.5 text-xs font-semibold uppercase tracking-wider whitespace-nowrap text-white whitespace-nowrap">NDC</th>
                                    <th className="text-left px-4 py-3.5 text-xs font-semibold uppercase tracking-wider whitespace-nowrap text-white whitespace-nowrap">Product</th>
                                    <th className="text-left px-4 py-3.5 text-xs font-semibold uppercase tracking-wider whitespace-nowrap text-white whitespace-nowrap">Manufacturer</th>
                                    <th className="text-left px-4 py-3.5 text-xs font-semibold uppercase tracking-wider whitespace-nowrap text-white whitespace-nowrap">Lot</th>
                                    <th className="text-left px-4 py-3.5 text-xs font-semibold uppercase tracking-wider whitespace-nowrap text-white whitespace-nowrap">Expires</th>
                                    <th className="text-center px-4 py-3.5 text-xs font-semibold uppercase tracking-wider whitespace-nowrap text-white whitespace-nowrap">Qty</th>
                                    <th className="text-center px-4 py-3.5 text-xs font-semibold uppercase tracking-wider whitespace-nowrap text-white whitespace-nowrap">Status</th>
                                    <th className="text-center px-4 py-3.5 text-xs font-semibold uppercase tracking-wider whitespace-nowrap text-white whitespace-nowrap">Destination</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {filteredItems.map(item => (
                                    <tr key={item.id} className={`${item.verified ? 'bg-green-50/50' : 'hover:bg-gray-50'}`}>
                                        <td className="px-4 py-3 text-center">
                                            <input
                                                type="checkbox"
                                                checked={item.verified}
                                                onChange={e => handleVerifyItem(item, e.target.checked)}
                                                className="w-3.5 h-3.5 text-green-600 border-gray-300 rounded focus:ring-green-500"
                                                disabled={isActionLoading}
                                            />
                                        </td>
                                        <td className="px-4 py-3 text-sm font-mono text-gray-900 whitespace-nowrap">{item.ndc || '—'}</td>
                                        <td className="px-4 py-3 text-sm text-gray-900 max-w-[140px] truncate" title={item.proprietaryName || ''}>{item.proprietaryName || item.genericName || '—'}</td>
                                        <td className="px-4 py-3 text-sm text-gray-600 max-w-[110px] truncate">{item.manufacturer || '—'}</td>
                                        <td className="px-4 py-3 text-sm text-gray-600 font-mono whitespace-nowrap">{item.lotNumber || '—'}</td>
                                        <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{item.expirationDate ? formatDate(item.expirationDate) : '—'}</td>
                                        <td className="px-4 py-3 text-sm text-center text-gray-900 font-semibold">{item.quantity}</td>
                                        <td className="px-4 py-3 text-center">
                                            <Badge variant={item.returnStatus === 'returnable' ? 'success' : item.returnStatus === 'non_returnable' ? 'danger' : 'warning'}>
                                                <span className="text-[10px]">{item.returnStatus === 'non_returnable' ? 'non-ret' : item.returnStatus}</span>
                                            </Badge>
                                        </td>
                                        <td className="px-4 py-3 text-sm text-center capitalize text-gray-600">{item.destination || '—'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Discrepancies */}
            {discrepancies.length > 0 && (
                <div className="bg-white rounded-lg shadow overflow-hidden">
                    <div className="px-4 py-2 border-b bg-red-50">
                        <h2 className="text-xs font-semibold text-red-800 flex items-center gap-1.5">
                            <AlertTriangle className="w-3.5 h-3.5" /> Discrepancies ({discrepancies.length})
                        </h2>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="bg-gradient-to-r from-indigo-500 to-indigo-400">
                                    <th className="text-left px-4 py-3.5 text-xs font-semibold uppercase tracking-wider whitespace-nowrap text-white whitespace-nowrap">Type</th>
                                    <th className="text-left px-4 py-3.5 text-xs font-semibold uppercase tracking-wider whitespace-nowrap text-white whitespace-nowrap">Product</th>
                                    <th className="text-left px-4 py-3.5 text-xs font-semibold uppercase tracking-wider whitespace-nowrap text-white whitespace-nowrap">NDC</th>
                                    <th className="text-center px-4 py-3.5 text-xs font-semibold uppercase tracking-wider whitespace-nowrap text-white whitespace-nowrap">Expected</th>
                                    <th className="text-center px-4 py-3.5 text-xs font-semibold uppercase tracking-wider whitespace-nowrap text-white whitespace-nowrap">Actual</th>
                                    <th className="text-left px-4 py-3.5 text-xs font-semibold uppercase tracking-wider whitespace-nowrap text-white whitespace-nowrap">Notes</th>
                                    <th className="text-center px-4 py-3.5 text-xs font-semibold uppercase tracking-wider whitespace-nowrap text-white whitespace-nowrap">Status</th>
                                    <th className="text-left px-4 py-3.5 text-xs font-semibold uppercase tracking-wider whitespace-nowrap text-white whitespace-nowrap">Reported</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {discrepancies.map(d => (
                                    <tr key={d.id} className="hover:bg-gray-50">
                                        <td className="px-4 py-3">{discTypeBadge(d.type)}</td>
                                        <td className="px-4 py-3 text-sm text-gray-900 max-w-[130px] truncate">{d.productName || '—'}</td>
                                        <td className="px-4 py-3 text-sm font-mono text-gray-600">{d.ndc || '—'}</td>
                                        <td className="px-4 py-3 text-sm text-center text-gray-900">{d.expectedQuantity ?? '—'}</td>
                                        <td className="px-4 py-3 text-sm text-center text-gray-900">{d.actualQuantity ?? '—'}</td>
                                        <td className="px-4 py-3 text-sm text-gray-600 max-w-[150px] truncate">{d.notes || '—'}</td>
                                        <td className="px-4 py-3 text-center">
                                            <Badge variant={d.status === 'open' ? 'warning' : d.status === 'resolved' ? 'success' : 'secondary'}>
                                                <span className="text-[10px]">{d.status}</span>
                                            </Badge>
                                        </td>
                                        <td className="px-4 py-3 text-sm text-gray-500">{formatDate(d.createdAt)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
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
                                Verification complete for <span className="font-semibold">{currentReturn.licensePlate}</span>.
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
                            <Button variant="outline" onClick={() => setBatchModal(false)}>Skip</Button>
                            <Button
                                variant="primary"
                                onClick={handleAssignToBatch}
                                disabled={
                                    batchAssigning || batchesLoading
                                    || (!createNewBatch && !selectedBatchId)
                                    || (createNewBatch && (usedMonthsLoading || !newBatchMonth || availableNewBatchMonths.length === 0))
                                }
                            >
                                {batchAssigning ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Layers className="w-4 h-4 mr-1" />}
                                {createNewBatch ? 'Create & Assign' : 'Assign to Batch'}
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Discrepancy Modal ───────────────────────── */}
            {discModal && (
                <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-md flex items-center justify-center z-50 p-4" onClick={() => setDiscModal(false)}>
                    <div className="bg-white rounded-lg max-w-md w-full shadow-xl" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between p-5 border-b bg-gray-50">
                            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2"><AlertTriangle className="w-5 h-5 text-yellow-500" />Report Discrepancy</h2>
                            <button onClick={() => setDiscModal(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
                        </div>
                        <div className="p-5 space-y-4">
                            {/* Type */}
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Type <span className="text-red-500">*</span></label>
                                <select value={discForm.type} onChange={e => setDiscForm({ ...discForm, type: e.target.value })} className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500">
                                    <option value="missing">Missing</option>
                                    <option value="extra">Extra / Unmanifested</option>
                                    <option value="damaged">Damaged</option>
                                    <option value="wrong_store">Wrong Store</option>
                                    <option value="other">Other</option>
                                </select>
                            </div>
                            {/* Product info */}
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">NDC</label>
                                    <input type="text" value={discForm.ndc} onChange={e => setDiscForm({ ...discForm, ndc: e.target.value })} placeholder="NDC code" className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-primary-500" />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">Product Name</label>
                                    <input type="text" value={discForm.productName} onChange={e => setDiscForm({ ...discForm, productName: e.target.value })} placeholder="Product name" className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-primary-500" />
                                </div>
                            </div>
                            {/* Quantities */}
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">Expected Quantity</label>
                                    <input type="number" min={0} value={discForm.expectedQuantity} onChange={e => setDiscForm({ ...discForm, expectedQuantity: e.target.value })} className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-primary-500" />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">Actual Quantity</label>
                                    <input type="number" min={0} value={discForm.actualQuantity} onChange={e => setDiscForm({ ...discForm, actualQuantity: e.target.value })} className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-primary-500" />
                                </div>
                            </div>
                            {/* Notes */}
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Notes</label>
                                <textarea value={discForm.notes} onChange={e => setDiscForm({ ...discForm, notes: e.target.value })} rows={2} placeholder="Describe the discrepancy..." className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-primary-500 resize-none" />
                            </div>
                        </div>
                        <div className="flex justify-end gap-2 p-5 border-t bg-gray-50">
                            <Button variant="outline" onClick={() => setDiscModal(false)}>Cancel</Button>
                            <Button variant="warning" onClick={handleReportDiscrepancy} disabled={isActionLoading}>
                                {isActionLoading ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <AlertTriangle className="w-4 h-4 mr-1" />}
                                Report
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
