'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter, useParams } from 'next/navigation';
import {
    ArrowLeft, Loader2, CheckCircle, X, AlertTriangle, Package, ClipboardCheck,
    ShieldCheck, Check, Search,
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
import { ReturnTransactionItem } from '@/lib/types';

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
        for (const item of unverified) {
            await dispatch(verifyItem({ transactionId, itemId: item.id, verified: true }));
        }
        showToast(`${unverified.length} items verified`);
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
        } else {
            showToast(result.payload as string || 'Failed to complete verification', 'error');
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
        <div className="space-y-6">
            <ToastContainer toasts={toasts} removeToast={removeToast} />

            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <button onClick={() => router.push('/warehouse/receiving')} className="text-gray-400 hover:text-gray-600"><ArrowLeft className="w-5 h-5" /></button>
                    <div>
                        <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                            <ClipboardCheck className="w-5 h-5 text-primary-600" />
                            Verify: {currentReturn.licensePlate}
                        </h1>
                        <p className="text-sm text-gray-500">{currentReturn.pharmacyName} — Received {currentReturn.receivedInWarehouseDate ? formatDateTime(currentReturn.receivedInWarehouseDate) : '—'}</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {currentReturn.verifiedIntegrity && <Badge variant="success">Verified</Badge>}
                    <Badge variant="info">{currentReturn.status}</Badge>
                </div>
            </div>

            {/* Return Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                {[
                    { label: 'Total Items', value: totalCount },
                    { label: 'Verified Items', value: `${verifiedCount} / ${totalCount}` },
                    { label: 'Open Discrepancies', value: openDiscrepancies },
                    { label: 'FedEx Tracking', value: currentReturn.fedexTracking || '—' },
                    { label: 'Box Count', value: currentReturn.boxCount ?? '—' },
                ].map(c => (
                    <div key={c.label} className="bg-white rounded-lg shadow-sm border p-3">
                        <p className="text-xs text-gray-500">{c.label}</p>
                        <p className="text-sm font-semibold text-gray-900 mt-0.5 font-mono">{c.value}</p>
                    </div>
                ))}
            </div>

            {/* Verification Checklist */}
            <div className="bg-white rounded-lg shadow-md p-5 space-y-4">
                <h2 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-primary-600" />Verification Checklist
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Pieces count */}
                    <div className="flex items-center gap-3 p-3 border rounded-lg bg-gray-50">
                        <div className={`w-6 h-6 rounded flex items-center justify-center ${piecesReceived ? 'bg-green-100 text-green-600' : 'bg-gray-200 text-gray-400'}`}>
                            {piecesReceived ? <Check className="w-4 h-4" /> : <span className="text-xs">1</span>}
                        </div>
                        <div className="flex-1">
                            <label className="text-xs font-medium text-gray-700">Pieces Received</label>
                            <div className="flex items-center gap-2 mt-1">
                                <input
                                    type="number"
                                    value={piecesReceived}
                                    onChange={e => setPiecesReceived(e.target.value)}
                                    placeholder="Count"
                                    className="w-20 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-primary-500"
                                    min={0}
                                />
                                <span className="text-xs text-gray-500">/ {currentReturn.boxCount ?? '?'} expected</span>
                            </div>
                        </div>
                    </div>

                    {/* Items verified */}
                    <div className="flex items-center gap-3 p-3 border rounded-lg bg-gray-50">
                        <div className={`w-6 h-6 rounded flex items-center justify-center ${allItemsVerified ? 'bg-green-100 text-green-600' : 'bg-gray-200 text-gray-400'}`}>
                            {allItemsVerified ? <Check className="w-4 h-4" /> : <span className="text-xs">2</span>}
                        </div>
                        <div className="flex-1">
                            <label className="text-xs font-medium text-gray-700">All Items Verified</label>
                            <p className="text-xs text-gray-500 mt-0.5">{verifiedCount} of {totalCount} verified</p>
                        </div>
                    </div>

                    {/* Integrity confirmed */}
                    <label className="flex items-center gap-3 p-3 border rounded-lg bg-gray-50 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={integrityConfirmed}
                            onChange={e => setIntegrityConfirmed(e.target.checked)}
                            className="w-5 h-5 text-green-600 border-gray-300 rounded focus:ring-green-500"
                        />
                        <div>
                            <span className="text-xs font-medium text-gray-700">Integrity Confirmed</span>
                            <p className="text-xs text-gray-500">No leaking, broken, or damaged bottles</p>
                        </div>
                    </label>

                    {/* Notes */}
                    <div className="p-3 border rounded-lg bg-gray-50">
                        <label className="text-xs font-medium text-gray-700">Verification Notes</label>
                        <textarea
                            value={verifyNotes}
                            onChange={e => setVerifyNotes(e.target.value)}
                            rows={2}
                            placeholder="Any issues or notes..."
                            className="w-full mt-1 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-primary-500 resize-none"
                        />
                    </div>
                </div>

                <div className="flex gap-3 pt-2">
                    <Button
                        variant="success"
                        onClick={handleCompleteVerification}
                        disabled={isActionLoading}
                    >
                        {isActionLoading ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <CheckCircle className="w-4 h-4 mr-1" />}
                        Complete Verification
                    </Button>
                    <Button
                        variant="warning"
                        onClick={() => setDiscModal(true)}
                    >
                        <AlertTriangle className="w-4 h-4 mr-1" />Report Discrepancy
                    </Button>
                </div>
            </div>

            {/* Items Grid */}
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
                <div className="flex items-center justify-between px-5 py-3 border-b bg-gray-50">
                    <h2 className="text-sm font-semibold text-gray-800">Items ({totalCount})</h2>
                    <div className="flex items-center gap-3">
                        <div className="relative">
                            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                                type="text"
                                value={itemSearch}
                                onChange={e => setItemSearch(e.target.value)}
                                placeholder="Filter items..."
                                className="pl-8 pr-3 py-1.5 text-xs border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-primary-500 w-48"
                            />
                        </div>
                        {verifiedCount < totalCount && (
                            <Button variant="outline" size="sm" onClick={handleVerifyAll} disabled={isActionLoading}>
                                <Check className="w-3 h-3 mr-1" />Verify All
                            </Button>
                        )}
                    </div>
                </div>

                {filteredItems.length === 0 ? (
                    <div className="py-8 text-center text-sm text-gray-400">No items found</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                            <thead>
                                <tr className="bg-gray-50 border-b">
                                    <th className="text-center px-3 py-2 font-medium text-gray-600 w-12">✓</th>
                                    <th className="text-left px-3 py-2 font-medium text-gray-600">NDC</th>
                                    <th className="text-left px-3 py-2 font-medium text-gray-600">Product</th>
                                    <th className="text-left px-3 py-2 font-medium text-gray-600">Manufacturer</th>
                                    <th className="text-left px-3 py-2 font-medium text-gray-600">Lot</th>
                                    <th className="text-left px-3 py-2 font-medium text-gray-600">Expires</th>
                                    <th className="text-center px-3 py-2 font-medium text-gray-600">QTY</th>
                                    <th className="text-center px-3 py-2 font-medium text-gray-600">Status</th>
                                    <th className="text-center px-3 py-2 font-medium text-gray-600">Destination</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredItems.map(item => (
                                    <tr key={item.id} className={`border-b border-gray-100 ${item.verified ? 'bg-green-50/50' : 'hover:bg-gray-50'}`}>
                                        <td className="px-3 py-2 text-center">
                                            <input
                                                type="checkbox"
                                                checked={item.verified}
                                                onChange={e => handleVerifyItem(item, e.target.checked)}
                                                className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
                                                disabled={isActionLoading}
                                            />
                                        </td>
                                        <td className="px-3 py-2 font-mono text-gray-900">{item.ndc || '—'}</td>
                                        <td className="px-3 py-2 text-gray-900 max-w-[150px] truncate" title={item.proprietaryName || ''}>{item.proprietaryName || item.genericName || '—'}</td>
                                        <td className="px-3 py-2 text-gray-600 max-w-[120px] truncate">{item.manufacturer || '—'}</td>
                                        <td className="px-3 py-2 text-gray-600 font-mono">{item.lotNumber || '—'}</td>
                                        <td className="px-3 py-2 text-gray-600">{item.expirationDate ? formatDate(item.expirationDate) : '—'}</td>
                                        <td className="px-3 py-2 text-center text-gray-900">{item.quantity}</td>
                                        <td className="px-3 py-2 text-center">
                                            <Badge variant={item.returnStatus === 'returnable' ? 'success' : item.returnStatus === 'non_returnable' ? 'danger' : 'warning'}>
                                                {item.returnStatus === 'non_returnable' ? 'non-ret' : item.returnStatus}
                                            </Badge>
                                        </td>
                                        <td className="px-3 py-2 text-center capitalize text-gray-600">{item.destination || '—'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Discrepancies */}
            {discrepancies.length > 0 && (
                <div className="bg-white rounded-lg shadow-md overflow-hidden">
                    <div className="px-5 py-3 border-b bg-red-50">
                        <h2 className="text-sm font-semibold text-red-800 flex items-center gap-2">
                            <AlertTriangle className="w-4 h-4" /> Discrepancies ({discrepancies.length})
                        </h2>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                            <thead>
                                <tr className="bg-gray-50 border-b">
                                    <th className="text-left px-4 py-2 font-medium text-gray-600">Type</th>
                                    <th className="text-left px-4 py-2 font-medium text-gray-600">Product</th>
                                    <th className="text-left px-4 py-2 font-medium text-gray-600">NDC</th>
                                    <th className="text-center px-4 py-2 font-medium text-gray-600">Expected</th>
                                    <th className="text-center px-4 py-2 font-medium text-gray-600">Actual</th>
                                    <th className="text-left px-4 py-2 font-medium text-gray-600">Notes</th>
                                    <th className="text-center px-4 py-2 font-medium text-gray-600">Status</th>
                                    <th className="text-left px-4 py-2 font-medium text-gray-600">Reported</th>
                                </tr>
                            </thead>
                            <tbody>
                                {discrepancies.map(d => (
                                    <tr key={d.id} className="border-b border-gray-100">
                                        <td className="px-4 py-2">{discTypeBadge(d.type)}</td>
                                        <td className="px-4 py-2 text-gray-900 max-w-[140px] truncate">{d.productName || '—'}</td>
                                        <td className="px-4 py-2 font-mono text-gray-600">{d.ndc || '—'}</td>
                                        <td className="px-4 py-2 text-center text-gray-900">{d.expectedQuantity ?? '—'}</td>
                                        <td className="px-4 py-2 text-center text-gray-900">{d.actualQuantity ?? '—'}</td>
                                        <td className="px-4 py-2 text-gray-600 max-w-[160px] truncate">{d.notes || '—'}</td>
                                        <td className="px-4 py-2 text-center">
                                            <Badge variant={d.status === 'open' ? 'warning' : d.status === 'resolved' ? 'success' : 'secondary'}>{d.status}</Badge>
                                        </td>
                                        <td className="px-4 py-2 text-gray-500">{formatDate(d.createdAt)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
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
