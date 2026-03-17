'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import {
    ArrowLeft, Loader2, AlertCircle, X, Pause, Play, CheckCircle, Lock,
    Trash2, Edit, ClipboardList, Building2, UserCog, Package, Truck, Clock,
    Plus, Search, ScanLine, Archive, FileText, Download, AlertTriangle, Printer,
} from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { ToastContainer, Toast } from '@/components/ui/Toast';
import { formatDate } from '@/lib/utils';
import { useAppDispatch, useAppSelector } from '@/lib/store/hooks';
import { useDebounce } from '@/lib/hooks/useDebounce';
import {
    fetchReturnTransactionById,
    updateReturnTransaction,
    pauseReturnTransaction,
    resumeReturnTransaction,
    completeReturnTransaction,
    finalizeReturnTransaction,
    deleteReturnTransaction,
    clearCurrentTransaction,
    fetchTransactionItems,
    deleteTransactionItem,
    updateTransactionItem,
    moveItemToWineCellar,
    clearItems,
} from '@/lib/store/returnTransactionsSlice';
import { ReturnTransaction, ReturnTransactionItem, WineCellarItem } from '@/lib/types';

// ── Helpers ────────────────────────────────────────────────────

function getStatusBadge(status: string): { variant: 'success' | 'warning' | 'danger' | 'info' | 'default'; label: string } {
    switch (status) {
        case 'in_progress': return { variant: 'info', label: 'In Progress' };
        case 'paused': return { variant: 'warning', label: 'Paused' };
        case 'completed': return { variant: 'success', label: 'Completed' };
        case 'finalized': return { variant: 'default', label: 'Finalized' };
        case 'received': return { variant: 'success', label: 'Received' };
        case 'closed_out': return { variant: 'default', label: 'Closed Out' };
        default: return { variant: 'default', label: status };
    }
}

function formatCurrency(value: number): string {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
}

function canDoAction(tx: ReturnTransaction, action: string): boolean {
    switch (action) {
        case 'pause': return tx.status === 'in_progress';
        case 'resume': return tx.status === 'paused';
        case 'complete': return tx.status === 'in_progress' || tx.status === 'paused';
        case 'finalize': return tx.status === 'completed';
        case 'edit': return tx.status !== 'finalized' && tx.status !== 'closed_out';
        case 'delete': return tx.status !== 'finalized' && tx.status !== 'closed_out' && tx.status !== 'received';
        default: return false;
    }
}

// ── Page ───────────────────────────────────────────────────────

