'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import {
    ArrowLeft, Loader2, AlertCircle, X, Play, CheckCircle, Lock,
    Trash2, Edit, ClipboardList, Building2, UserCog, Package, Truck, Clock,
    Plus, Search, ScanLine, Archive, FileText, Download, AlertTriangle, Printer, QrCode,
} from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { ToastContainer, Toast } from '@/components/ui/Toast';
import { formatDate } from '@/lib/utils';
import { useAppDispatch, useAppSelector } from '@/lib/store/hooks';
import { useDebounce } from '@/lib/hooks/useDebounce';
import { useReturnEditProtection } from '@/hooks/useReturnLockStatus';
import {
    fetchReturnTransactionById,
    updateReturnTransaction,
    pauseReturnTransaction,
    resumeReturnTransaction,
    completeReturnTransaction,
    finalizeReturnTransaction,
    deleteReturnTransaction,
    createFedexShipment,
    scheduleFedexPickup,
    cancelFedexShipment,
    clearCurrentTransaction,
    fetchTransactionItems,
    deleteTransactionItem,
    updateTransactionItem,
    moveItemToWineCellar,
    clearItems,
    updateFinalizeSteps,
} from '@/lib/store/returnTransactionsSlice';
import { unassignSingleReturn } from '@/lib/store/batchSlice';
import { checkReturnability } from '@/lib/store/policiesSlice';
import { ReturnTransaction, ReturnTransactionItem, WineCellarItem } from '@/lib/types';
import { apiClient } from '@/lib/api/apiClient';

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

/** Label left / value right — matches General Information and other detail cards */
function ReturnTransactionStoreAndProcessorDl({
    tx,
    variant,
}: {
    tx: ReturnTransaction;
    variant: 'plain' | 'emerald';
}) {
    const emerald = variant === 'emerald';
    const dlCls = emerald ? 'space-y-2.5' : 'space-y-1.5';
    const labelCls = emerald ? 'text-xs text-emerald-700 font-medium' : 'text-[11px] text-gray-500';
    const valueCls = emerald ? 'text-xs font-bold text-gray-800' : 'text-[11px] font-medium text-gray-900';
    const rowCls = emerald ? 'flex justify-between items-center gap-2' : 'flex justify-between gap-2';
    const valueWrap = `${valueCls} text-right min-w-0 break-words max-w-[65%]`;

    const cityState = [tx.pharmacyCity, tx.pharmacyState].filter(Boolean).join(', ');
    const serviceLabel = tx.serviceType
        ? tx.serviceType.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
        : '—';

    return (
        <dl className={dlCls}>
            <div className={rowCls}>
                <dt className={`${labelCls} shrink-0`}>Store Name</dt>
                <dd className={valueWrap}>{tx.pharmacyName || '—'}</dd>
            </div>
            {tx.storeNumber ? (
                <div className={rowCls}>
                    <dt className={`${labelCls} shrink-0`}>Store #</dt>
                    <dd className={`${valueCls} text-right`}>{tx.storeNumber}</dd>
                </div>
            ) : null}
            {tx.pharmacyStreetAddress ? (
                <div className={emerald ? 'flex justify-between items-start gap-2' : 'flex justify-between gap-2 items-start'}>
                    <dt className={`${labelCls} shrink-0`}>Address</dt>
                    <dd className={valueWrap}>{tx.pharmacyStreetAddress}</dd>
                </div>
            ) : null}
            {cityState ? (
                <div className={emerald ? 'flex justify-between items-start gap-2' : 'flex justify-between gap-2 items-start'}>
                    <dt className={`${labelCls} shrink-0`}>City / State</dt>
                    <dd className={valueWrap}>{cityState}</dd>
                </div>
            ) : null}
            <div className={rowCls}>
                <dt className={`${labelCls} shrink-0`}>Service Type</dt>
                <dd className={`${valueCls} text-right min-w-0`}>{serviceLabel}</dd>
            </div>
            {tx.pharmacyLastVisitDate ? (
                <div className={rowCls}>
                    <dt className={`${labelCls} shrink-0`}>Last Visit</dt>
                    <dd className={`${valueCls} text-right`}>
                        {new Date(tx.pharmacyLastVisitDate).toLocaleDateString()}
                    </dd>
                </div>
            ) : null}
            <div className={rowCls}>
                <dt className={`${labelCls} shrink-0`}>Processor</dt>
                <dd className={`${valueCls} flex items-center gap-1 justify-end ${emerald ? 'font-semibold' : ''}`}>
                    <UserCog className={emerald ? 'w-3.5 h-3.5 text-emerald-500 flex-shrink-0' : 'w-3 h-3 text-gray-400 flex-shrink-0'} />
                    {tx.processorName || '—'}
                </dd>
            </div>
            
            {/* Shipping Details */}
            {(tx.fedexTracking || tx.fedexPickupConfirmation || tx.fedexShipmentId) && (
                <>
                    <div className={`pt-2 border-t ${emerald ? 'border-emerald-200' : 'border-gray-100'}`} />
                    {tx.fedexTracking && (
                        <div className={rowCls}>
                            <dt className={`${labelCls} shrink-0`}>FedEx Tracking</dt>
                            <dd className={`${valueCls} text-right font-mono`}>{tx.fedexTracking}</dd>
                        </div>
                    )}
                    {tx.fedexPickupConfirmation && (
                        <div className={rowCls}>
                            <dt className={`${labelCls} shrink-0`}>Pickup Confirmation</dt>
                            <dd className={`${valueCls} text-right font-mono`}>{tx.fedexPickupConfirmation}</dd>
                        </div>
                    )}
                    {tx.fedexShipmentId && (
                        <div className={rowCls}>
                            <dt className={`${labelCls} shrink-0`}>Shipment ID</dt>
                            <dd className={`${valueCls} text-right font-mono`}>{tx.fedexShipmentId}</dd>
                        </div>
                    )}
                </>
            )}
            
            {/* Package Tracking */}
            {tx.packageTracking && Object.keys(tx.packageTracking).length > 0 && (
                <div className={`pt-2 border-t ${emerald ? 'border-emerald-200' : 'border-gray-100'}`}>
                    <dt className={`${labelCls} mb-1`}>Package Tracking</dt>
                    <dd className="space-y-1">
                        {Object.entries(tx.packageTracking)
                            .filter(([, v]) => v)
                            .map(([key, val]) => {
                                // Handle both formats: "package1" and "1"
                                const displayKey = key.startsWith('package') 
                                    ? key.replace(/([0-9]+)/, ' $1')
                                    : `Package ${key}`;
                                return (
                                    <div key={key} className={`${rowCls} text-xs`}>
                                        <span className={`${labelCls} capitalize`}>{displayKey}</span>
                                        <span className={`${valueCls} font-mono`}>{val}</span>
                                    </div>
                                );
                            })
                        }
                    </dd>
                </div>
            )}
        </dl>
    );
}