export default function ReturnDetailPage() {
    const router = useRouter();
    const params = useParams();
    const id = params.id as string;
    const dispatch = useAppDispatch();
    const { currentTransaction: tx, isLoading, isActionLoading, error } = useAppSelector(
        (state) => state.returnTransactions
    );

    const { items, itemsSummary, isItemsLoading, isItemActionLoading } = useAppSelector(
        (state) => state.returnTransactions
    );

    const [toasts, setToasts] = useState<Toast[]>([]);
    const [editModal, setEditModal] = useState(false);
    const [editForm, setEditForm] = useState({ fedexTracking: '', fedexPickupConfirmation: '', notes: '' });
    const [actionModal, setActionModal] = useState<'pause' | 'resume' | 'complete' | null>(null);
    const [deleteModal, setDeleteModal] = useState(false);

    // Items state
    const [itemSearch, setItemSearch] = useState('');
    const [itemStatusFilter, setItemStatusFilter] = useState('');
    const [deleteItemModal, setDeleteItemModal] = useState<ReturnTransactionItem | null>(null);
    const [editItemModal, setEditItemModal] = useState<ReturnTransactionItem | null>(null);
    const [editItemForm, setEditItemForm] = useState({ quantity: '', standardPrice: '', returnStatus: 'tbd', memo: '' });
    const debouncedItemSearch = useDebounce(itemSearch, 500);

    // Wine Cellar integration state
    const [wcModal, setWcModal] = useState(false);
    const [wcItems, setWcItems] = useState<WineCellarItem[]>([]);
    const [wcLoading, setWcLoading] = useState(false);
    const [wcSelected, setWcSelected] = useState<Set<string>>(new Set());
    const [wcAdding, setWcAdding] = useState(false);

    // Finalize flow state
    const [finalizeModal, setFinalizeModal] = useState(false);
    const [finalizeForm, setFinalizeForm] = useState({ fedexTracking: '', boxCount: '' });
    const [finalizeStepsDone, setFinalizeStepsDone] = useState({ printManifest: false, fedexEntered: false, printJobSheets: false });
    const [pdfLoading, setPdfLoading] = useState<string | null>(null);

    const showToast = (message: string, type: Toast['type'] = 'success') => {
        const tid = Date.now().toString();
        setToasts(prev => [...prev, { id: tid, message, type }]);
    };
    const removeToast = (tid: string) => setToasts(prev => prev.filter(t => t.id !== tid));

    useEffect(() => {
        if (id) dispatch(fetchReturnTransactionById(id));
        return () => { dispatch(clearCurrentTransaction()); dispatch(clearItems()); };
    }, [dispatch, id]);

    useEffect(() => {
        if (id) {
            dispatch(fetchTransactionItems({
                transactionId: id,
                returnStatus: itemStatusFilter || undefined,
                search: debouncedItemSearch || undefined,
            }));
        }
    }, [dispatch, id, itemStatusFilter, debouncedItemSearch]);

    useEffect(() => {
        if (editModal && tx) {
            setEditForm({
                fedexTracking: tx.fedexTracking || '',
                fedexPickupConfirmation: tx.fedexPickupConfirmation || '',
                notes: tx.notes || '',
            });
        }
    }, [editModal, tx]);

    const refresh = () => dispatch(fetchReturnTransactionById(id));

    const handleStatusAction = async () => {
        if (!actionModal || !tx) return;
        const thunkMap: Record<string, any> = { pause: pauseReturnTransaction, resume: resumeReturnTransaction, complete: completeReturnTransaction };
        const thunk = thunkMap[actionModal];
        const wasComplete = actionModal === 'complete';
        const result = await dispatch(thunk(tx.id));
        if (thunk.fulfilled.match(result)) {
            const labels: Record<string, string> = { pause: 'paused', resume: 'resumed', complete: 'completed' };
            showToast(`Return ${tx.licensePlate} ${labels[actionModal]} successfully!`);
            setActionModal(null);
            refresh();
            if (wasComplete) {
                setFinalizeForm({ fedexTracking: '', boxCount: '' });
                setFinalizeStepsDone({ printManifest: false, fedexEntered: false, printJobSheets: false });
                setFinalizeModal(true);
            }
        } else {
            showToast(result.payload as string || `Failed to ${actionModal}`, 'error');
            setActionModal(null);
        }
    };

    const handleUpdate = async () => {
        if (!tx) return;
        const result = await dispatch(updateReturnTransaction({ id: tx.id, payload: editForm }));
        if (updateReturnTransaction.fulfilled.match(result)) {
            showToast('Return updated successfully!');
            setEditModal(false);
            refresh();
        } else {
            showToast(result.payload as string || 'Failed to update', 'error');
        }
    };

    const handleDelete = async () => {
        if (!tx) return;
        const result = await dispatch(deleteReturnTransaction(tx.id));
        if (deleteReturnTransaction.fulfilled.match(result)) {
            showToast(`Return ${tx.licensePlate} deleted!`);
            setDeleteModal(false);
            setTimeout(() => router.push(tx.batchId ? `/warehouse/batches/${tx.batchId}` : '/warehouse/returns'), 1000);
        } else {
            showToast(result.payload as string || 'Failed to delete', 'error');
            setDeleteModal(false);
        }
    };

    // ── Item handlers ───────────────────────────────────────────

    const refreshItems = () => dispatch(fetchTransactionItems({
        transactionId: id,
        returnStatus: itemStatusFilter || undefined,
        search: debouncedItemSearch || undefined,
    }));

    useEffect(() => {
        if (editItemModal) {
            setEditItemForm({
                quantity: String(editItemModal.quantity),
                standardPrice: editItemModal.standardPrice != null ? String(editItemModal.standardPrice) : '',
                returnStatus: editItemModal.returnStatus,
                memo: editItemModal.memo || '',
            });
        }
    }, [editItemModal]);

    const handleDeleteItem = async () => {
        if (!deleteItemModal) return;
        const result = await dispatch(deleteTransactionItem({ transactionId: id, itemId: deleteItemModal.id }));
        if (deleteTransactionItem.fulfilled.match(result)) {
            showToast('Item deleted');
            setDeleteItemModal(null);
            refreshItems();
            refresh();
        } else {
            showToast(result.payload as string || 'Failed to delete item', 'error');
            setDeleteItemModal(null);
        }
    };

    const handleUpdateItem = async () => {
        if (!editItemModal) return;
        const payload: Record<string, any> = {};
        if (editItemForm.quantity) payload.quantity = parseInt(editItemForm.quantity);
        if (editItemForm.standardPrice) payload.standardPrice = parseFloat(editItemForm.standardPrice);
        payload.returnStatus = editItemForm.returnStatus;
        if (editItemForm.memo) payload.memo = editItemForm.memo;

        const result = await dispatch(updateTransactionItem({ transactionId: id, itemId: editItemModal.id, payload }));
        if (updateTransactionItem.fulfilled.match(result)) {
            showToast('Item updated');
            setEditItemModal(null);
            refreshItems();
            refresh();
        } else {
            showToast(result.payload as string || 'Failed to update item', 'error');
        }
    };

    // ── Wine Cellar handlers ────────────────────────────────────

    const openWcModal = async () => {
        if (!tx) return;
        setWcModal(true);
        setWcLoading(true);
        setWcSelected(new Set());
        try {
            const { apiClient } = await import('@/lib/api/apiClient');
            const res = await apiClient.get<{ status: string; data: { items: WineCellarItem[] } }>(
                '/admin/wine-cellar', true, { pharmacy_id: tx.pharmacyId, status: 'ready_to_return', limit: '100' }
            );
            setWcItems(res.data.items || []);
        } catch {
            setWcItems([]);
        }
        setWcLoading(false);
    };

    const toggleWcSelect = (itemId: string) => {
        setWcSelected(prev => {
            const next = new Set(prev);
            if (next.has(itemId)) next.delete(itemId); else next.add(itemId);
            return next;
        });
    };

    const handleAddWcItems = async () => {
        if (wcSelected.size === 0 || !tx) return;
        setWcAdding(true);
        let successCount = 0;
        try {
            const { apiClient } = await import('@/lib/api/apiClient');
            for (const wcId of wcSelected) {
                try {
                    await apiClient.post(`/admin/wine-cellar/${encodeURIComponent(wcId)}/return`, { transactionId: tx.id }, true);
                    successCount++;
                } catch { /* skip failed */ }
            }
        } catch { /* ignore */ }
        setWcAdding(false);
        setWcModal(false);
        if (successCount > 0) {
            showToast(`${successCount} wine cellar item(s) marked as returned!`);
            refreshItems();
            refresh();
        } else {
            showToast('Failed to add wine cellar items', 'error');
        }
    };

    const handleMoveToWineCellar = async (item: ReturnTransactionItem) => {
        if (!tx || !item.expirationDate) {
            showToast('Item must have an expiration date to move to Wine Cellar', 'error');
            return;
        }
        // Calculate expected returnable date: 6 months after expiration
        const exp = new Date(item.expirationDate);
        exp.setMonth(exp.getMonth() + 6);
        const expectedDate = exp.toISOString().split('T')[0];

        const result = await dispatch(moveItemToWineCellar({
            transactionId: tx.id,
            itemId: item.id,
            expectedReturnableDate: expectedDate,
        }));
        if (moveItemToWineCellar.fulfilled.match(result)) {
            showToast(`${item.proprietaryName || item.ndc || 'Item'} moved to Wine Cellar! Returnable after ${expectedDate}`);
            refreshItems();
        } else {
            showToast(result.payload as string || 'Failed to move item to wine cellar', 'error');
        }
    };

    // ── Finalize & Document helpers ─────────────────────────────

    const nonWcItems = items.filter(i => !i.wineCellarId);
    const nonWcReturnableValue = nonWcItems
        .filter(i => i.returnStatus === 'returnable')
        .reduce((sum, i) => sum + (i.estimatedValue ?? 0), 0);
    const nonWcNonReturnableValue = nonWcItems
        .filter(i => i.returnStatus === 'non_returnable')
        .reduce((sum, i) => sum + (i.estimatedValue ?? 0), 0);
    const nonWcTotalValue = nonWcReturnableValue + nonWcNonReturnableValue;

    const tbdItems = items.filter(i => i.returnStatus === 'tbd');
    const ciiItems = items.filter(i => i.deaForm222Required);
    const hasTbdItems = tbdItems.length > 0;
    const hasCiiItems = ciiItems.length > 0;
    const isFinalized = tx ? ['finalized', 'received', 'closed_out'].includes(tx.status) : false;

    const openFinalizeModal = () => {
        if (!tx) return;
        setFinalizeForm({ fedexTracking: tx.fedexTracking || '', boxCount: tx.boxCount ? String(tx.boxCount) : '' });
        setFinalizeStepsDone({
            printManifest: false,
            fedexEntered: !!(tx.fedexTracking),
            printJobSheets: false,
        });
        setFinalizeModal(true);
    };

    const downloadPdf = async (endpoint: string, filename: string) => {
        setPdfLoading(endpoint);
        try {
            const { cookieUtils } = await import('@/lib/utils/cookies');
            const token = cookieUtils.getAuthToken();
            const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';
            const res = await fetch(`${baseUrl}/return-transactions/${encodeURIComponent(id)}/${endpoint}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!res.ok) {
                const err = await res.json().catch(() => ({ message: 'Download failed' }));
                throw new Error(err.message || 'Download failed');
            }
            const blob = await res.blob();
            const url = URL.createObjectURL(blob);
            window.open(url, '_blank');
            setTimeout(() => URL.revokeObjectURL(url), 60000);
        } catch (e: any) {
            showToast(e.message || 'Failed to download document', 'error');
        }
        setPdfLoading(null);
    };

    const handleFinalize = async () => {
        if (!tx) return;
        const fedexTracking = finalizeForm.fedexTracking.trim();
        const boxCount = finalizeForm.boxCount ? parseInt(finalizeForm.boxCount) : undefined;
        if (!fedexTracking) {
            showToast('FedEx tracking number is required', 'error');
            return;
        }
        const result = await dispatch(finalizeReturnTransaction({ id: tx.id, fedexTracking, boxCount }));
        if (finalizeReturnTransaction.fulfilled.match(result)) {
            showToast(`Return ${tx.licensePlate} finalized successfully!`);
            setFinalizeModal(false);
            refresh();
        } else {
            showToast(result.payload as string || 'Failed to finalize return', 'error');
        }
    };

    const canFinalize = finalizeStepsDone.printManifest
        && finalizeStepsDone.fedexEntered
        && finalizeForm.fedexTracking.trim().length > 0
        && finalizeStepsDone.printJobSheets
        && !hasTbdItems;

    function getItemStatusBadge(status: string): { variant: 'success' | 'warning' | 'danger' | 'default'; label: string } {
        switch (status) {
            case 'returnable': return { variant: 'success', label: 'Returnable' };
            case 'non_returnable': return { variant: 'danger', label: 'Non-Returnable' };
            case 'tbd': return { variant: 'warning', label: 'TBD' };
            default: return { variant: 'default', label: status };
        }
    }

    // ── Loading / Error States ─────────────────────────────────

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-96">
                <Loader2 className="w-10 h-10 animate-spin text-primary-600" />
            </div>
        );
    }

    if (error || !tx) {
        return (
            <div className="space-y-4">
                <button onClick={() => router.push(tx?.batchId ? `/warehouse/batches/${tx.batchId}` : '/warehouse/returns')} className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-800">
                    <ArrowLeft className="w-4 h-4" /> Back to {tx?.batchId ? 'Batch' : 'Returns'}
                </button>
                <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
                    <AlertCircle className="w-10 h-10 text-red-500 mx-auto mb-3" />
                    <p className="text-red-800 font-medium">{error || 'Return transaction not found.'}</p>
                    <Button variant="outline" className="mt-4" onClick={() => router.push('/warehouse/returns')}>Go Back</Button>
                </div>
            </div>
        );
    }

    const badge = getStatusBadge(tx.status);

    return (
        <div className="space-y-6">
            <ToastContainer toasts={toasts} removeToast={removeToast} />

            {/* Back + Header */}
            <div>
                <button onClick={() => router.push(tx.batchId ? `/warehouse/batches/${tx.batchId}` : '/warehouse/returns')} className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-800 mb-3">
                    <ArrowLeft className="w-4 h-4" /> Back to {tx.batchId ? 'Batch' : 'Returns'}
                </button>
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                    <div className="flex items-center gap-3">
                        <h1 className="text-xl sm:text-2xl font-bold font-mono text-gray-900">{tx.licensePlate}</h1>
                        <Badge variant={badge.variant}>{badge.label}</Badge>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {canDoAction(tx, 'edit') && (
                            <Button variant="outline" size="sm" onClick={() => setEditModal(true)}>
                                <Edit className="w-4 h-4 mr-1" /> Edit
                            </Button>
                        )}
                        {canDoAction(tx, 'pause') && (
                            <Button variant="warning" size="sm" onClick={() => setActionModal('pause')}>
                                <Pause className="w-4 h-4 mr-1" /> Pause
                            </Button>
                        )}
                        {canDoAction(tx, 'resume') && (
                            <Button variant="success" size="sm" onClick={() => setActionModal('resume')}>
                                <Play className="w-4 h-4 mr-1" /> Resume
                            </Button>
                        )}
                        {canDoAction(tx, 'complete') && (
                            <Button variant="primary" size="sm" onClick={() => setActionModal('complete')}>
                                <CheckCircle className="w-4 h-4 mr-1" /> Complete
                            </Button>
                        )}
                        {canDoAction(tx, 'finalize') && (
                            <Button variant="danger" size="sm" onClick={openFinalizeModal}>
                                <Lock className="w-4 h-4 mr-1" /> Finalize
                            </Button>
                        )}
                        {canDoAction(tx, 'delete') && (
                            <Button variant="danger" size="sm" onClick={() => setDeleteModal(true)}>
                                <Trash2 className="w-4 h-4 mr-1" /> Delete
                            </Button>
                        )}
                    </div>
                </div>
            </div>

            {/* Detail Cards */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* General Info */}
                <div className="bg-white rounded-lg shadow-md p-5">
                    <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                        <ClipboardList className="w-4 h-4" /> General Information
                    </h2>
                    <dl className="space-y-3 text-sm">
                        <div className="flex justify-between">
                            <dt className="text-gray-500">License Plate</dt>
                            <dd className="font-mono font-semibold text-gray-900">{tx.licensePlate}</dd>
                        </div>
                        <div className="flex justify-between">
                            <dt className="text-gray-500">Service Type</dt>
                            <dd className="text-gray-900">{tx.serviceType.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}</dd>
                        </div>
                        <div className="flex justify-between">
                            <dt className="text-gray-500">Created</dt>
                            <dd className="text-gray-900">{formatDate(tx.createdAt)}</dd>
                        </div>
                        <div className="flex justify-between">
                            <dt className="text-gray-500">Last Updated</dt>
                            <dd className="text-gray-900">{formatDate(tx.updatedAt)}</dd>
                        </div>
                        {tx.finalizedAt && (
                            <div className="flex justify-between">
                                <dt className="text-gray-500">Finalized</dt>
                                <dd className="text-gray-900">{formatDate(tx.finalizedAt)}</dd>
                            </div>
                        )}
                        {tx.notes && (
                            <div className="pt-2 border-t border-gray-100">
                                <dt className="text-gray-500 mb-1">Notes</dt>
                                <dd className="text-gray-700">{tx.notes}</dd>
                            </div>
                        )}
                    </dl>
                </div>

                {/* Store & Processor */}
                <div className="bg-white rounded-lg shadow-md p-5">
                    <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                        <Building2 className="w-4 h-4" /> Store & Processor
                    </h2>
                    <dl className="space-y-3 text-sm">
                        <div className="flex justify-between">
                            <dt className="text-gray-500">Store Name</dt>
                            <dd className="font-medium text-gray-900">{tx.pharmacyName || '—'}</dd>
                        </div>
                        <div className="flex justify-between">
                            <dt className="text-gray-500">Processor</dt>
                            <dd className="text-gray-900 flex items-center gap-1">
                                <UserCog className="w-3.5 h-3.5 text-gray-400" /> {tx.processorName || '—'}
                            </dd>
                        </div>
                    </dl>
                </div>

                {/* Values */}
                <div className="bg-white rounded-lg shadow-md p-5">
                    <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                        <Package className="w-4 h-4" /> Items & Values
                    </h2>
                    <dl className="space-y-3 text-sm">
                        <div className="flex justify-between">
                            <dt className="text-gray-500">Total Items</dt>
                            <dd className="font-semibold text-gray-900">{nonWcItems.length}</dd>
                        </div>
                        <div className="flex justify-between">
                            <dt className="text-gray-500">Returnable Value</dt>
                            <dd className="font-semibold text-green-700">{formatCurrency(nonWcReturnableValue)}</dd>
                        </div>
                        <div className="flex justify-between">
                            <dt className="text-gray-500">Non-Returnable Value</dt>
                            <dd className="font-semibold text-red-700">{formatCurrency(nonWcNonReturnableValue)}</dd>
                        </div>
                        <div className="flex justify-between pt-2 border-t border-gray-100">
                            <dt className="text-gray-500 font-medium">Total Value</dt>
                            <dd className="font-bold text-gray-900">{formatCurrency(nonWcTotalValue)}</dd>
                        </div>
                    </dl>
                </div>

                {/* Shipping & Times */}
                <div className="bg-white rounded-lg shadow-md p-5">
                    <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                        <Truck className="w-4 h-4" /> Shipping & Processing
                    </h2>
                    <dl className="space-y-3 text-sm">
                        <div className="flex justify-between">
                            <dt className="text-gray-500">FedEx Tracking</dt>
                            <dd className="text-gray-900 font-mono text-xs">{tx.fedexTracking || '—'}</dd>
                        </div>
                        <div className="flex justify-between">
                            <dt className="text-gray-500">Pickup Confirmation</dt>
                            <dd className="text-gray-900">{tx.fedexPickupConfirmation || '—'}</dd>
                        </div>
                        <div className="flex justify-between">
                            <dt className="text-gray-500 flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> Time In</dt>
                            <dd className="text-gray-900">{tx.timeIn ? formatDate(tx.timeIn) : '—'}</dd>
                        </div>
                        <div className="flex justify-between">
                            <dt className="text-gray-500 flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> Time Out</dt>
                            <dd className="text-gray-900">{tx.timeOut ? formatDate(tx.timeOut) : '—'}</dd>
                        </div>
                        {tx.receivedInWarehouseDate && (
                            <div className="flex justify-between">
                                <dt className="text-gray-500">Received in Warehouse</dt>
                                <dd className="text-gray-900">{formatDate(tx.receivedInWarehouseDate)}</dd>
                            </div>
                        )}
                        <div className="flex justify-between">
                            <dt className="text-gray-500">Verified Integrity</dt>
                            <dd className="text-gray-900">{tx.verifiedIntegrity ? 'Yes' : 'No'}</dd>
                        </div>
                        {tx.boxCount != null && (
                            <div className="flex justify-between">
                                <dt className="text-gray-500">Box Count</dt>
                                <dd className="text-gray-900 font-semibold">{tx.boxCount}</dd>
                            </div>
                        )}
                    </dl>
                </div>
            </div>

            {/* ── Documents Section (post-finalization) ──────── */}
            {isFinalized && (
                <div className="bg-white rounded-lg shadow-md p-5">
                    <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                        <FileText className="w-4 h-4" /> Documents
                    </h2>
                    <div className="flex flex-wrap gap-3">
                        <button
                            onClick={() => downloadPdf('manifest', `manifest-${tx.licensePlate}.pdf`)}
                            disabled={pdfLoading === 'manifest'}
                            className="flex items-center gap-2 px-4 py-2.5 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg text-sm text-blue-700 font-medium transition-colors disabled:opacity-50"
                        >
                            {pdfLoading === 'manifest' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                            Download Manifest
                        </button>
                        {/* <button
                            onClick={() => downloadPdf('dea-form-222', `dea-form-222-${tx.licensePlate}.pdf`)}
                            disabled={pdfLoading === 'dea-form-222'}
                            className="flex items-center gap-2 px-4 py-2.5 bg-orange-50 hover:bg-orange-100 border border-orange-200 rounded-lg text-sm text-orange-700 font-medium transition-colors disabled:opacity-50"
                        >
                            {pdfLoading === 'dea-form-222' ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
                            DEA Form 222
                        </button> */}
                    </div>
                    {tx.manifestGeneratedAt && (
                        <p className="text-xs text-gray-400 mt-3">Manifest last generated: {formatDate(tx.manifestGeneratedAt)}</p>
                    )}
                </div>
            )}

            {/* ── Items Section ──────────────────────────────── */}
            <div className="bg-white rounded-lg shadow-md p-5">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
                    <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-2">
                        <ScanLine className="w-4 h-4" /> Products ({nonWcItems.length})
                    </h2>
                    {canDoAction(tx, 'edit') && (
                        <div className="flex gap-2">
                            <Button variant="primary" size="sm" onClick={() => router.push(`/warehouse/returns/${id}/add-items`)}>
                                <Plus className="w-4 h-4 mr-1" /> Add Items
                            </Button>
                            <Button variant="outline" size="sm" onClick={openWcModal}>
                                <Archive className="w-4 h-4 mr-1" /> Wine Cellar Items
                            </Button>
                        </div>
                    )}
                </div>

                {/* Summary Bar */}
                {nonWcItems.length > 0 && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                        <div className="bg-gray-50 rounded-lg p-2.5 text-center">
                            <p className="text-xs text-gray-500">Items</p>
                            <p className="text-sm font-bold text-gray-900">{nonWcItems.length}</p>
                        </div>
                        <div className="bg-green-50 rounded-lg p-2.5 text-center">
                            <p className="text-xs text-green-600">Returnable</p>
                            <p className="text-sm font-bold text-green-800">{formatCurrency(nonWcReturnableValue)}</p>
                        </div>
                        <div className="bg-red-50 rounded-lg p-2.5 text-center">
                            <p className="text-xs text-red-600">Non-Returnable</p>
                            <p className="text-sm font-bold text-red-800">{formatCurrency(nonWcNonReturnableValue)}</p>
                        </div>
                        <div className="bg-blue-50 rounded-lg p-2.5 text-center">
                            <p className="text-xs text-blue-600">Total Value</p>
                            <p className="text-sm font-bold text-blue-800">{formatCurrency(nonWcTotalValue)}</p>
                        </div>
                    </div>
                )}

                {/* Items Filters */}
                <div className="flex flex-col sm:flex-row gap-2 mb-3">
                    <div className="relative flex-1">
                        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            value={itemSearch}
                            onChange={e => setItemSearch(e.target.value)}
                            placeholder="Search by NDC, name, manufacturer, lot..."
                            className="w-full pl-9 pr-4 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                        />
                    </div>
                    <select
                        value={itemStatusFilter}
                        onChange={e => setItemStatusFilter(e.target.value)}
                        className="px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    >
                        <option value="">All Statuses</option>
                        <option value="returnable">Returnable</option>
                        <option value="non_returnable">Non-Returnable</option>
                        <option value="tbd">TBD</option>
                    </select>
                </div>

                {/* Items Table */}
                {isItemsLoading ? (
                    <div className="flex justify-center py-8">
                        <Loader2 className="w-6 h-6 animate-spin text-primary-600" />
                    </div>
                ) : nonWcItems.length === 0 ? (
                    <div className="text-center py-8">
                        <Package className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                        <p className="text-gray-500 text-sm font-medium">No items yet</p>
                        {canDoAction(tx, 'edit') && (
                            <Button variant="primary" size="sm" className="mt-3" onClick={() => router.push(`/warehouse/returns/${id}/add-items`)}>
                                <Plus className="w-4 h-4 mr-1" /> Start Scanning
                            </Button>
                        )}
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full table-auto text-xs">
                            <thead>
                                <tr className="bg-gray-50 border-b border-gray-200">
                                    <th className="text-left px-2 py-2 font-medium text-gray-500 uppercase tracking-wider">NDC</th>
                                    <th className="text-left px-2 py-2 font-medium text-gray-500 uppercase tracking-wider">Name</th>
                                    <th className="text-left px-2 py-2 font-medium text-gray-500 uppercase tracking-wider">Manufacturer</th>
                                    <th className="text-center px-2 py-2 font-medium text-gray-500 uppercase tracking-wider">QTY</th>
                                    <th className="text-right px-2 py-2 font-medium text-gray-500 uppercase tracking-wider">Price</th>
                                    <th className="text-right px-2 py-2 font-medium text-gray-500 uppercase tracking-wider">Est. Value</th>
                                    <th className="text-left px-2 py-2 font-medium text-gray-500 uppercase tracking-wider">Expires</th>
                                    <th className="text-left px-2 py-2 font-medium text-gray-500 uppercase tracking-wider">Lot</th>
                                    <th className="text-left px-2 py-2 font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                    <th className="text-right px-2 py-2 font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {nonWcItems.map((item) => {
                                    const sBadge = getItemStatusBadge(item.returnStatus);
                                    return (
                                        <tr key={item.id} className="border-b border-gray-100 hover:bg-gray-50">
                                            <td className="px-2 py-2 font-mono text-gray-900">{item.ndc || '—'}</td>
                                            <td className="px-2 py-2 text-gray-900 max-w-[140px] truncate" title={item.proprietaryName || ''}>
                                                {item.proprietaryName || item.genericName || '—'}
                                            </td>
                                            <td className="px-2 py-2 text-gray-600 max-w-[120px] truncate" title={item.manufacturer || ''}>
                                                {item.manufacturer || '—'}
                                            </td>
                                            <td className="px-2 py-2 text-center text-gray-900">
                                                {item.quantity}{item.isPartial && <span className="text-yellow-600 ml-0.5">P</span>}
                                            </td>
                                            <td className="px-2 py-2 text-right text-gray-900">
                                                {item.standardPrice != null ? formatCurrency(item.standardPrice) : '—'}
                                            </td>
                                            <td className="px-2 py-2 text-right font-medium text-gray-900">
                                                {item.estimatedValue != null ? formatCurrency(item.estimatedValue) : '—'}
                                            </td>
                                            <td className="px-2 py-2 text-gray-600">
                                                {item.expirationDate ? formatDate(item.expirationDate) : '—'}
                                            </td>
                                            <td className="px-2 py-2 text-gray-600 font-mono">{item.lotNumber || '—'}</td>
                                            <td className="px-2 py-2">
                                                <div className="flex items-center gap-1">
                                                    <Badge variant={sBadge.variant}>{sBadge.label}</Badge>
                                                    {item.wineCellarId && (
                                                        <Badge variant="info">
                                                            <Archive className="w-3 h-3 mr-0.5 inline" />WC
                                                        </Badge>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-2 py-2">
                                                <div className="flex items-center justify-end gap-1">
                                                    {canDoAction(tx, 'edit') && item.nonReturnableReason === 'date' && !item.wineCellarId && (
                                                        <button
                                                            onClick={() => handleMoveToWineCellar(item)}
                                                            className="p-1 text-gray-500 hover:text-purple-600 hover:bg-purple-50 rounded"
                                                            title="Move to Wine Cellar"
                                                        >
                                                            <Archive className="w-3.5 h-3.5" />
                                                        </button>
                                                    )}
                                                    {canDoAction(tx, 'edit') && (
                                                        <button
                                                            onClick={() => setEditItemModal(item)}
                                                            className="p-1 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded"
                                                            title="Edit item"
                                                        >
                                                            <Edit className="w-3.5 h-3.5" />
                                                        </button>
                                                    )}
                                                    {canDoAction(tx, 'edit') && (
                                                        <button
                                                            onClick={() => setDeleteItemModal(item)}
                                                            className="p-1 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded"
                                                            title="Delete item"
                                                        >
                                                            <Trash2 className="w-3.5 h-3.5" />
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* ── Edit Item Modal ───────────────────────────── */}
            {editItemModal && (
                <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-md flex items-center justify-center z-50 p-4" onClick={() => setEditItemModal(null)}>
                    <div className="bg-white rounded-lg max-w-md w-full shadow-xl" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between p-5 border-b border-gray-200 bg-gray-50">
                            <h2 className="text-lg font-semibold text-gray-900">Edit Item</h2>
                            <button onClick={() => setEditItemModal(null)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
                        </div>
                        <div className="p-5">
                            <p className="text-xs text-gray-500 mb-3">{editItemModal.proprietaryName || editItemModal.ndc} — Lot: {editItemModal.lotNumber || '—'}</p>
                            <div className="space-y-3">
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-xs font-medium text-gray-700 mb-1">Quantity</label>
                                        <input type="number" min="1" value={editItemForm.quantity} onChange={e => setEditItemForm({ ...editItemForm, quantity: e.target.value })} className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-gray-700 mb-1">Price ($)</label>
                                        <input type="number" step="0.01" min="0" value={editItemForm.standardPrice} onChange={e => setEditItemForm({ ...editItemForm, standardPrice: e.target.value })} className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500" />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">Return Status</label>
                                    <select value={editItemForm.returnStatus} onChange={e => setEditItemForm({ ...editItemForm, returnStatus: e.target.value })} className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500">
                                        <option value="tbd">TBD</option>
                                        <option value="returnable">Returnable</option>
                                        <option value="non_returnable">Non-Returnable</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">Memo</label>
                                    <input type="text" value={editItemForm.memo} onChange={e => setEditItemForm({ ...editItemForm, memo: e.target.value })} placeholder="Optional memo" className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500" />
                                </div>
                            </div>
                        </div>
                        <div className="flex justify-end gap-2 p-5 border-t border-gray-200 bg-gray-50">
                            <Button variant="outline" onClick={() => setEditItemModal(null)}>Cancel</Button>
                            <Button variant="primary" onClick={handleUpdateItem} disabled={isItemActionLoading}>
                                {isItemActionLoading ? <><Loader2 className="w-4 h-4 animate-spin mr-1" />Saving...</> : 'Save'}
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Delete Item Modal ────────────────────────── */}
            {deleteItemModal && (
                <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-md flex items-center justify-center z-50 p-4" onClick={() => setDeleteItemModal(null)}>
                    <div className="bg-white rounded-lg max-w-md w-full shadow-xl" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between p-5 border-b border-gray-200 bg-gray-50">
                            <h2 className="text-lg font-semibold text-gray-900">Delete Item</h2>
                            <button onClick={() => setDeleteItemModal(null)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
                        </div>
                        <div className="p-6">
                            <p className="text-gray-700">
                                Delete <strong>{deleteItemModal.proprietaryName || deleteItemModal.ndc || 'this item'}</strong>
                                {deleteItemModal.lotNumber && <> (Lot: {deleteItemModal.lotNumber})</>}?
                            </p>
                        </div>
                        <div className="flex justify-end gap-2 p-5 border-t border-gray-200 bg-gray-50">
                            <Button variant="outline" onClick={() => setDeleteItemModal(null)}>Cancel</Button>
                            <Button variant="danger" onClick={handleDeleteItem} disabled={isItemActionLoading}>
                                {isItemActionLoading ? <><Loader2 className="w-4 h-4 animate-spin mr-1" />Deleting...</> : 'Delete'}
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Edit Modal ────────────────────────────────── */}
            {editModal && (
                <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-md flex items-center justify-center z-50 p-4" onClick={() => setEditModal(false)}>
                    <div className="bg-white rounded-lg max-w-lg w-full shadow-xl" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between p-5 border-b border-gray-200 bg-gray-50">
                            <h2 className="text-lg font-semibold text-gray-900">Edit Return — {tx.licensePlate}</h2>
                            <button onClick={() => setEditModal(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
                        </div>
                        <div className="p-6 space-y-3">
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">FedEx Tracking Number</label>
                                <input
                                    type="text"
                                    value={editForm.fedexTracking}
                                    onChange={e => setEditForm({ ...editForm, fedexTracking: e.target.value })}
                                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                                    placeholder="Enter tracking number"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">FedEx Pickup Confirmation</label>
                                <input
                                    type="text"
                                    value={editForm.fedexPickupConfirmation}
                                    onChange={e => setEditForm({ ...editForm, fedexPickupConfirmation: e.target.value })}
                                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                                    placeholder="Enter pickup confirmation"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Notes</label>
                                <textarea
                                    value={editForm.notes}
                                    onChange={e => setEditForm({ ...editForm, notes: e.target.value })}
                                    rows={3}
                                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
                                    placeholder="Optional notes"
                                />
                            </div>
                        </div>
                        <div className="flex justify-end gap-2 p-5 border-t border-gray-200 bg-gray-50">
                            <Button variant="outline" onClick={() => setEditModal(false)}>Cancel</Button>
                            <Button variant="primary" onClick={handleUpdate} disabled={isActionLoading}>
                                {isActionLoading ? <><Loader2 className="w-4 h-4 animate-spin mr-1" />Saving...</> : 'Save Changes'}
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Status Action Modal ──────────────────────── */}
            {actionModal && (
                <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-md flex items-center justify-center z-50 p-4" onClick={() => setActionModal(null)}>
                    <div className="bg-white rounded-lg max-w-md w-full shadow-xl" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between p-5 border-b border-gray-200 bg-gray-50">
                            <h2 className="text-lg font-semibold text-gray-900">
                                {actionModal === 'pause' && 'Pause Return'}
                                {actionModal === 'resume' && 'Resume Return'}
                                {actionModal === 'complete' && 'Mark as Completed'}
                            </h2>
                            <button onClick={() => setActionModal(null)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
                        </div>
                        <div className="p-6">
                            <p className="text-gray-700">
                                Are you sure you want to <strong>{actionModal}</strong> return <strong>{tx.licensePlate}</strong>?
                            </p>
                        </div>
                        <div className="flex justify-end gap-2 p-5 border-t border-gray-200 bg-gray-50">
                            <Button variant="outline" onClick={() => setActionModal(null)}>Cancel</Button>
                            <Button variant="primary" onClick={handleStatusAction} disabled={isActionLoading}>
                                {isActionLoading ? <><Loader2 className="w-4 h-4 animate-spin mr-1" />Processing...</> : 'Confirm'}
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Delete Modal ─────────────────────────────── */}
            {deleteModal && (
                <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-md flex items-center justify-center z-50 p-4" onClick={() => setDeleteModal(false)}>
                    <div className="bg-white rounded-lg max-w-md w-full shadow-xl" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between p-5 border-b border-gray-200 bg-gray-50">
                            <h2 className="text-lg font-semibold text-gray-900">Delete Return</h2>
                            <button onClick={() => setDeleteModal(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
                        </div>
                        <div className="p-6">
                            <p className="text-gray-700">
                                Are you sure you want to delete return <strong>{tx.licensePlate}</strong>? This action cannot be undone.
                            </p>
                        </div>
                        <div className="flex justify-end gap-2 p-5 border-t border-gray-200 bg-gray-50">
                            <Button variant="outline" onClick={() => setDeleteModal(false)}>Cancel</Button>
                            <Button variant="danger" onClick={handleDelete} disabled={isActionLoading}>
                                {isActionLoading ? <><Loader2 className="w-4 h-4 animate-spin mr-1" />Deleting...</> : 'Delete'}
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Finalize Return Modal ──────────────────── */}
            {finalizeModal && (
                <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-md flex items-center justify-center z-50 p-4" onClick={() => setFinalizeModal(false)}>
                    <div className="bg-white rounded-lg max-w-xl w-full shadow-xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>

                        {/* Header */}
                        <div className="flex items-center justify-between p-5 border-b border-gray-200 bg-gray-50">
                            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                                <Lock className="w-5 h-5 text-red-600" /> Finalize Return — {tx.licensePlate}
                            </h2>
                            <button onClick={() => setFinalizeModal(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
                        </div>

                        <div className="p-5 flex-1 overflow-y-auto space-y-3">

                            {/* TBD blocker */}
                            {hasTbdItems && (
                                <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
                                    <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                                    <div>
                                        <p className="text-sm font-medium text-red-800">
                                            {tbdItems.length} item{tbdItems.length !== 1 ? 's' : ''} still have TBD status
                                        </p>
                                        <p className="text-xs text-red-700 mt-0.5">
                                            Resolve all TBD items before finalizing.
                                        </p>
                                    </div>
                                </div>
                            )}

                            {/* ── Step 1: Print Itemized Return ── */}
                            <div className={`border rounded-lg p-4 transition-colors ${finalizeStepsDone.printManifest ? 'border-green-200 bg-green-50' : 'border-gray-200 bg-white'}`}>
                                <div className="flex items-start gap-3">
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 font-bold text-sm ${finalizeStepsDone.printManifest ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-600'}`}>
                                        {finalizeStepsDone.printManifest ? <CheckCircle className="w-4 h-4" /> : '1'}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className={`text-sm font-semibold ${finalizeStepsDone.printManifest ? 'text-green-800' : 'text-gray-800'}`}>
                                            Print Itemized Return
                                        </p>
                                        <p className="text-xs text-gray-500 mt-0.5">Print the full list of all items included in this return.</p>
                                        <div className="flex items-center gap-3 mt-2">
                                            <button
                                                onClick={() => {
                                                    downloadPdf('manifest', `manifest-${tx.licensePlate}.pdf`);
                                                    setFinalizeStepsDone(prev => ({ ...prev, printManifest: true }));
                                                }}
                                                disabled={pdfLoading === 'manifest'}
                                                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-md transition-colors disabled:opacity-50"
                                            >
                                                {pdfLoading === 'manifest' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Printer className="w-3.5 h-3.5" />}
                                                Print
                                            </button>
                                            {finalizeStepsDone.printManifest && (
                                                <span className="text-xs text-green-700 font-medium flex items-center gap-1">
                                                    <CheckCircle className="w-3.5 h-3.5" /> Done
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* ── Step 2: Enter FedEx Tracking ── */}
                            <div className={`border rounded-lg p-4 transition-colors ${finalizeStepsDone.fedexEntered && finalizeForm.fedexTracking.trim() ? 'border-green-200 bg-green-50' : 'border-gray-200 bg-white'}`}>
                                <div className="flex items-start gap-3">
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 font-bold text-sm ${finalizeStepsDone.fedexEntered && finalizeForm.fedexTracking.trim() ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-600'}`}>
                                        {finalizeStepsDone.fedexEntered && finalizeForm.fedexTracking.trim() ? <CheckCircle className="w-4 h-4" /> : '2'}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className={`text-sm font-semibold ${finalizeStepsDone.fedexEntered && finalizeForm.fedexTracking.trim() ? 'text-green-800' : 'text-gray-800'}`}>
                                            Enter FedEx Tracking
                                        </p>
                                        <p className="text-xs text-gray-500 mt-0.5">Enter the FedEx tracking number for this shipment.</p>
                                        <div className="mt-2 space-y-2">
                                            <div>
                                                <label className="block text-xs font-medium text-gray-700 mb-1">
                                                    Tracking Number <span className="text-red-500">*</span>
                                                </label>
                                                <input
                                                    type="text"
                                                    value={finalizeForm.fedexTracking}
                                                    onChange={e => {
                                                        const val = e.target.value;
                                                        setFinalizeForm(prev => ({ ...prev, fedexTracking: val }));
                                                        setFinalizeStepsDone(prev => ({ ...prev, fedexEntered: val.trim().length > 0 }));
                                                    }}
                                                    placeholder="Enter FedEx tracking number"
                                                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 font-mono"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-medium text-gray-700 mb-1">Box Count</label>
                                                <input
                                                    type="number"
                                                    min="1"
                                                    value={finalizeForm.boxCount}
                                                    onChange={e => setFinalizeForm(prev => ({ ...prev, boxCount: e.target.value }))}
                                                    placeholder="Number of boxes"
                                                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* ── Step 3: Print Job Sheets ── */}
                            <div className={`border rounded-lg p-4 transition-colors ${finalizeStepsDone.printJobSheets ? 'border-green-200 bg-green-50' : 'border-gray-200 bg-white'}`}>
                                <div className="flex items-start gap-3">
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 font-bold text-sm ${finalizeStepsDone.printJobSheets ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-600'}`}>
                                        {finalizeStepsDone.printJobSheets ? <CheckCircle className="w-4 h-4" /> : '3'}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className={`text-sm font-semibold ${finalizeStepsDone.printJobSheets ? 'text-green-800' : 'text-gray-800'}`}>
                                            Print Job Sheets
                                        </p>
                                        <p className="text-xs text-gray-500 mt-0.5">Print job sheets for all outgoing boxes.</p>
                                        <div className="flex items-center gap-3 mt-2">
                                            {hasCiiItems && (
                                                <button
                                                    onClick={() => {
                                                        downloadPdf('dea-form-222', `dea-form-222-${tx.licensePlate}.pdf`);
                                                        setFinalizeStepsDone(prev => ({ ...prev, printJobSheets: true }));
                                                    }}
                                                    disabled={pdfLoading === 'dea-form-222'}
                                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-600 hover:bg-orange-700 text-white text-xs font-medium rounded-md transition-colors disabled:opacity-50"
                                                >
                                                    {pdfLoading === 'dea-form-222' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileText className="w-3.5 h-3.5" />}
                                                    Print DEA Form 222
                                                </button>
                                            )}
                                            <label className="flex items-center gap-2 cursor-pointer select-none">
                                                <input
                                                    type="checkbox"
                                                    checked={finalizeStepsDone.printJobSheets}
                                                    onChange={e => setFinalizeStepsDone(prev => ({ ...prev, printJobSheets: e.target.checked }))}
                                                    className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                                                />
                                                <span className="text-xs text-gray-700">Job sheets printed</span>
                                            </label>
                                            {finalizeStepsDone.printJobSheets && (
                                                <span className="text-xs text-green-700 font-medium flex items-center gap-1">
                                                    <CheckCircle className="w-3.5 h-3.5" /> Done
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* ── Step 4: Finalize Return ── */}
                            <div className={`border-2 rounded-lg p-4 transition-colors ${canFinalize ? 'border-green-200 bg-green-50' : 'border-dashed border-gray-200 bg-gray-50'}`}>
                                <div className="flex items-start gap-3">
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 font-bold text-sm ${canFinalize ? 'bg-green-500 text-white' : 'bg-gray-300 text-gray-500'}`}>
                                        {canFinalize ? <CheckCircle className="w-4 h-4" /> : '4'}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className={`text-sm font-semibold ${canFinalize ? 'text-green-800' : 'text-gray-400'}`}>
                                            Finalize Return
                                        </p>
                                        <p className={`text-xs mt-0.5 ${canFinalize ? 'text-green-700' : 'text-gray-400'}`}>
                                            Lock this return permanently. This cannot be undone.
                                        </p>
                                        {!canFinalize && (
                                            <p className="text-xs text-gray-400 mt-1">Complete steps 1 – 3 above to enable finalization.</p>
                                        )}
                                        {canFinalize && (
                                            <div className="mt-3">
                                                <div className="bg-yellow-50 border border-yellow-200 rounded-md p-2 flex items-start gap-1.5 mb-3">
                                                    <AlertTriangle className="w-4 h-4 text-yellow-600 flex-shrink-0 mt-0.5" />
                                                    <p className="text-xs text-yellow-800">
                                                        Once finalized, items and shipping details can no longer be edited.
                                                    </p>
                                                </div>
                                                <Button variant="primary" onClick={handleFinalize} disabled={isActionLoading || !canFinalize}>
                                                    {isActionLoading
                                                        ? <><Loader2 className="w-4 h-4 animate-spin mr-1" />Finalizing...</>
                                                        : <><Lock className="w-4 h-4 mr-1" />Finalize Return</>
                                                    }
                                                </Button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                        </div>

                        <div className="flex justify-end p-4 border-t border-gray-200 bg-gray-50">
                            <Button variant="outline" onClick={() => setFinalizeModal(false)}>Cancel</Button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Wine Cellar Modal ────────────────────────── */}
            {wcModal && (
                <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-md flex items-center justify-center z-50 p-4" onClick={() => setWcModal(false)}>
                    <div className="bg-white rounded-lg max-w-2xl w-full shadow-xl max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between p-5 border-b border-gray-200 bg-gray-50">
                            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                                <Archive className="w-5 h-5 text-purple-600" /> Add Wine Cellar Items
                            </h2>
                            <button onClick={() => setWcModal(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
                        </div>
                        <div className="p-5 flex-1 overflow-y-auto">
                            {wcLoading ? (
                                <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary-600" /></div>
                            ) : wcItems.length === 0 ? (
                                <div className="text-center py-12">
                                    <Archive className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                                    <p className="text-gray-500 text-sm font-medium">No wine cellar items ready to return</p>
                                    <p className="text-gray-400 text-xs mt-1">Items with &quot;Ready to Return&quot; status for this pharmacy will appear here.</p>
                                </div>
                            ) : (
                                <>
                                    <p className="text-xs text-gray-500 mb-3">
                                        Select items to add to this return. {wcSelected.size > 0 && <strong>{wcSelected.size} selected</strong>}
                                    </p>
                                    <div className="overflow-x-auto">
                                        <table className="w-full table-auto text-xs">
                                            <thead>
                                                <tr className="bg-purple-50 border-b border-purple-200">
                                                    <th className="px-3 py-2 w-8">
                                                        <input
                                                            type="checkbox"
                                                            checked={wcSelected.size === wcItems.length && wcItems.length > 0}
                                                            onChange={() => {
                                                                if (wcSelected.size === wcItems.length) {
                                                                    setWcSelected(new Set());
                                                                } else {
                                                                    setWcSelected(new Set(wcItems.map(i => i.id)));
                                                                }
                                                            }}
                                                            className="rounded text-purple-600 focus:ring-purple-500"
                                                        />
                                                    </th>
                                                    <th className="text-left px-3 py-2 font-medium text-purple-700">NDC</th>
                                                    <th className="text-left px-3 py-2 font-medium text-purple-700">Product</th>
                                                    <th className="text-center px-3 py-2 font-medium text-purple-700">QTY</th>
                                                    <th className="text-right px-3 py-2 font-medium text-purple-700">Price</th>
                                                    <th className="text-left px-3 py-2 font-medium text-purple-700">Shelved</th>
                                                    <th className="text-left px-3 py-2 font-medium text-purple-700">Location</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {wcItems.map(item => (
                                                    <tr
                                                        key={item.id}
                                                        className={`border-b border-gray-100 cursor-pointer transition-colors ${wcSelected.has(item.id) ? 'bg-purple-50' : 'hover:bg-gray-50'}`}
                                                        onClick={() => toggleWcSelect(item.id)}
                                                    >
                                                        <td className="px-3 py-2">
                                                            <input
                                                                type="checkbox"
                                                                checked={wcSelected.has(item.id)}
                                                                onChange={() => toggleWcSelect(item.id)}
                                                                className="rounded text-purple-600 focus:ring-purple-500"
                                                            />
                                                        </td>
                                                        <td className="px-3 py-2 font-mono text-gray-900">{item.ndc || '—'}</td>
                                                        <td className="px-3 py-2 text-gray-900 max-w-[140px] truncate" title={item.productName || ''}>
                                                            <div>
                                                                <p className="truncate">{item.productName || '—'}</p>
                                                                {item.manufacturer && <p className="text-gray-400 text-[10px] truncate">{item.manufacturer}</p>}
                                                            </div>
                                                        </td>
                                                        <td className="px-3 py-2 text-center text-gray-900">{item.quantity}</td>
                                                        <td className="px-3 py-2 text-right text-gray-900">
                                                            {item.standardPrice != null ? formatCurrency(item.standardPrice) : '—'}
                                                        </td>
                                                        <td className="px-3 py-2 text-gray-600">{formatDate(item.dateShelved)}</td>
                                                        <td className="px-3 py-2 text-gray-600">{item.physicalLocation || '—'}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </>
                            )}
                        </div>
                        <div className="flex justify-end gap-2 p-5 border-t border-gray-200 bg-gray-50">
                            <Button variant="outline" onClick={() => setWcModal(false)}>Cancel</Button>
                            <Button variant="primary" onClick={handleAddWcItems} disabled={wcAdding || wcSelected.size === 0}>
                                {wcAdding ? <><Loader2 className="w-4 h-4 animate-spin mr-1" />Adding...</> : `Add ${wcSelected.size} Item${wcSelected.size !== 1 ? 's' : ''}`}
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