function canDoAction(tx: ReturnTransaction, action: string): boolean {
    switch (action) {
        case 'pause': return tx.status === 'in_progress';
        case 'resume': return tx.status === 'paused';
        case 'complete': return tx.status === 'in_progress' || tx.status === 'paused';
        case 'finalize': return tx.status === 'completed';
        case 'edit': return true; // Notes always editable; field-level control in the modal
        case 'delete': return !['finalized', 'scanning', 'received', 'verified', 'closed', 'closed_out'].includes(tx.status);
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

    const currentUser = useAppSelector((state) => state.auth.user);
    const isProcessor = currentUser?.role === 'processor';

    // Use browser history for back navigation instead of hardcoded paths
    const handleBackNavigation = () => {
        // Check if there's previous history to go back to
        if (window.history.length > 1) {
            router.back();
        } else {
            // Fallback to appropriate default page if no history
            const fallbackPath = isProcessor ? '/warehouse/returns' : '/warehouse/receiving?tab=received';
            router.push(fallbackPath);
        }
    };

    // Return lock status protection (granular)
    const {
        isLocked: hookIsLocked,
        canEditCoreData: hookCanEditCoreData,
        canEditClassification: hookCanEditClassification,
        canEditNotes: hookCanEditNotes,
        canAddDeleteItems: hookCanAddDeleteItems,
        checkActionAllowed,
        getDisabledState,
        lockReason,
        error: lockError,
    } = useReturnEditProtection(id);
    
    // Fallback lock check based on status (in case API fails)
    const statusBasedLocked = tx ? ['finalized', 'scanning', 'received', 'verified', 'closed', 'closed_out'].includes(tx.status) : false;
    
    const isLocked = hookIsLocked || statusBasedLocked;
    const canEditCoreData = hookCanEditCoreData && !statusBasedLocked;
    const canEditClassification = hookCanEditClassification;
    const canEditNotes = hookCanEditNotes;
    const canAddDeleteItems = hookCanAddDeleteItems && !statusBasedLocked;
    // canEdit = can edit everything (unlocked state)
    const canEdit = canEditCoreData;
    
    // Helper to check action and show toast if blocked
    const checkActionWithToast = (actionName: string, action: () => void) => {
        if (canEdit && (checkActionAllowed(actionName) || !isLocked)) {
            action();
        } else {
            showToast(`Cannot ${actionName}. Return is locked after finalization.`, 'error');
        }
    };

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
    const [editItemForm, setEditItemForm] = useState({ fullPackageSize: '', fullPackageQtyReturned: '', standardPrice: '', returnStatus: 'tbd', destination: '', memo: '' });
    const [editPolicyCheck, setEditPolicyCheck] = useState<{
        status: 'returnable' | 'non_returnable' | 'tbd';
        reason: string | null;
        destination: string | null;
        manufacturerName: string | null;
    } | null>(null);
    const [isEditPolicyChecking, setIsEditPolicyChecking] = useState(false);
    const debouncedItemSearch = useDebounce(itemSearch, 500);

    // Reverse distributors for Destination select in edit item modal
    const [reverseDistributors, setReverseDistributors] = useState<{ id: string; name: string }[]>([]);
    useEffect(() => {
        (async () => {
            try {
                const res = await apiClient.get<{ status: string; data: { id: string; name: string; email: string }[] }>(
                    '/admin/reverse-distributors', true
                );
                setReverseDistributors(res.data || []);
            } catch {
                // non-critical — dropdown stays empty
            }
        })();
    }, []);

    // Wine Cellar integration state
    const [wcModal, setWcModal] = useState(false);
    const [wcItems, setWcItems] = useState<WineCellarItem[]>([]);
    const [wcLoading, setWcLoading] = useState(false);
    const [wcSelected, setWcSelected] = useState<Set<string>>(new Set());
    const [wcAdding, setWcAdding] = useState(false);

    // Finalize flow state
    const [finalizeModal, setFinalizeModal] = useState(false);
    const [finalizeForm, setFinalizeForm] = useState({ fedexTracking: '', boxCount: '' });
    const [pdfLoading, setPdfLoading] = useState<string | null>(null);
    const defaultSteps = { printManifest: false, fedexEntered: false, printJobSheets: false };
    const [optimisticSteps, setOptimisticSteps] = useState<Partial<typeof defaultSteps>>({});
    const serverSteps = tx?.finalizeSteps ?? defaultSteps;
    const finalizeStepsDone = { ...serverSteps, ...optimisticSteps };

    const markStep = (step: Partial<typeof defaultSteps>) => {
        if (!id) return;
        // Optimistic update - immediate UI change
        setOptimisticSteps(prev => ({ ...prev, ...step }));
        // API call - persistent storage
        dispatch(updateFinalizeSteps({ id, steps: step }));
    };

    // FedEx/USPS tracking sub-modal state
    const [fedexSubModal, setFedexSubModal] = useState(false);
    const [fedexMode, setFedexMode] = useState<'choose' | 'api' | 'manual'>('choose');
    const [fedexApiLoading, setFedexApiLoading] = useState(false);
    const [fedexApiResult, setFedexApiResult] = useState<{
        masterTrackingNumber: string;
        shipmentId: string;
        packages: { trackingNumber: string; hasLabel: boolean }[];
    } | null>(null);
    const [fedexForm, setFedexForm] = useState({
        boxCount: '',
        prpNumber: '',
        packages: Array(12).fill('') as string[],
    });
    const [pickupForm, setPickupForm] = useState({
        readyTime: '09:00',
        closeTime: '17:00',
        pickupDate: new Date().toISOString().split('T')[0],
    });
    const [pickupLoading, setPickupLoading] = useState(false);

    const showToast = (message: string, type: Toast['type'] = 'success') => {
        const tid = Date.now().toString();
        setToasts(prev => [...prev, { id: tid, message, type }]);
    };
    const removeToast = (tid: string) => setToasts(prev => prev.filter(t => t.id !== tid));

    useEffect(() => {
        if (id) dispatch(fetchReturnTransactionById(id));
        return () => { dispatch(clearCurrentTransaction()); dispatch(clearItems()); };
    }, [dispatch, id]);

    // Clear optimistic updates when server data changes
    useEffect(() => {
        if (tx?.finalizeSteps) {
            setOptimisticSteps({});
        }
    }, [tx?.finalizeSteps]);

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
                setFedexForm({ boxCount: '', prpNumber: '', packages: Array(12).fill('') });
                setFinalizeModal(true);
            }
        } else {
            showToast(result.payload as string || `Failed to ${actionModal}`, 'error');
            setActionModal(null);
        }
    };

    const handleUpdate = async () => {
        if (!tx) return;
        // When locked, only send notes to avoid backend rejection
        const payload = isLocked 
            ? { notes: editForm.notes } 
            : editForm;
        const result = await dispatch(updateReturnTransaction({ id: tx.id, payload }));
        if (updateReturnTransaction.fulfilled.match(result)) {
            showToast('Return updated successfully!');
            setEditModal(false);
            refresh();
        } else {
            showToast(result.payload as string || 'Failed to update', 'error');
        }
    };

    const handleUnassignFromBatch = async () => {
        if (!tx?.batchId) return;
        const result = await dispatch(unassignSingleReturn(tx.id));
        if (unassignSingleReturn.fulfilled.match(result)) {
            showToast(result.payload.message);
            refresh(); // Refresh to show updated batch status
        } else {
            showToast(result.payload as string || 'Failed to unassign from batch', 'error');
        }
    };

    const handleDelete = async () => {
        if (!tx) return;
        const result = await dispatch(deleteReturnTransaction(tx.id));
        if (deleteReturnTransaction.fulfilled.match(result)) {
            showToast(`Return ${tx.licensePlate} deleted!`);
            setDeleteModal(false);
            setTimeout(() => handleBackNavigation(), 1000);
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
                fullPackageSize: editItemModal.fullPackageSize ? String(editItemModal.fullPackageSize) : '',
                fullPackageQtyReturned: editItemModal.fullPackageQtyReturned ? String(editItemModal.fullPackageQtyReturned) : (editItemModal.quantity ? String(editItemModal.quantity) : ''),
                standardPrice: editItemModal.standardPrice != null ? String(editItemModal.standardPrice) : '',
                returnStatus: editItemModal.returnStatus,
                destination: editItemModal.destination || '',
                memo: editItemModal.memo || '',
            });
            setEditPolicyCheck(null);
        }
    }, [editItemModal]);

    const runEditPolicyCheck = useCallback(async () => {
        if (!editItemModal) return;
        const ndc = editItemModal.ndc;
        const expDate = editItemModal.expirationDate;
        if (!ndc || !expDate) return;

        const pkgSize = parseInt(editItemForm.fullPackageSize) || 0;
        const qtyReturned = parseInt(editItemForm.fullPackageQtyReturned) || 0;
        const isPartial = pkgSize > 0 && qtyReturned > 0 && qtyReturned < pkgSize;

        setIsEditPolicyChecking(true);
        setEditPolicyCheck(null);
        try {
            const result = await dispatch(checkReturnability({
                ndc,
                expirationDate: expDate,
                dosageForm: editItemModal.dosageForm || undefined,
                isPartial,
            }));
            if (checkReturnability.fulfilled.match(result) && result.payload) {
                const policy = result.payload;
                setEditPolicyCheck(policy);
                if (policy.status === 'returnable' || policy.status === 'non_returnable') {
                    setEditItemForm(prev => ({
                        ...prev,
                        returnStatus: policy.status,
                        destination: policy.destination || prev.destination,
                    }));
                }
            }
        } catch { /* non-critical */ }
        setIsEditPolicyChecking(false);
    }, [editItemModal, editItemForm.fullPackageSize, editItemForm.fullPackageQtyReturned, dispatch]);

    /** Debounce policy check when Qty Returned / package size change in edit modal (avoids a request per keystroke). */
    const editPolicyTriggerKey =
        editItemModal && !isLocked
            ? `${editItemForm.fullPackageSize}|${editItemForm.fullPackageQtyReturned}`
            : '';
    const debouncedEditPolicyKey = useDebounce(editPolicyTriggerKey, 600);

    useEffect(() => {
        if (!editItemModal || isLocked) return;
        if (!debouncedEditPolicyKey) return;
        const pkgSize = parseInt(editItemForm.fullPackageSize) || 0;
        const qtyReturned = parseInt(editItemForm.fullPackageQtyReturned) || 0;
        if (pkgSize <= 0 || qtyReturned <= 0) return;

        runEditPolicyCheck();
    }, [debouncedEditPolicyKey, editItemModal, isLocked, runEditPolicyCheck]);

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
        
        // Core data fields — only include if not locked
        if (!isLocked) {
            const pkgSize = editItemForm.fullPackageSize ? parseInt(editItemForm.fullPackageSize) : 0;
            const qtyReturned = editItemForm.fullPackageQtyReturned ? parseInt(editItemForm.fullPackageQtyReturned) : 0;
            if (pkgSize > 0) payload.fullPackageSize = pkgSize;
            if (qtyReturned > 0) {
                payload.fullPackageQtyReturned = qtyReturned;
                if (pkgSize > 0 && qtyReturned < pkgSize) {
                    payload.quantity = 1;
                    payload.isPartial = true;
                    payload.partialPercentage = Math.round((qtyReturned / pkgSize) * 100 * 100) / 100;
                } else {
                    payload.quantity = qtyReturned >= pkgSize && pkgSize > 0 ? Math.floor(qtyReturned / pkgSize) : qtyReturned;
                    payload.isPartial = false;
                    payload.partialPercentage = null;
                }
            }
            if (editItemForm.standardPrice) payload.standardPrice = parseFloat(editItemForm.standardPrice);
        }
        
        // Classification fields — always allowed
        payload.returnStatus = editItemForm.returnStatus;
        if (editItemForm.destination) payload.destination = editItemForm.destination;
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
    const nonWcReturnableAndTbdItemsCount = nonWcItems.filter(i => i.returnStatus === 'returnable' || i.returnStatus === 'tbd').length;
    const nonWcReturnableValue = nonWcItems
        .filter(i => i.returnStatus === 'returnable')
        .reduce((sum, i) => sum + (i.estimatedValue ?? 0), 0);
    const nonWcTotalValue = nonWcReturnableValue;

    // ── Print helpers ─────────────────────────────────────────────

    const printJobSheet = () => {
        printHtml('job-sheet', 'job-sheet');
    };

    const printShippingLabels = () => {
        printHtml('shipping-labels', 'shipping-labels');
    };

    const printSingleLabel = (packageNumber: number) => {
        printHtml(`shipping-label/${packageNumber}`, `shipping-label-${packageNumber}`);
    };

    const tbdItems = items.filter(i => i.returnStatus === 'tbd');
    const ciiItems = items.filter(i => i.deaForm222Required);
    const hasTbdItems = tbdItems.length > 0;
    const hasCiiItems = ciiItems.length > 0;
    const isFinalized = tx ? ['finalized', 'received', 'closed_out'].includes(tx.status) : false;

    const openFinalizeModal = () => {
        if (!tx) return;
        const existingPkgTracking = tx.packageTracking || {};
        const pkgs = Array(12).fill('').map((_, i) => existingPkgTracking[`package${i + 1}`] || '');

        setFinalizeForm({ fedexTracking: tx.fedexTracking || '', boxCount: tx.boxCount ? String(tx.boxCount) : '' });
        setFedexForm({
            boxCount: tx.boxCount ? String(tx.boxCount) : '',
            prpNumber: tx.prpNumber || '',
            packages: pkgs,
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

    const printHtml = async (endpoint: string, loadingKey: string) => {
        setPdfLoading(loadingKey);
        try {
            const { cookieUtils } = await import('@/lib/utils/cookies');
            const token = cookieUtils.getAuthToken();
            const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';
            const res = await fetch(`${baseUrl}/return-transactions/${encodeURIComponent(id)}/${endpoint}`, {
                headers: { 
                    Authorization: `Bearer ${token}`,
                    Accept: 'text/html'
                },
            });
            if (!res.ok) {
                const err = await res.json().catch(() => ({ message: 'Print failed' }));
                throw new Error(err.message || 'Print failed');
            }
            const htmlContent = await res.text();
            
            // Create a new window with the HTML content
            const printWindow = window.open('', '_blank');
            if (printWindow) {
                printWindow.document.write(htmlContent);
                printWindow.document.close();
                
                // Wait for content to load, then print
                printWindow.onload = () => {
                    setTimeout(() => {
                        printWindow.print();
                    }, 500);
                };
            } else {
                throw new Error('Unable to open print window. Please check popup blockers.');
            }
        } catch (e: any) {
            showToast(e.message || 'Failed to print document', 'error');
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

        // Build package tracking object from non-empty entries
        const packageTracking: Record<string, string> = {};
        fedexForm.packages.forEach((val, i) => {
            if (val.trim()) packageTracking[`package${i + 1}`] = val.trim();
        });

        const result = await dispatch(finalizeReturnTransaction({
            id: tx.id,
            fedexTracking,
            boxCount,
            prpNumber: fedexForm.prpNumber.trim() || undefined,
            packageTracking: Object.keys(packageTracking).length > 0 ? packageTracking : undefined,
        }));
        if (finalizeReturnTransaction.fulfilled.match(result)) {
            showToast(`Return ${tx.licensePlate} finalized successfully!`);
            setFinalizeModal(false);
            refresh();
        } else {
            showToast(result.payload as string || 'Failed to finalize return', 'error');
        }
    };

    const allStepsDone = finalizeStepsDone.printManifest
        && finalizeStepsDone.fedexEntered
        && finalizeStepsDone.printJobSheets;
    const canFinalize = allStepsDone && !hasTbdItems;

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
                <button onClick={handleBackNavigation} className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-800">
                    <ArrowLeft className="w-4 h-4" /> Back
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
        <div className="space-y-3">
            <ToastContainer toasts={toasts} onClose={removeToast} />

            {/* Lock Status Warning */}
            {isLocked && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                    <div className="flex items-center gap-2">
                        <Lock className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
                        <div>
                            <p className="text-xs font-semibold text-amber-800">Partially Locked — Core data is frozen</p>
                            <p className="text-[10px] text-amber-700">Item classification (status, destination, memo) and return notes can still be updated. Quantity, price, and other core fields are locked.</p>
                        </div>
                    </div>
                </div>
            )}


            {/* Back + Header */}
            <div>
                <button onClick={handleBackNavigation} className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 mb-1.5">
                    <ArrowLeft className="w-3.5 h-3.5" /> Back
                </button>
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                    <div className="flex items-center gap-2">
                        <h1 className="text-base font-bold font-mono text-gray-900">{tx.licensePlate}</h1>
                        <Badge variant={badge.variant}><span className="text-[10px]">{badge.label}</span></Badge>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                        {/* {canDoAction(tx, 'edit') && (
                            <button onClick={() => setEditModal(true)} className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 transition-colors">
                                <Edit className="w-3 h-3" /> {isLocked ? 'Edit Notes' : 'Edit'}
                            </button>
                        )} */}
                        {/* Pause hidden on scan / return detail page — restore if needed
                        {canDoAction(tx, 'pause') && canEdit && (
                            <button onClick={() => checkActionWithToast('pause return', () => setActionModal('pause'))} className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium bg-yellow-100 text-yellow-800 border border-yellow-300 hover:bg-yellow-200 transition-colors">
                                <Pause className="w-3 h-3" /> Pause
                            </button>
                        )}
                        */}
                        {canDoAction(tx, 'resume') && canEdit && (
                            <button onClick={() => checkActionWithToast('resume return', () => setActionModal('resume'))} className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium bg-green-100 text-green-800 border border-green-300 hover:bg-green-200 transition-colors">
                                <Play className="w-3 h-3" /> Resume
                            </button>
                        )}
                        {canDoAction(tx, 'complete') && canEdit && (
                            <button onClick={() => checkActionWithToast('complete return', () => setActionModal('complete'))} className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium bg-primary-600 text-white hover:bg-primary-700 transition-colors">
                                <CheckCircle className="w-3 h-3" /> Complete
                            </button>
                        )}
                        {canDoAction(tx, 'finalize') && canEdit && (
                            <button onClick={() => checkActionWithToast('finalize return', () => openFinalizeModal())} className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium bg-red-600 text-white hover:bg-red-700 transition-colors">
                                <Lock className="w-3 h-3" /> Finalize
                            </button>
                        )}
                        {/* Print Job Sheet - Available for completed/finalized transactions with tracking */}
                        {(tx.status === 'completed' || tx.status === 'finalized') && (tx.fedexTracking || (tx.packageTracking && Object.keys(tx.packageTracking).length > 0)) && (
                            <button
                                onClick={printJobSheet}
                                disabled={pdfLoading === 'job-sheet'}
                                className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors disabled:opacity-50"
                                title="Print job sheet with addresses and barcodes"
                            >
                                {pdfLoading === 'job-sheet' ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <FileText className="w-4 h-4 mr-1" />}
                                Print Job Sheet
                            </button>
                        )}
                        {canDoAction(tx, 'delete') && canEdit && (
                            <button onClick={() => checkActionWithToast('delete return', () => setDeleteModal(true))} className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium bg-red-100 text-red-800 border border-red-300 hover:bg-red-200 transition-colors">
                                <Trash2 className="w-3 h-3" /> Delete
                            </button>
                        )}
                        {canDoAction(tx, 'delete') && !canEdit && (
                            <button disabled className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium bg-gray-100 text-gray-400 border border-gray-300 cursor-not-allowed">
                                <Lock className="w-3 h-3" /> Locked
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Detail Cards - Conditional Layout */}
            {(tx.fedexTracking || tx.fedexPickupConfirmation) ? (
                /* Layout with Shipping & Processing: 2x2 grid */
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                {/* General Info */}
                <div className="bg-white rounded-lg shadow px-4 py-3">
                    <h2 className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                        <ClipboardList className="w-3.5 h-3.5" /> General Information
                    </h2>
                    <dl className="space-y-1.5">
                        {[
                            { label: 'License Plate', value: <span className="font-mono font-semibold">{tx.licensePlate}</span> },
                            { label: 'Service Type', value: tx.serviceType.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) },
                            { label: 'Created', value: formatDate(tx.createdAt) },
                            { label: 'Last Updated', value: formatDate(tx.updatedAt) },
                            ...(tx.finalizedAt ? [{ label: 'Finalized', value: formatDate(tx.finalizedAt) }] : []),
                            ...(tx.batchId ? [{ 
                                label: 'Batch Assignment', 
                                value: (
                                    <div className="flex items-center gap-1">
                                        <span className="text-[10px] text-blue-600 font-medium">Assigned</span>
                                        <button
                                            onClick={() => handleUnassignFromBatch()}
                                            className="text-[9px] text-red-600 hover:text-red-800 underline ml-1"
                                            title="Remove from batch"
                                        >
                                            Remove
                                        </button>
                                    </div>
                                )
                            }] : [{ label: 'Batch Assignment', value: <span className="text-[10px] text-gray-400">Not assigned</span> }]),
                        ].map(({ label, value }) => (
                            <div key={label} className="flex justify-between">
                                <dt className="text-[11px] text-gray-500">{label}</dt>
                                <dd className="text-[11px] text-gray-900">{value}</dd>
                            </div>
                        ))}
                        {tx.notes && (
                            <div className="pt-1.5 border-t border-gray-100">
                                <dt className="text-[11px] text-gray-500 mb-0.5">Notes</dt>
                                <dd className="text-[11px] text-gray-700">{tx.notes}</dd>
                            </div>
                        )}
                    </dl>
                </div>

                {/* Store & Processor */}
                <div className="bg-white rounded-lg shadow px-4 py-3">
                    <h2 className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5" /> Store & Processor
                    </h2>
                    <ReturnTransactionStoreAndProcessorDl tx={tx} variant="plain" />
                </div>

                {/* Values */}
                <div className="bg-white rounded-lg shadow px-4 py-3">
                    <h2 className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                        <Package className="w-3.5 h-3.5" /> Items & Values
                    </h2>
                    <dl className="space-y-1.5">
                        <div className="flex justify-between">
                            <dt className="text-[11px] text-gray-500">Total Items</dt>
                            <dd className="text-[11px] font-semibold text-gray-900">{nonWcReturnableAndTbdItemsCount}</dd>
                        </div>
                        <div className="flex justify-between">
                            <dt className="text-[11px] text-gray-500">Returnable Value</dt>
                            <dd className="text-[11px] font-semibold text-green-700">{formatCurrency(nonWcReturnableValue)}</dd>
                        </div>
                        {/* <div className="flex justify-between">
                            <dt className="text-[11px] text-gray-500">Non-Returnable Value</dt>
                            <dd className="text-[11px] font-semibold text-red-700">{formatCurrency(nonWcNonReturnableValue)}</dd>
                        </div> */}
                        <div className="flex justify-between pt-1.5 border-t border-gray-100">
                            <dt className="text-[11px] text-gray-500 font-medium">Total Value</dt>
                            <dd className="text-[11px] font-bold text-gray-900">{formatCurrency(nonWcTotalValue)}</dd>
                        </div>
                    </dl>
                </div>

                    {/* Shipping & Processing */}
                    <div className="bg-white rounded-lg shadow px-4 py-3">
                        <h2 className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                            <Truck className="w-3.5 h-3.5" /> Shipping & Processing
                        </h2>
                        <dl className="space-y-1.5">
                            <div className="flex justify-between">
                                <dt className="text-[11px] text-gray-500">FedEx Tracking</dt>
                                <dd className="text-[11px] text-gray-900 font-mono">{tx.fedexTracking || '—'}</dd>
                            </div>
                            <div className="flex justify-between">
                                <dt className="text-[11px] text-gray-500">Pickup Confirmation</dt>
                                <dd className="text-[11px] text-gray-900">{tx.fedexPickupConfirmation || '—'}</dd>
                            </div>
                            {/* Commented out as requested:
                            <div className="flex justify-between">
                                <dt className="text-[11px] text-gray-500 flex items-center gap-1"><Clock className="w-3 h-3" /> Time In</dt>
                                <dd className="text-[11px] text-gray-900">{tx.timeIn ? formatDate(tx.timeIn) : '—'}</dd>
                            </div>
                            <div className="flex justify-between">
                                <dt className="text-[11px] text-gray-500 flex items-center gap-1"><Clock className="w-3 h-3" /> Time Out</dt>
                                <dd className="text-[11px] text-gray-900">{tx.timeOut ? formatDate(tx.timeOut) : '—'}</dd>
                            </div>
                            */}
                            {tx.receivedInWarehouseDate && (
                                <div className="flex justify-between">
                                    <dt className="text-[11px] text-gray-500">Received in Warehouse</dt>
                                    <dd className="text-[11px] text-gray-900">{formatDate(tx.receivedInWarehouseDate)}</dd>
                                </div>
                            )}
                            {/* Commented out as requested:
                            <div className="flex justify-between">
                                <dt className="text-[11px] text-gray-500">Verified Integrity</dt>
                                <dd className="text-[11px] text-gray-900">{tx.verifiedIntegrity ? 'Yes' : 'No'}</dd>
                            </div>
                            */}
                        {tx.boxCount != null && (
                            <div className="flex justify-between">
                                <dt className="text-[11px] text-gray-500">Box Count</dt>
                                <dd className="text-[11px] text-gray-900 font-semibold">{tx.boxCount}</dd>
                            </div>
                        )}
                        {tx.prpNumber && (
                            <div className="flex justify-between">
                                <dt className="text-gray-500">PRP Number</dt>
                                <dd className="text-gray-900 font-mono text-xs">{tx.prpNumber}</dd>
                            </div>
                        )}
                        {tx.fedexShipmentId && (
                            <div className="flex justify-between">
                                <dt className="text-gray-500">Shipment ID</dt>
                                <dd className="text-gray-900 font-mono text-xs">{tx.fedexShipmentId}</dd>
                            </div>
                        )}
                        {tx.packageTracking && Object.keys(tx.packageTracking).length > 0 && (
                            <div className="pt-2 border-t border-gray-100">
                                <dt className="text-gray-500 mb-1 flex items-center justify-between">
                                    <span>Package Tracking</span>
                                    <div className="flex items-center gap-1">
                                        <button
                                            onClick={printShippingLabels}
                                            disabled={pdfLoading === 'shipping-labels'}
                                            className="flex items-center gap-1 px-2 py-1 bg-green-100 hover:bg-green-200 text-xs text-green-700 rounded border border-green-200 transition-colors disabled:opacity-50"
                                            title="Print all shipping labels with addresses and barcodes"
                                        >
                                            {pdfLoading === 'shipping-labels' ? <Loader2 className="w-3 h-3 animate-spin" /> : <Printer className="w-3 h-3" />}
                                            Print All Labels
                                        </button>

                                    </div>
                                </dt>
                                <dd className="space-y-1.5 mt-1">
                                    {Object.entries(tx.packageTracking)
                                        .filter(([, v]) => v)
                                        .map(([key, val], idx) => (
                                            <div key={key} className="flex justify-between items-center text-xs">
                                                <span className="text-gray-500 capitalize">{key.replace(/([0-9]+)/, ' $1')}</span>
                                                <div className="flex items-center gap-1.5">
                                                    <span className="font-mono text-gray-900">{val}</span>
                                                    <button
                                                        onClick={() => printSingleLabel(idx + 1)}
                                                        disabled={pdfLoading === `shipping-label-${idx + 1}`}
                                                        className="flex items-center gap-0.5 px-1.5 py-0.5 bg-green-50 hover:bg-green-100 text-green-700 rounded border border-green-200 transition-colors disabled:opacity-50"
                                                        title={`Print shipping label for ${val}`}
                                                    >
                                                        {pdfLoading === `shipping-label-${idx + 1}` ? <Loader2 className="w-3 h-3 animate-spin" /> : <Printer className="w-3 h-3" />}
                                                    </button>

                                                </div>
                                            </div>
                                        ))
                                    }
                                </dd>
                            </div>
                        )}
                        {tx.fedexLabels && Object.keys(tx.fedexLabels).length > 0 && (
                            <div className="pt-2 border-t border-gray-100">
                                <dt className="text-gray-500 mb-1 flex items-center gap-1"><Printer className="w-3.5 h-3.5" /> Shipping Labels</dt>
                                <dd className="flex flex-wrap gap-2">
                                    {Object.keys(tx.fedexLabels).map((key) => {
                                        const num = key.replace('package', '');
                                        return (
                                            <a
                                                key={key}
                                                href={`${process.env.NEXT_PUBLIC_API_URL}/return-transactions/${tx.id}/labels/${num}/download`}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="flex items-center gap-1 px-2 py-1 bg-gray-100 hover:bg-gray-200 text-xs text-gray-700 rounded border border-gray-200 transition-colors"
                                            >
                                                <Download className="w-3 h-3" /> Label {num}
                                            </a>
                                        );
                                    })}
                                </dd>
                            </div>
                        )}
                        </dl>
                    </div>
                </div>
            ) : (
                /* Layout without Shipping & Processing: 3 cards in one row */
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    {/* General Information */}
                    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl shadow-sm border border-blue-100 px-5 py-4 hover:shadow-md transition-shadow">
                        <h2 className="text-xs font-bold text-blue-800 uppercase tracking-wider mb-3 flex items-center gap-2">
                            <div className="p-1.5 bg-blue-100 rounded-lg">
                                <ClipboardList className="w-4 h-4 text-blue-600" />
                            </div>
                            General Information
                        </h2>
                        <dl className="space-y-2.5">
                            {[
                                { label: 'License Plate', value: <span className="font-mono font-bold text-gray-800">{tx.licensePlate}</span> },
                                { label: 'Service Type', value: tx.serviceType.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) },
                                { label: 'Created', value: formatDate(tx.createdAt) },
                                { label: 'Last Updated', value: formatDate(tx.updatedAt) },
                                ...(tx.finalizedAt ? [{ label: 'Finalized', value: formatDate(tx.finalizedAt) }] : []),
                                ...(tx.batchId ? [{ 
                                    label: 'Batch Assignment', 
                                    value: (
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs text-blue-600 font-medium">Assigned to Batch</span>
                                            <button
                                                onClick={() => handleUnassignFromBatch()}
                                                className="text-xs text-red-600 hover:text-red-800 underline"
                                                title="Remove from batch"
                                            >
                                                Remove
                                            </button>
                                        </div>
                                    )
                                }] : [{ label: 'Batch Assignment', value: <span className="text-xs text-gray-400">Not assigned</span> }]),
                            ].map(({ label, value }) => (
                                <div key={label} className="flex justify-between items-center">
                                    <dt className="text-xs text-blue-700 font-medium">{label}</dt>
                                    <dd className="text-xs text-gray-800 font-semibold">{value}</dd>
                                </div>
                            ))}
                            {tx.notes && (
                                <div className="pt-2 border-t border-blue-200">
                                    <dt className="text-xs text-blue-700 font-medium mb-1">Notes</dt>
                                    <dd className="text-xs text-gray-700 bg-white/60 rounded px-2 py-1">{tx.notes}</dd>
                                </div>
                            )}
                        </dl>
                    </div>

                    {/* Store & Processor */}
                    <div className="bg-gradient-to-br from-emerald-50 to-green-50 rounded-xl shadow-sm border border-emerald-100 px-5 py-4 hover:shadow-md transition-shadow">
                        <h2 className="text-xs font-bold text-emerald-800 uppercase tracking-wider mb-3 flex items-center gap-2">
                            <div className="p-1.5 bg-emerald-100 rounded-lg">
                                <Building2 className="w-4 h-4 text-emerald-600" />
                            </div>
                            Store & Processor
                        </h2>
                        <ReturnTransactionStoreAndProcessorDl tx={tx} variant="emerald" />
                    </div>

                    {/* Items & Values */}
                    {/* <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl shadow-sm border border-amber-100 px-5 py-4 hover:shadow-md transition-shadow">
                        <h2 className="text-xs font-bold text-amber-800 uppercase tracking-wider mb-3 flex items-center gap-2">
                            <div className="p-1.5 bg-amber-100 rounded-lg">
                                <Package className="w-4 h-4 text-amber-600" />
                            </div>
                            Items & Values
                        </h2>
                        <dl className="space-y-2.5">
                            <div className="flex justify-between items-center">
                                <dt className="text-xs text-amber-700 font-medium">Total Items</dt>
                                <dd className="text-xs font-bold text-gray-800">{nonWcReturnableAndTbdItemsCount}</dd>
                            </div>
                            <div className="flex justify-between items-center">
                                <dt className="text-xs text-amber-700 font-medium">Returnable Value</dt>
                                <dd className="text-xs font-bold text-green-700">{formatCurrency(nonWcReturnableValue)}</dd>
                            </div>
                            <div className="flex justify-between items-center">
                                <dt className="text-xs text-amber-700 font-medium">Non-Returnable Value</dt>
                                <dd className="text-xs font-bold text-red-700">{formatCurrency(nonWcNonReturnableValue)}</dd>
                            </div>
                            <div className="flex justify-between items-center pt-2 border-t border-amber-200">
                                <dt className="text-xs text-amber-800 font-bold">Total Value</dt>
                                <dd className="text-sm font-black text-gray-900 bg-white/70 px-2 py-0.5 rounded">{formatCurrency(nonWcTotalValue)}</dd>
                            </div>
                        </dl>
                    </div> */}
                </div>
            )}

            {/* ── Documents Section (post-finalization) ──────── */}
            {isFinalized && (
                <div className="bg-white rounded-lg shadow px-4 py-3">
                    <h2 className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5" /> Documents
                    </h2>
                    <div className="flex flex-wrap gap-2">
                        <button
                            onClick={() => downloadPdf('manifest', `manifest-${tx.licensePlate}.pdf`)}
                            disabled={pdfLoading === 'manifest'}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded text-xs text-blue-700 font-medium transition-colors disabled:opacity-50"
                        >
                            {pdfLoading === 'manifest' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
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
                        <p className="text-[10px] text-gray-400 mt-2">Manifest last generated: {formatDate(tx.manifestGeneratedAt)}</p>
                    )}
                </div>
            )}

            {/* ── Items Section ──────────────────────────────── */}
            <div className="bg-white rounded-lg shadow px-4 py-3">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-2">
                    <h2 className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                        <ScanLine className="w-3.5 h-3.5" /> Products ({nonWcItems.length})
                    </h2>
                    {isProcessor && canAddDeleteItems && (
                        <div className="flex gap-1.5">
                            <button onClick={() => router.push(`/warehouse/returns/${id}/add-items`)} className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium bg-primary-600 text-white hover:bg-primary-700 transition-colors">
                                <Plus className="w-3 h-3" /> Add Items
                            </button>
                            <button onClick={() => openWcModal()} className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 transition-colors">
                                <Archive className="w-3 h-3" /> Wine Cellar Items
                            </button>
                        </div>
                    )}
                    {isProcessor && canDoAction(tx, 'edit') && !canEdit && (
                        <div className="flex gap-1.5">
                            <button disabled className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium bg-gray-100 text-gray-400 border border-gray-300 cursor-not-allowed">
                                <Lock className="w-3 h-3" /> Locked
                            </button>
                        </div>
                    )}
                </div>

                {/* Summary Bar */}
                {/* {nonWcItems.length > 0 && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-2">
                        <div className="bg-gray-50 rounded px-2.5 py-1.5 text-center">
                            <p className="text-[10px] text-gray-500">Items</p>
                            <p className="text-xs font-bold text-gray-900">{nonWcReturnableAndTbdItemsCount}</p>
                        </div>
                        <div className="bg-green-50 rounded px-2.5 py-1.5 text-center">
                            <p className="text-[10px] text-green-600">Returnable</p>
                            <p className="text-xs font-bold text-green-800">{formatCurrency(nonWcReturnableValue)}</p>
                        </div>
                        <div className="bg-red-50 rounded px-2.5 py-1.5 text-center">
                            <p className="text-[10px] text-red-600">Non-Returnable</p>
                            <p className="text-xs font-bold text-red-800">{formatCurrency(nonWcNonReturnableValue)}</p>
                        </div>
                        <div className="bg-blue-50 rounded px-2.5 py-1.5 text-center">
                            <p className="text-[10px] text-blue-600">Total Value</p>
                            <p className="text-xs font-bold text-blue-800">{formatCurrency(nonWcTotalValue)}</p>
                        </div>
                    </div>
                )} */}

                {/* Items Filters */}
                <div className="flex flex-col sm:flex-row gap-1.5 mb-2">
                    <div className="relative flex-1">
                        <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            value={itemSearch}
                            onChange={e => setItemSearch(e.target.value)}
                            placeholder="Search by NDC, name, manufacturer, lot..."
                            className="w-full pl-8 pr-3 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-primary-500"
                        />
                    </div>
                    <select
                        value={itemStatusFilter}
                        onChange={e => setItemStatusFilter(e.target.value)}
                        className="px-2.5 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-primary-500"
                    >
                        <option value="">All Statuses</option>
                        <option value="returnable">Returnable</option>
                        <option value="non_returnable">Non-Returnable</option>
                        <option value="tbd">TBD</option>
                    </select>
                </div>

                {/* Items Table */}
                {isItemsLoading ? (
                    <div className="flex justify-center py-6">
                        <Loader2 className="w-5 h-5 animate-spin text-primary-600" />
                    </div>
                ) : nonWcItems.length === 0 ? (
                    <div className="text-center py-6">
                        <Package className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                        <p className="text-gray-500 text-xs font-medium">No items yet</p>
                        {isProcessor && canAddDeleteItems && (
                            <button onClick={() => router.push(`/warehouse/returns/${id}/add-items`)} className="mt-2 inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium bg-primary-600 text-white hover:bg-primary-700 transition-colors">
                                <Plus className="w-3 h-3" /> Start Scanning
                            </button>
                        )}
                        {isProcessor && canDoAction(tx, 'edit') && !canEdit && (
                            <button disabled className="mt-2 inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium bg-gray-100 text-gray-400 border border-gray-300 cursor-not-allowed">
                                <Lock className="w-3 h-3" /> Locked
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full table-auto">
                            <thead>
                                <tr className="bg-gradient-to-r from-indigo-500 to-indigo-400">
                                    <th className="text-left px-4 py-3.5 text-xs font-semibold uppercase tracking-wider text-white w-28">NDC</th>
                                    <th className="text-left px-4 py-3.5 text-xs font-semibold uppercase tracking-wider text-white">Name</th>
                                    <th className="text-left px-4 py-3.5 text-xs font-semibold uppercase tracking-wider text-white">Manufacturer</th>
                                    <th className="text-center px-4 py-3.5 text-xs font-semibold uppercase tracking-wider text-white w-16">Pkg Size</th>
                                    <th className="text-center px-4 py-3.5 text-xs font-semibold uppercase tracking-wider text-white w-20">Qty Returned</th>
                                    <th className="text-left px-4 py-3.5 text-xs font-semibold uppercase tracking-wider text-white w-28">Serial#</th>
                                    {/* <th className="text-right px-4 py-3.5 text-xs font-semibold uppercase tracking-wider whitespace-nowrap text-white whitespace-nowrap">Price</th>
                                    <th className="text-right px-4 py-3.5 text-xs font-semibold uppercase tracking-wider whitespace-nowrap text-white whitespace-nowrap">Est. Value</th> */}
                                    {/* <th className="text-right px-4 py-3.5 text-xs font-semibold uppercase tracking-wider whitespace-nowrap text-white whitespace-nowrap">Est. Store Value</th> */}
                                    <th className="text-left px-4 py-3.5 text-xs font-semibold uppercase tracking-wider text-white whitespace-nowrap">Expires</th>
                                    <th className="text-left px-4 py-3.5 text-xs font-semibold uppercase tracking-wider text-white whitespace-nowrap">Status</th>
                                    <th className="text-left px-4 py-3.5 text-xs font-semibold uppercase tracking-wider text-white whitespace-nowrap">Destination</th>
                                    <th className="text-right px-4 py-3.5 text-xs font-semibold uppercase tracking-wider text-white whitespace-nowrap">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {nonWcItems.map((item) => {
                                    const sBadge = getItemStatusBadge(item.returnStatus);
                                    return (
                                        <tr key={item.id} className="hover:bg-gray-50">
                                            <td className="px-4 py-3 text-xs font-mono text-gray-900 w-28 whitespace-nowrap">{item.ndc || '—'}</td>
                                            <td className="px-4 py-3 text-xs text-gray-900 max-w-[130px] truncate" title={item.proprietaryName || ''}>
                                                {item.proprietaryName || item.genericName || '—'}
                                            </td>
                                            <td className="px-4 py-3 text-xs text-gray-600 max-w-[110px] truncate" title={item.manufacturer || ''}>
                                                {item.manufacturer || '—'}
                                            </td>
                                            <td className="px-4 py-3 text-xs text-center text-gray-900 w-16 whitespace-nowrap">
                                                {item.fullPackageSize || '—'}
                                            </td>
                                            <td className="px-4 py-3 text-xs text-center text-gray-900 w-20 whitespace-nowrap">
                                                {(() => {
                                                    const qtyReturned = item.fullPackageQtyReturned ?? item.quantity;
                                                    const displayQty = (item.fullPackageQtyReturned && item.fullPackageSize && item.fullPackageQtyReturned === item.fullPackageSize) ? 1 : qtyReturned;
                                                    return <>{displayQty}{item.isPartial && <span className="text-yellow-600 ml-0.5">P</span>}</>;
                                                })()}
                                            </td>
                                            <td className="px-4 py-3 text-xs text-gray-600 font-mono w-28 max-w-[7rem]">
                                                <span className="block truncate" title={item.serialNumber || ''}>
                                                    {item.serialNumber || '—'}
                                                </span>
                                            </td>
                                            {/* <td className="px-4 py-3 text-xs text-right text-gray-900">
                                                {item.standardPrice != null ? formatCurrency(item.standardPrice) : '—'}
                                            </td>
                                            <td className="px-4 py-3 text-xs text-right font-medium text-gray-900">
                                                {item.estimatedValue != null ? formatCurrency(item.estimatedValue) : '—'}
                                            </td> */}
                                            {/* <td className="px-4 py-3 text-xs text-right font-medium text-gray-900">
                                                {item.estimatedStoreValue != null ? formatCurrency(item.estimatedStoreValue) : '—'}
                                            </td> */}
                                            <td className="px-4 py-3 text-xs text-gray-600 whitespace-nowrap">
                                                {item.expirationDate ? formatDate(item.expirationDate) : '—'}
                                            </td>
                                            <td className="px-4 py-3 text-xs whitespace-nowrap">
                                                <div className="flex items-center gap-1">
                                                    <Badge variant={sBadge.variant}><span className="text-[10px]">{sBadge.label}</span></Badge>
                                                    {item.wineCellarId && (
                                                        <Badge variant="info"><span className="text-[10px]"><Archive className="w-2.5 h-2.5 mr-0.5 inline" />WC</span></Badge>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-xs text-gray-600 whitespace-nowrap">
                                                {item.returnStatus === 'returnable' ? (
                                                    item.destination ? (
                                                        <span className="capitalize font-medium text-gray-900">{item.destination}</span>
                                                    ) : (
                                                        <span className="text-orange-600 font-medium">Missing</span>
                                                    )
                                                ) : '—'}
                                            </td>
                                            <td className="px-4 py-3 text-xs whitespace-nowrap">
                                                <div className="flex items-center justify-end gap-0.5">
                                                    {canAddDeleteItems && item.nonReturnableReason === 'date' && !item.wineCellarId && (
                                                        <button onClick={() => handleMoveToWineCellar(item)} className="p-1 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded" title="Move to Wine Cellar">
                                                            <Archive className="w-3 h-3" />
                                                        </button>
                                                    )}
                                                    {canAddDeleteItems && (
                                                        <button onClick={() => setEditItemModal(item)} className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded" title={isLocked ? 'Edit classification' : 'Edit item'}>
                                                            <Edit className="w-3 h-3" />
                                                        </button>
                                                    )}
                                                    {canAddDeleteItems && (
                                                        <button onClick={() => setDeleteItemModal(item)} className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded" title="Delete item">
                                                            <Trash2 className="w-3 h-3" />
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
                    <div className="bg-white rounded-lg max-w-sm w-full shadow-xl" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-gray-50">
                            <h2 className="text-sm font-semibold text-gray-900">Edit Item</h2>
                            <button onClick={() => setEditItemModal(null)} className="text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
                        </div>
                        <div className="px-4 py-3">
                            <p className="text-[11px] text-gray-500 mb-2">{editItemModal.proprietaryName || editItemModal.ndc} — Lot: {editItemModal.lotNumber || '—'}</p>
                            {isLocked && (
                                <div className="bg-yellow-50 border border-yellow-200 rounded px-2.5 py-1.5 mb-2">
                                    <p className="text-[10px] text-yellow-800">Core data (pkg size, qty, price) is locked. Classification fields can still be updated.</p>
                                </div>
                            )}
                            <div className="space-y-2">
                                <div>
                                    <label className="block text-[11px] font-medium text-gray-700 mb-0.5">Quantity</label>
                                    <div className="grid grid-cols-3 gap-2 text-xs">
                                        <div>
                                            <label className="block text-[10px] text-gray-500 mb-0.5">Pkg Size</label>
                                            <div className="text-center py-1.5 bg-gray-50 border border-gray-200 rounded">
                                                {editItemForm.fullPackageSize || '—'}
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-[10px] text-gray-500 mb-0.5">Qty Returned (units)</label>
                                            <input 
                                                type="number" 
                                                min="0" 
                                                max={editItemForm.fullPackageSize || undefined}
                                                value={editItemForm.fullPackageQtyReturned} 
                                                onChange={e => setEditItemForm({ ...editItemForm, fullPackageQtyReturned: e.target.value })} 
                                                disabled={isLocked} 
                                                className={`w-full px-2 py-1.5 text-center text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-primary-500 ${isLocked ? 'bg-gray-100 cursor-not-allowed' : ''}`} 
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] text-gray-500 mb-0.5">#</label>
                                            <div className="text-center py-1.5 bg-gray-50 border border-gray-200 rounded">
                                                {editItemForm.fullPackageQtyReturned && editItemForm.fullPackageSize ? 
                                                    Math.ceil(Number(editItemForm.fullPackageQtyReturned) / Number(editItemForm.fullPackageSize)) : '—'}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-[11px] font-medium text-gray-700 mb-0.5">Return Status</label>
                                    <select value={editItemForm.returnStatus} onChange={e => setEditItemForm({ ...editItemForm, returnStatus: e.target.value })} className="w-full px-2.5 py-1.5 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-primary-500">
                                        <option value="tbd">TBD</option>
                                        <option value="returnable">Returnable</option>
                                        <option value="non_returnable">Non-Returnable</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[11px] font-medium text-gray-700 mb-0.5">Memo</label>
                                    <input type="text" value={editItemForm.memo} onChange={e => setEditItemForm({ ...editItemForm, memo: e.target.value })} placeholder="Optional memo" className="w-full px-2.5 py-1.5 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-primary-500" />
                                </div>
                            </div>
                        </div>
                        <div className="flex justify-end gap-2 px-4 py-3 border-t border-gray-200 bg-gray-50">
                            <button onClick={() => setEditItemModal(null)} className="px-3 py-1.5 text-xs rounded border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors">Cancel</button>
                            <button onClick={handleUpdateItem} disabled={isItemActionLoading} className="inline-flex items-center gap-1 px-3 py-1.5 text-xs rounded bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-50 transition-colors">
                                {isItemActionLoading ? <><Loader2 className="w-3.5 h-3.5 animate-spin" />Saving...</> : 'Save'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Delete Item Modal ────────────────────────── */}
            {deleteItemModal && (
                <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-md flex items-center justify-center z-50 p-4" onClick={() => setDeleteItemModal(null)}>
                    <div className="bg-white rounded-lg max-w-sm w-full shadow-xl" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-gray-50">
                            <h2 className="text-sm font-semibold text-gray-900">Delete Item</h2>
                            <button onClick={() => setDeleteItemModal(null)} className="text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
                        </div>
                        <div className="px-4 py-3">
                            <p className="text-xs text-gray-700">
                                Delete <strong>{deleteItemModal.proprietaryName || deleteItemModal.ndc || 'this item'}</strong>
                                {deleteItemModal.lotNumber && <> (Lot: {deleteItemModal.lotNumber})</>}?
                            </p>
                        </div>
                        <div className="flex justify-end gap-2 px-4 py-3 border-t border-gray-200 bg-gray-50">
                            <button onClick={() => setDeleteItemModal(null)} className="px-3 py-1.5 text-xs rounded border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors">Cancel</button>
                            <button onClick={handleDeleteItem} disabled={isItemActionLoading} className="inline-flex items-center gap-1 px-3 py-1.5 text-xs rounded bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 transition-colors">
                                {isItemActionLoading ? <><Loader2 className="w-3.5 h-3.5 animate-spin" />Deleting...</> : 'Delete'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Edit Modal ────────────────────────────────── */}
            {editModal && (
                <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-md flex items-center justify-center z-50 p-4" onClick={() => setEditModal(false)}>
                    <div className="bg-white rounded-lg max-w-md w-full shadow-xl" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-gray-50">
                            <h2 className="text-sm font-semibold text-gray-900">Edit Return — {tx.licensePlate}</h2>
                            <button onClick={() => setEditModal(false)} className="text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
                        </div>
                        <div className="px-4 py-3 space-y-2">
                            {isLocked && (
                                <div className="bg-yellow-50 border border-yellow-200 rounded px-2.5 py-1.5 mb-1">
                                    <p className="text-[10px] text-yellow-800">Return is locked. Only notes can be updated.</p>
                                </div>
                            )}
                            <div>
                                <label className="block text-[11px] font-medium text-gray-700 mb-0.5">FedEx Tracking Number</label>
                                <input type="text" value={editForm.fedexTracking} onChange={e => setEditForm({ ...editForm, fedexTracking: e.target.value })} disabled={isLocked} className={`w-full px-2.5 py-1.5 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-primary-500 ${isLocked ? 'bg-gray-100 cursor-not-allowed' : ''}`} placeholder="Enter tracking number" />
                            </div>
                            <div>
                                <label className="block text-[11px] font-medium text-gray-700 mb-0.5">FedEx Pickup Confirmation</label>
                                <input type="text" value={editForm.fedexPickupConfirmation} onChange={e => setEditForm({ ...editForm, fedexPickupConfirmation: e.target.value })} disabled={isLocked} className={`w-full px-2.5 py-1.5 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-primary-500 ${isLocked ? 'bg-gray-100 cursor-not-allowed' : ''}`} placeholder="Enter pickup confirmation" />
                            </div>
                            <div>
                                <label className="block text-[11px] font-medium text-gray-700 mb-0.5">Notes</label>
                                <textarea value={editForm.notes} onChange={e => setEditForm({ ...editForm, notes: e.target.value })} rows={3} className="w-full px-2.5 py-1.5 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-primary-500 resize-none" placeholder="Optional notes" />
                            </div>
                        </div>
                        <div className="flex justify-end gap-2 px-4 py-3 border-t border-gray-200 bg-gray-50">
                            <button onClick={() => setEditModal(false)} className="px-3 py-1.5 text-xs rounded border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors">Cancel</button>
                            <button onClick={handleUpdate} disabled={isActionLoading} className="inline-flex items-center gap-1 px-3 py-1.5 text-xs rounded bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-50 transition-colors">
                                {isActionLoading ? <><Loader2 className="w-3.5 h-3.5 animate-spin" />Saving...</> : 'Save Changes'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Status Action Modal ──────────────────────── */}
            {actionModal && (
                <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-md flex items-center justify-center z-50 p-4" onClick={() => setActionModal(null)}>
                    <div className="bg-white rounded-lg max-w-sm w-full shadow-xl" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-gray-50">
                            <h2 className="text-sm font-semibold text-gray-900">
                                {actionModal === 'pause' && 'Pause Return'}
                                {actionModal === 'resume' && 'Resume Return'}
                                {actionModal === 'complete' && 'Mark as Completed'}
                            </h2>
                            <button onClick={() => setActionModal(null)} className="text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
                        </div>
                        <div className="px-4 py-3">
                            <p className="text-xs text-gray-700">
                                Are you sure you want to <strong>{actionModal}</strong> return <strong>{tx.licensePlate}</strong>?
                            </p>
                        </div>
                        <div className="flex justify-end gap-2 px-4 py-3 border-t border-gray-200 bg-gray-50">
                            <button onClick={() => setActionModal(null)} className="px-3 py-1.5 text-xs rounded border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors">Cancel</button>
                            <button onClick={handleStatusAction} disabled={isActionLoading} className="inline-flex items-center gap-1 px-3 py-1.5 text-xs rounded bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-50 transition-colors">
                                {isActionLoading ? <><Loader2 className="w-3.5 h-3.5 animate-spin" />Processing...</> : 'Confirm'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Delete Modal ─────────────────────────────── */}
            {deleteModal && (
                <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-md flex items-center justify-center z-50 p-4" onClick={() => setDeleteModal(false)}>
                    <div className="bg-white rounded-lg max-w-sm w-full shadow-xl" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-gray-50">
                            <h2 className="text-sm font-semibold text-gray-900">Delete Return</h2>
                            <button onClick={() => setDeleteModal(false)} className="text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
                        </div>
                        <div className="px-4 py-3">
                            <p className="text-xs text-gray-700">
                                Are you sure you want to delete return <strong>{tx.licensePlate}</strong>? This action cannot be undone.
                            </p>
                        </div>
                        <div className="flex justify-end gap-2 px-4 py-3 border-t border-gray-200 bg-gray-50">
                            <button onClick={() => setDeleteModal(false)} className="px-3 py-1.5 text-xs rounded border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors">Cancel</button>
                            <button onClick={handleDelete} disabled={isActionLoading} className="inline-flex items-center gap-1 px-3 py-1.5 text-xs rounded bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 transition-colors">
                                {isActionLoading ? <><Loader2 className="w-3.5 h-3.5 animate-spin" />Deleting...</> : 'Delete'}
                            </button>
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
                            <div className={`border rounded-lg p-4 transition-all ${hasTbdItems ? 'opacity-50 pointer-events-none' : ''} ${finalizeStepsDone.printManifest ? 'border-green-200 bg-green-50' : 'border-gray-200 bg-white'}`}>
                                <div className="flex items-start gap-3">
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 font-bold text-sm ${finalizeStepsDone.printManifest ? 'bg-green-500 text-white' : 'bg-blue-500 text-white'}`}>
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
                                                    printHtml('manifest-html', 'manifest');
                                                    markStep({ printManifest: true });
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
                            <div className={`border rounded-lg p-4 transition-all ${hasTbdItems || !finalizeStepsDone.printManifest ? 'opacity-50 pointer-events-none' : ''} ${finalizeStepsDone.fedexEntered ? 'border-green-200 bg-green-50' : 'border-gray-200 bg-white'}`}>
                                <div className="flex items-start gap-3">
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 font-bold text-sm ${finalizeStepsDone.fedexEntered ? 'bg-green-500 text-white' : finalizeStepsDone.printManifest ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-600'}`}>
                                        {finalizeStepsDone.fedexEntered ? <CheckCircle className="w-4 h-4" /> : '2'}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className={`text-sm font-semibold ${finalizeStepsDone.fedexEntered ? 'text-green-800' : 'text-gray-800'}`}>
                                            FedEx / USPS Shipping
                                        </p>
                                        <p className="text-xs text-gray-500 mt-0.5">Create a shipment via FedEx API or enter tracking info manually.</p>
                                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                                            <button
                                                onClick={() => { setFedexMode('api'); setFedexSubModal(true); }}
                                                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-md transition-colors"
                                            >
                                                <Truck className="w-3.5 h-3.5" />
                                                {finalizeStepsDone.fedexEntered ? 'Edit Shipment' : 'Create FedEx Shipment'}
                                            </button>
                                            <button
                                                onClick={() => { setFedexMode('manual'); setFedexSubModal(true); }}
                                                className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-medium rounded-md transition-colors border border-gray-300"
                                            >
                                                <Edit className="w-3.5 h-3.5" />
                                                Enter Manually
                                            </button>
                                            {finalizeStepsDone.fedexEntered && (
                                                <span className="text-xs text-green-700 font-medium flex items-center gap-1">
                                                    <CheckCircle className="w-3.5 h-3.5" /> Done
                                                </span>
                                            )}
                                        </div>
                                        {finalizeStepsDone.fedexEntered && (finalizeForm.fedexTracking.trim() || tx.fedexTracking) && (
                                            <div className="mt-2 text-xs text-gray-600 space-y-0.5">
                                                <p><span className="font-medium">Tracking:</span> <span className="font-mono">{fedexForm.prpNumber || finalizeForm.fedexTracking || tx.fedexTracking || '—'}</span></p>
                                                <p><span className="font-medium">Boxes:</span> {finalizeForm.boxCount || tx.boxCount || '—'}</p>
                                                {fedexForm.packages.filter((p: string) => p.trim()).length > 0 && (
                                                    <p><span className="font-medium">Packages:</span> {fedexForm.packages.filter((p: string) => p.trim()).length} tracking number(s)</p>
                                                )}
                                                {tx.fedexPickupConfirmation && (
                                                    <p><span className="font-medium">Pickup:</span> <span className="font-mono">{tx.fedexPickupConfirmation}</span></p>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* ── Step 3: Print Job Sheets ── */}
                            <div className={`border rounded-lg p-4 transition-all ${hasTbdItems || !finalizeStepsDone.fedexEntered ? 'opacity-50 pointer-events-none' : ''} ${finalizeStepsDone.printJobSheets ? 'border-green-200 bg-green-50' : 'border-gray-200 bg-white'}`}>
                                <div className="flex items-start gap-3">
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 font-bold text-sm ${finalizeStepsDone.printJobSheets ? 'bg-green-500 text-white' : finalizeStepsDone.fedexEntered ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-600'}`}>
                                        {finalizeStepsDone.printJobSheets ? <CheckCircle className="w-4 h-4" /> : '3'}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className={`text-sm font-semibold ${finalizeStepsDone.printJobSheets ? 'text-green-800' : 'text-gray-800'}`}>
                                            Print Job Sheets
                                        </p>
                                        <p className="text-xs text-gray-500 mt-0.5">Print job sheets for all outgoing boxes.</p>
                                        <div className="flex items-center gap-3 mt-2 flex-wrap">
                                            <button
                                                onClick={() => {
                                                    printJobSheet();
                                                    markStep({ printJobSheets: true });
                                                }}
                                                disabled={pdfLoading === 'job-sheet'}
                                                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-md transition-colors disabled:opacity-50"
                                            >
                                                {pdfLoading === 'job-sheet' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileText className="w-3.5 h-3.5" />}
                                                Print Job Sheet
                                            </button>
                                            
                                            {hasCiiItems && (
                                                <button
                                                    onClick={() => {
                                                        downloadPdf('dea-form-222', `dea-form-222-${tx.licensePlate}.pdf`);
                                                        markStep({ printJobSheets: true });
                                                    }}
                                                    disabled={pdfLoading === 'dea-form-222'}
                                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-600 hover:bg-orange-700 text-white text-xs font-medium rounded-md transition-colors disabled:opacity-50"
                                                >
                                                    {pdfLoading === 'dea-form-222' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileText className="w-3.5 h-3.5" />}
                                                    Print DEA Form 222
                                                </button>
                                            )}
                                            
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
                            <div className={`border-2 rounded-lg p-4 transition-all ${hasTbdItems || !finalizeStepsDone.printJobSheets ? 'opacity-50 pointer-events-none' : ''} ${canFinalize ? 'border-green-200 bg-green-50' : 'border-dashed border-gray-200 bg-gray-50'}`}>
                                <div className="flex items-start gap-3">
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 font-bold text-sm ${canFinalize ? 'bg-green-500 text-white' : finalizeStepsDone.printJobSheets ? 'bg-blue-500 text-white' : 'bg-gray-300 text-gray-500'}`}>
                                        {canFinalize ? <CheckCircle className="w-4 h-4" /> : '4'}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className={`text-sm font-semibold ${canFinalize ? 'text-green-800' : 'text-gray-400'}`}>
                                            Finalize Return
                                        </p>
                                        <p className={`text-xs mt-0.5 ${canFinalize ? 'text-green-700' : 'text-gray-400'}`}>
                                            Lock this return permanently. This cannot be undone.
                                        </p>
                                        {!allStepsDone && (
                                            <p className="text-xs text-gray-400 mt-1">Complete steps 1 – 3 above to enable finalization.</p>
                                        )}
                                        {allStepsDone && (
                                            <div className="mt-3">
                                                {hasTbdItems && (
                                                    <div className="bg-red-50 border border-red-200 rounded-md p-2 flex items-start gap-1.5 mb-3">
                                                        <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                                                        <p className="text-xs text-red-700">
                                                            Resolve all TBD items before finalizing.
                                                        </p>
                                                    </div>
                                                )}
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
                                                <tr className="bg-gradient-to-r from-indigo-500 to-indigo-400">
                                                    <th className="px-4 py-3.5 w-8">
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
                                                    <th className="text-left px-4 py-3.5 text-xs font-semibold uppercase tracking-wider whitespace-nowrap text-white whitespace-nowrap">NDC</th>
                                                    <th className="text-left px-4 py-3.5 text-xs font-semibold uppercase tracking-wider whitespace-nowrap text-white whitespace-nowrap">Product</th>
                                                    <th className="text-center px-4 py-3.5 text-xs font-semibold uppercase tracking-wider whitespace-nowrap text-white whitespace-nowrap">QTY</th>
                                                    <th className="text-right px-4 py-3.5 text-xs font-semibold uppercase tracking-wider whitespace-nowrap text-white whitespace-nowrap">Price</th>
                                                    <th className="text-left px-4 py-3.5 text-xs font-semibold uppercase tracking-wider whitespace-nowrap text-white whitespace-nowrap">Shelved</th>
                                                    <th className="text-left px-4 py-3.5 text-xs font-semibold uppercase tracking-wider whitespace-nowrap text-white whitespace-nowrap">Location</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {wcItems.map(item => (
                                                    <tr
                                                        key={item.id}
                                                        className={`border-b border-gray-100 cursor-pointer transition-colors ${wcSelected.has(item.id) ? 'bg-purple-50' : 'hover:bg-gray-50'}`}
                                                        onClick={() => toggleWcSelect(item.id)}
                                                    >
                                                        <td className="px-4 py-3 text-sm">
                                                            <input
                                                                type="checkbox"
                                                                checked={wcSelected.has(item.id)}
                                                                onChange={() => toggleWcSelect(item.id)}
                                                                className="rounded text-purple-600 focus:ring-purple-500"
                                                            />
                                                        </td>
                                                        <td className="px-4 py-3 text-sm font-mono text-gray-900">{item.ndc || '—'}</td>
                                                        <td className="px-4 py-3 text-sm text-gray-900 max-w-[140px] truncate" title={item.productName || ''}>
                                                            <div>
                                                                <p className="truncate">{item.productName || '—'}</p>
                                                                {item.manufacturer && <p className="text-gray-400 text-[10px] truncate">{item.manufacturer}</p>}
                                                            </div>
                                                        </td>
                                                        <td className="px-4 py-3 text-sm text-center text-gray-900">{item.quantity}</td>
                                                        <td className="px-4 py-3 text-sm text-right text-gray-900">
                                                            {item.standardPrice != null ? formatCurrency(item.standardPrice) : '—'}
                                                        </td>
                                                        <td className="px-4 py-3 text-sm text-gray-600">{formatDate(item.dateShelved)}</td>
                                                        <td className="px-4 py-3 text-sm text-gray-600">{item.physicalLocation || '—'}</td>
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

            {/* ── FedEx / USPS Tracking Sub-Modal ─────────── */}
            {fedexSubModal && (
                <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-md flex items-center justify-center z-[60] p-4" onClick={() => { if (!fedexApiLoading && !pickupLoading) setFedexSubModal(false); }}>
                    <div className="bg-white rounded-lg max-w-2xl w-full shadow-xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>

                        {/* Header */}
                        <div className={`p-4 rounded-t-lg ${fedexMode === 'api' ? 'bg-blue-600' : 'bg-amber-400'}`}>
                            <h2 className={`text-center text-lg font-bold ${fedexMode === 'api' ? 'text-white' : 'text-gray-900'}`}>
                                {fedexMode === 'api' ? 'FedEx API Shipment' : 'FedEX or USPS Info'} — <span className="underline font-mono">{tx.licensePlate}</span>
                            </h2>
                        </div>

                        <div className="p-5 flex-1 overflow-y-auto space-y-4">

                            {/* ── API Mode ── */}
                            {fedexMode === 'api' && (
                                <>
                                    {!fedexApiResult ? (
                                        <>
                                            <p className="text-sm text-gray-600 text-center">
                                                Create a FedEx Ground shipment via the FedEx API. Tracking numbers and shipping labels will be generated automatically.
                                            </p>

                                            <div className="flex items-center justify-center gap-4">
                                                <div>
                                                    <label className="text-sm font-medium text-gray-700">Number of Boxes:</label>
                                                    <input
                                                        type="number"
                                                        min="1"
                                                        max="99"
                                                        value={fedexForm.boxCount}
                                                        onChange={e => setFedexForm(prev => ({ ...prev, boxCount: e.target.value }))}
                                                        className="ml-2 w-20 px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-center"
                                                        disabled={fedexApiLoading}
                                                    />
                                                </div>
                                            </div>

                                            <div className="bg-blue-50 border border-blue-200 rounded-md p-3 text-xs text-blue-800 text-center space-y-1">
                                                <p>The shipment will be created as <strong>FedEx Ground</strong> from the pharmacy address to the warehouse.</p>
                                                <p>Make sure both pharmacy and warehouse addresses are configured correctly.</p>
                                            </div>

                                            <div className="flex justify-center">
                                                <button
                                                    onClick={async () => {
                                                        if (!tx) return;
                                                        setFedexApiLoading(true);
                                                        try {
                                                            const result = await dispatch(createFedexShipment({
                                                                id: tx.id,
                                                                boxCount: parseInt(fedexForm.boxCount) || 1,
                                                            }));
                                                            if (createFedexShipment.fulfilled.match(result)) {
                                                                const shipment = result.payload.shipment;
                                                                setFedexApiResult(shipment);
                                                                const updatedPkgs = [...fedexForm.packages];
                                                                shipment.packages.forEach((p, i) => {
                                                                    if (i < 12) updatedPkgs[i] = p.trackingNumber;
                                                                });
                                                                setFedexForm(prev => ({
                                                                    ...prev,
                                                                    prpNumber: shipment.masterTrackingNumber,
                                                                    packages: updatedPkgs,
                                                                    boxCount: String(shipment.packages.length || prev.boxCount),
                                                                }));
                                                                setFinalizeForm(prev => ({
                                                                    ...prev,
                                                                    fedexTracking: shipment.masterTrackingNumber,
                                                                    boxCount: String(shipment.packages.length),
                                                                }));
                                                                markStep({ fedexEntered: true });
                                                                showToast('FedEx shipment created successfully!', 'success');
                                                            } else {
                                                                showToast(result.payload as string || 'Failed to create shipment', 'error');
                                                            }
                                                        } catch {
                                                            showToast('Unexpected error creating shipment', 'error');
                                                        } finally {
                                                            setFedexApiLoading(false);
                                                        }
                                                    }}
                                                    disabled={fedexApiLoading || !fedexForm.boxCount}
                                                    className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-sm font-medium rounded-lg transition-colors"
                                                >
                                                    {fedexApiLoading ? (
                                                        <><Loader2 className="w-4 h-4 animate-spin" /> Creating Shipment...</>
                                                    ) : (
                                                        <><Truck className="w-4 h-4" /> Create FedEx Shipment</>
                                                    )}
                                                </button>
                                            </div>
                                        </>
                                    ) : (
                                        <>
                                            {/* API Result */}
                                            <div className="bg-green-50 border border-green-200 rounded-lg p-4 space-y-3">
                                                <div className="flex items-center gap-2">
                                                    <CheckCircle className="w-5 h-5 text-green-600" />
                                                    <p className="text-sm font-semibold text-green-800">Shipment Created Successfully</p>
                                                </div>
                                                <div className="grid grid-cols-2 gap-2 text-xs">
                                                    <div>
                                                        <span className="text-gray-500">Master Tracking:</span>
                                                        <span className="ml-1 font-mono font-medium text-gray-900">{fedexApiResult.masterTrackingNumber}</span>
                                                    </div>
                                                    <div>
                                                        <span className="text-gray-500">Packages:</span>
                                                        <span className="ml-1 font-medium text-gray-900">{fedexApiResult.packages.length}</span>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Package Tracking Numbers */}
                                            <div className="space-y-2">
                                                <div className="flex items-center justify-between">
                                                    <p className="text-sm font-medium text-gray-700">Package Tracking Numbers:</p>
                                                    <div className="flex items-center gap-1">
                                                        <button
                                                            onClick={printShippingLabels}
                                                            disabled={pdfLoading === 'shipping-labels'}
                                                            className="flex items-center gap-1 px-2 py-1 bg-green-100 hover:bg-green-200 text-xs text-green-700 rounded border border-green-200 transition-colors disabled:opacity-50"
                                                            title="Print all shipping labels"
                                                        >
                                                            <Printer className="w-3 h-3" /> Print Labels
                                                        </button>

                                                    </div>
                                                </div>
                                                <div className="grid grid-cols-1 gap-2">
                                                    {fedexApiResult.packages.map((pkg, i) => (
                                                        <div key={i} className="flex items-center justify-between text-xs">
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-gray-500">Package {i + 1}:</span>
                                                                <span className="font-mono text-gray-900">{pkg.trackingNumber}</span>
                                                            </div>
                                                            <div className="flex items-center gap-1">
                                                                <button
                                                                    onClick={() => printSingleLabel(i + 1)}
                                                                    disabled={pdfLoading === `shipping-label-${i + 1}`}
                                                                    className="flex items-center gap-1 px-1.5 py-0.5 bg-green-50 hover:bg-green-100 text-green-700 rounded border border-green-200 transition-colors disabled:opacity-50"
                                                                    title={`Print shipping label for ${pkg.trackingNumber}`}
                                                                >
                                                                    {pdfLoading === `shipping-label-${i + 1}` ? <Loader2 className="w-3 h-3 animate-spin" /> : <Printer className="w-3 h-3" />}
                                                                </button>

                                                                {pkg.hasLabel && (
                                                                    <a
                                                                        href={`${process.env.NEXT_PUBLIC_API_URL}/return-transactions/${tx.id}/labels/${i + 1}/download`}
                                                                        target="_blank"
                                                                        rel="noreferrer"
                                                                        className="text-blue-600 hover:text-blue-800"
                                                                        title="Download Label"
                                                                    >
                                                                        <Download className="w-3.5 h-3.5" />
                                                                    </a>
                                                                )}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>

                                            {/* Download All Labels */}
                                            {fedexApiResult.packages.some(p => p.hasLabel) && (
                                                <div className="flex justify-center">
                                                    <a
                                                        href={`${process.env.NEXT_PUBLIC_API_URL}/return-transactions/${tx.id}/labels?packageNumber=1`}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        className="flex items-center gap-1.5 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-medium rounded-md border border-gray-300 transition-colors"
                                                    >
                                                        <Printer className="w-3.5 h-3.5" />
                                                        Download Labels
                                                    </a>
                                                </div>
                                            )}

                                            {/* Schedule Pickup */}
                                            <div className="border-t border-gray-200 pt-4 space-y-3">
                                                <p className="text-sm font-medium text-gray-700">Schedule FedEx Pickup (Optional)</p>
                                                <div className="bg-amber-50 border border-amber-200 rounded-md p-3 mb-3">
                                                    <p className="text-xs text-amber-800">
                                                        <strong>Note:</strong> Pickup scheduling may not work in sandbox/test mode. 
                                                        You can also call FedEx directly at <strong>1-800-463-3339</strong> and say &quot;Ground Return Pickup&quot;.
                                                    </p>
                                                </div>
                                                <div className="flex items-center gap-4 flex-wrap">
                                                    <div>
                                                        <label className="text-xs text-gray-500">Pickup Date</label>
                                                        <input
                                                            type="date"
                                                            value={pickupForm.pickupDate}
                                                            onChange={e => setPickupForm(prev => ({ ...prev, pickupDate: e.target.value }))}
                                                            className="block w-36 px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                            disabled={pickupLoading}
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="text-xs text-gray-500">Ready Time</label>
                                                        <input
                                                            type="time"
                                                            value={pickupForm.readyTime}
                                                            onChange={e => setPickupForm(prev => ({ ...prev, readyTime: e.target.value }))}
                                                            className="block w-28 px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                            disabled={pickupLoading}
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="text-xs text-gray-500">Close Time</label>
                                                        <input
                                                            type="time"
                                                            value={pickupForm.closeTime}
                                                            onChange={e => setPickupForm(prev => ({ ...prev, closeTime: e.target.value }))}
                                                            className="block w-28 px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                            disabled={pickupLoading}
                                                        />
                                                    </div>
                                                    <div className="flex items-end">
                                                        <button
                                                            onClick={async () => {
                                                                setPickupLoading(true);
                                                                try {
                                                                    const result = await dispatch(scheduleFedexPickup({
                                                                        id: tx.id,
                                                                        ...pickupForm,
                                                                    }));
                                                                    if (scheduleFedexPickup.fulfilled.match(result)) {
                                                                        showToast(`Pickup scheduled: ${result.payload.pickup.pickupConfirmationNumber}`, 'success');
                                                                    } else {
                                                                        showToast(result.payload as string || 'Failed to schedule pickup', 'error');
                                                                    }
                                                                } catch {
                                                                    showToast('Unexpected error scheduling pickup', 'error');
                                                                } finally {
                                                                    setPickupLoading(false);
                                                                }
                                                            }}
                                                            disabled={pickupLoading}
                                                            className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white text-xs font-medium rounded-md transition-colors"
                                                        >
                                                            {pickupLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Truck className="w-3.5 h-3.5" />}
                                                            Schedule Pickup
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        </>
                                    )}
                                </>
                            )}

                            {/* ── Manual Mode ── */}
                            {fedexMode === 'manual' && (
                                <>
                                    {/* Number of Boxes */}
                                    <div className="text-center">
                                        <label className="text-sm font-medium text-gray-700">Number of Boxes on this Return:</label>
                                        <input
                                            type="number"
                                            min="1"
                                            max="99"
                                            value={fedexForm.boxCount}
                                            onChange={e => setFedexForm(prev => ({ ...prev, boxCount: e.target.value }))}
                                            className="ml-2 w-20 px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500 text-center"
                                        />
                                    </div>

                                    {/* Instructions */}
                                    <div className="text-center text-xs text-gray-600 space-y-1">
                                        <p>For FedEX Call <strong>1-(800) 463-3339</strong> and say &quot;Ground Return Pickup&quot;</p>
                                        <p>Once you have the Fed EX PRP Number Enter Below, Then Scan Tracking BarCodes Into &quot;Package Fields&quot;</p>
                                        <p>If This Is A USPS Shipment Enter &quot;USPS&quot; In the PRP Field, Then Scan Tracking BarCodes Into &quot;Package Fields&quot;</p>
                                    </div>

                                    {/* PRP Number */}
                                    <div className="text-center">
                                        <label className="text-sm font-medium text-gray-700">PRP Number:</label>
                                        <input
                                            type="text"
                                            value={fedexForm.prpNumber}
                                            onChange={e => setFedexForm(prev => ({ ...prev, prpNumber: e.target.value }))}
                                            placeholder="Enter PRP Number or USPS"
                                            className="ml-2 w-64 px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500 font-mono"
                                        />
                                    </div>

                                    <div className="border-t-2 border-amber-400" />

                                    {/* Package Tracking Fields */}
                                    <div className="grid grid-cols-2 gap-x-6 gap-y-2">
                                        {fedexForm.packages.map((val, i) => (
                                            <div key={i} className="flex items-center gap-2">
                                                <label className="text-sm text-gray-700 w-24 text-right flex-shrink-0">Package {i + 1}:</label>
                                                <input
                                                    type="text"
                                                    value={val}
                                                    onChange={e => {
                                                        const updated = [...fedexForm.packages];
                                                        updated[i] = e.target.value;
                                                        setFedexForm(prev => ({ ...prev, packages: updated }));
                                                    }}
                                                    className="flex-1 px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500 font-mono"
                                                />
                                            </div>
                                        ))}
                                    </div>
                                </>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="flex justify-between items-center p-4 border-t border-gray-200 bg-gray-100">
                            {fedexMode === 'manual' ? (
                                <Button
                                    variant="primary"
                                    onClick={() => {
                                        const tracking = fedexForm.prpNumber.trim();
                                        setFinalizeForm(prev => ({
                                            ...prev,
                                            fedexTracking: tracking,
                                            boxCount: fedexForm.boxCount,
                                        }));
                                        if (tracking.length > 0) markStep({ fedexEntered: true });
                                        setFedexSubModal(false);
                                    }}
                                    disabled={!fedexForm.prpNumber.trim()}
                                >
                                    <Truck className="w-4 h-4 mr-1" />
                                    Save FedEX or USPS Info
                                </Button>
                            ) : (
                                <div />
                            )}
                            <Button
                                variant="outline"
                                onClick={() => setFedexSubModal(false)}
                                disabled={fedexApiLoading || pickupLoading}
                            >
                                {fedexApiResult ? 'Close' : 'Cancel'}
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
