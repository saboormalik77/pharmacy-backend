'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import {
    ArrowLeft, Loader2, AlertCircle, X, Play, CheckCircle, Lock,
    Trash2, Edit, ClipboardList, Building2, UserCog, Package, Truck,
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
import {
    formatPartialReturnDetail,
    formatUnitsReturnedForForm,
    getPackageKindFromUnits,
    getReturnItemPackageKind,
    getReturnItemUnitsReturned,
} from '@/lib/utils/returnItemQuantity';

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
    const labelCls = emerald ? 'text-xs font-medium' : 'text-[11px]';
    const valueCls = emerald ? 'text-xs font-bold' : 'text-[11px] font-medium';
    const rowCls = emerald ? 'flex justify-between items-center gap-2' : 'flex justify-between gap-2';
    const valueWrap = `${valueCls} text-right min-w-0 break-words max-w-[65%]`;

    const cityState = [tx.pharmacyCity, tx.pharmacyState].filter(Boolean).join(', ');
    const serviceLabel = tx.serviceType
        ? tx.serviceType.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
        : '—';

    return (
        <dl className={dlCls}>
            <div className={rowCls}>
                <dt className={`${labelCls} shrink-0`} style={{ color: 'var(--on-surface-variant)' }}>Store Name</dt>
                <dd className={valueWrap} style={{ color: 'var(--foreground)' }}>{tx.pharmacyName || '—'}</dd>
            </div>
            {tx.storeNumber ? (
                <div className={rowCls}>
                    <dt className={`${labelCls} shrink-0`} style={{ color: 'var(--on-surface-variant)' }}>Store #</dt>
                    <dd className={`${valueCls} text-right`} style={{ color: 'var(--foreground)' }}>{tx.storeNumber}</dd>
                </div>
            ) : null}
            {tx.pharmacyStreetAddress ? (
                <div className={emerald ? 'flex justify-between items-start gap-2' : 'flex justify-between gap-2 items-start'}>
                    <dt className={`${labelCls} shrink-0`} style={{ color: 'var(--on-surface-variant)' }}>Address</dt>
                    <dd className={valueWrap} style={{ color: 'var(--foreground)' }}>{tx.pharmacyStreetAddress}</dd>
                </div>
            ) : null}
            {cityState ? (
                <div className={emerald ? 'flex justify-between items-start gap-2' : 'flex justify-between gap-2 items-start'}>
                    <dt className={`${labelCls} shrink-0`} style={{ color: 'var(--on-surface-variant)' }}>City / State</dt>
                    <dd className={valueWrap} style={{ color: 'var(--foreground)' }}>{cityState}</dd>
                </div>
            ) : null}
            <div className={rowCls}>
                <dt className={`${labelCls} shrink-0`} style={{ color: 'var(--on-surface-variant)' }}>Service Type</dt>
                <dd className={`${valueCls} text-right min-w-0`} style={{ color: 'var(--foreground)' }}>{serviceLabel}</dd>
            </div>
            {tx.pharmacyLastVisitDate ? (
                <div className={rowCls}>
                    <dt className={`${labelCls} shrink-0`} style={{ color: 'var(--on-surface-variant)' }}>Last Visit</dt>
                    <dd className={`${valueCls} text-right`} style={{ color: 'var(--foreground)' }}>
                        {new Date(tx.pharmacyLastVisitDate).toLocaleDateString()}
                    </dd>
                </div>
            ) : null}
            <div className={rowCls}>
                <dt className={`${labelCls} shrink-0`} style={{ color: 'var(--on-surface-variant)' }}>Processor</dt>
                <dd className={`${valueCls} flex items-center gap-1 justify-end ${emerald ? 'font-semibold' : ''}`} style={{ color: 'var(--foreground)' }}>
                    <UserCog className={emerald ? 'w-3.5 h-3.5 flex-shrink-0' : 'w-3 h-3 flex-shrink-0'} style={{ color: emerald ? 'var(--secondary)' : 'var(--outline)' }} />
                    {tx.processorName || '—'}
                </dd>
            </div>
            
            {/* Shipping Details */}
            {(tx.fedexTracking || tx.fedexPickupConfirmation || tx.fedexShipmentId) && (
                <>
                    <div className="pt-2 border-t" style={{ borderColor: 'var(--outline-variant)' }} />
                    {tx.fedexTracking && (
                        <div className={rowCls}>
                            <dt className={`${labelCls} shrink-0`} style={{ color: 'var(--on-surface-variant)' }}>FedEx Tracking</dt>
                            <dd className={`${valueCls} text-right font-mono`} style={{ color: 'var(--foreground)' }}>{tx.fedexTracking}</dd>
                        </div>
                    )}
                    {tx.fedexPickupConfirmation && (
                        <div className={rowCls}>
                            <dt className={`${labelCls} shrink-0`} style={{ color: 'var(--on-surface-variant)' }}>Pickup Confirmation</dt>
                            <dd className={`${valueCls} text-right font-mono`} style={{ color: 'var(--foreground)' }}>{tx.fedexPickupConfirmation}</dd>
                        </div>
                    )}
                    {tx.fedexShipmentId && (
                        <div className={rowCls}>
                            <dt className={`${labelCls} shrink-0`} style={{ color: 'var(--on-surface-variant)' }}>Shipment ID</dt>
                            <dd className={`${valueCls} text-right font-mono`} style={{ color: 'var(--foreground)' }}>{tx.fedexShipmentId}</dd>
                        </div>
                    )}
                </>
            )}
            
            {/* Package Tracking */}
            {tx.packageTracking && Object.keys(tx.packageTracking).length > 0 && (
                <div className="pt-2 border-t" style={{ borderColor: 'var(--outline-variant)' }}>
                    <dt className={`${labelCls} mb-1`} style={{ color: 'var(--on-surface-variant)' }}>Package Tracking</dt>
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
                                        <span className={`${labelCls} capitalize`} style={{ color: 'var(--on-surface-variant)' }}>{displayKey}</span>
                                        <span className={`${valueCls} font-mono`} style={{ color: 'var(--foreground)' }}>{val}</span>
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
                fullPackageQtyReturned: formatUnitsReturnedForForm(editItemModal),
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
                
                // For single labels, the HTML includes auto-print script
                // For combined labels (shipping-labels endpoint), we handle printing here
                if (endpoint === 'shipping-labels') {
                    // Wait for content and images to load, then print all labels
                    printWindow.onload = () => {
                        // Additional wait for images and resources to load
                        setTimeout(() => {
                            printWindow.print();
                            // Close the window after printing
                            setTimeout(() => {
                                printWindow.close();
                            }, 1500);
                        }, 800);
                    };
                    
                    // Fallback if onload doesn't fire
                    setTimeout(() => {
                        if (printWindow && !printWindow.closed) {
                            printWindow.print();
                            setTimeout(() => {
                                printWindow.close();
                            }, 1500);
                        }
                    }, 2500);
                } else {
                    // For individual labels, just ensure window closes after the auto-print completes
                    printWindow.onload = () => {
                        setTimeout(() => {
                            // Individual labels auto-print, so we just close after delay
                            if (printWindow && !printWindow.closed) {
                                printWindow.close();
                            }
                        }, 2000);
                    };
                }
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
                <Loader2 className="w-10 h-10 animate-spin" style={{ color: 'var(--primary)' }} />
            </div>
        );
    }

    if (error || !tx) {
        return (
            <div className="space-y-4">
                <button onClick={handleBackNavigation} className="flex items-center gap-2 text-sm" style={{ color: 'var(--on-surface-variant)' }}>
                    <ArrowLeft className="w-4 h-4" /> Back
                </button>
                <div className="border rounded-[4px] p-6 text-center" style={{ backgroundColor: 'var(--error-container)', borderColor: 'var(--outline-variant)' }}>
                    <AlertCircle className="w-10 h-10 mx-auto mb-3" style={{ color: 'var(--error)' }} />
                    <p className="font-medium" style={{ color: '#000000' }}>{error || 'Return transaction not found.'}</p>
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
                <div className="border rounded-[4px] px-3 py-2" style={{ backgroundColor: 'var(--tertiary-fixed)', borderColor: 'var(--outline-variant)' }}>
                    <div className="flex items-center gap-2">
                        <Lock className="w-3.5 h-3.5 flex-shrink-0" style={{ color: 'var(--tertiary)' }} />
                        <div>
                            <p className="text-xs font-semibold" style={{ color: 'var(--on-tertiary-container)' }}>Partially Locked — Core data is frozen</p>
                            <p className="text-[10px]" style={{ color: 'var(--on-tertiary-container)' }}>Item classification (status, destination, memo) and return notes can still be updated. Quantity, price, and other core fields are locked.</p>
                        </div>
                    </div>
                </div>
            )}


            {/* Back + Header */}
            <div>
                <button onClick={handleBackNavigation} className="flex items-center gap-1.5 text-xs mb-1.5" style={{ color: 'var(--on-surface-variant)' }}>
                    <ArrowLeft className="w-3.5 h-3.5" /> Back
                </button>
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                    <div className="flex items-center gap-2">
                        <h1 className="text-base font-bold font-mono" style={{ color: 'var(--foreground)' }}>{tx.licensePlate}</h1>
                        <Badge variant={badge.variant}><span className="text-[10px]">{badge.label}</span></Badge>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                        {canDoAction(tx, 'resume') && canEdit && (
                            <button onClick={() => checkActionWithToast('resume return', () => setActionModal('resume'))} className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium border transition-colors hover:bg-primary-50/40" style={{ backgroundColor: 'var(--secondary-container)', color: 'var(--on-secondary-container)', borderColor: 'var(--outline-variant)' }}>
                                <Play className="w-3 h-3" /> Resume
                            </button>
                        )}
                        {canDoAction(tx, 'complete') && canEdit && (
                            <button onClick={() => checkActionWithToast('complete return', () => setActionModal('complete'))} className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium bg-primary-600 text-white hover:bg-primary-700 transition-colors">
                                <CheckCircle className="w-3 h-3" /> Complete
                            </button>
                        )}
                        {canDoAction(tx, 'finalize') && canEdit && (
                            <button onClick={() => checkActionWithToast('finalize return', () => openFinalizeModal())} className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium text-white transition-colors" style={{ backgroundColor: 'var(--error)' }}>
                                <Lock className="w-3 h-3" /> Finalize
                            </button>
                        )}
                        {(tx.status === 'completed' || tx.status === 'finalized') && (tx.fedexTracking || (tx.packageTracking && Object.keys(tx.packageTracking).length > 0)) && (
                            <button
                                onClick={printJobSheet}
                                disabled={pdfLoading === 'job-sheet'}
                                className="inline-flex items-center px-3 py-1.5 text-sm font-medium border rounded-[4px] shadow-sm transition-colors disabled:opacity-50 hover:bg-primary-50/40"
                                style={{ color: 'var(--on-surface)', backgroundColor: 'var(--surface-container-lowest)', borderColor: 'var(--outline-variant)' }}
                                title="Print job sheet with addresses and barcodes"
                            >
                                {pdfLoading === 'job-sheet' ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <FileText className="w-4 h-4 mr-1" />}
                                Print Job Sheet
                            </button>
                        )}
                        {canDoAction(tx, 'delete') && canEdit && (
                            <button onClick={() => checkActionWithToast('delete return', () => setDeleteModal(true))} className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium border transition-colors hover:bg-primary-50/40" style={{ backgroundColor: 'var(--error-container)', color: '#000000', borderColor: 'var(--outline-variant)' }}>
                                <Trash2 className="w-3 h-3" /> Delete
                            </button>
                        )}
                        {canDoAction(tx, 'delete') && !canEdit && (
                            <button disabled className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium border cursor-not-allowed" style={{ backgroundColor: 'var(--surface-container-low)', color: 'var(--on-surface-variant)', borderColor: 'var(--outline-variant)' }}>
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
                <div className="rounded-[4px] shadow px-4 py-3 border" style={{ backgroundColor: 'var(--surface-container-lowest)', borderColor: 'var(--outline-variant)' }}>
                    <h2 className="text-[10px] font-semibold uppercase tracking-wider mb-2 flex items-center gap-1.5" style={{ color: 'var(--on-surface-variant)' }}>
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
                                        <span className="text-[10px] font-medium" style={{ color: 'var(--primary)' }}>Assigned</span>
                                        <button
                                            onClick={() => handleUnassignFromBatch()}
                                            className="text-[9px] underline ml-1"
                                            style={{ color: 'var(--error)' }}
                                            title="Remove from batch"
                                        >
                                            Remove
                                        </button>
                                    </div>
                                )
                            }] : [{ label: 'Batch Assignment', value: <span style={{ color: 'var(--on-surface-variant)' }}>Not assigned</span> }]),
                        ].map(({ label, value }) => (
                            <div key={label} className="flex justify-between">
                                <dt className="text-[11px]" style={{ color: 'var(--on-surface-variant)' }}>{label}</dt>
                                <dd className="text-[11px]" style={{ color: 'var(--foreground)' }}>{value}</dd>
                            </div>
                        ))}
                        {tx.notes && (
                            <div className="pt-1.5 border-t" style={{ borderColor: 'var(--outline-variant)' }}>
                                <dt className="text-[11px] mb-0.5" style={{ color: 'var(--on-surface-variant)' }}>Notes</dt>
                                <dd className="text-[11px]" style={{ color: 'var(--on-surface)' }}>{tx.notes}</dd>
                            </div>
                        )}
                    </dl>
                </div>

                {/* Store & Processor */}
                <div className="rounded-[4px] shadow px-4 py-3 border" style={{ backgroundColor: 'var(--surface-container-lowest)', borderColor: 'var(--outline-variant)' }}>
                    <h2 className="text-[10px] font-semibold uppercase tracking-wider mb-2 flex items-center gap-1.5" style={{ color: 'var(--on-surface-variant)' }}>
                        <Building2 className="w-3.5 h-3.5" /> Store & Processor
                    </h2>
                    <ReturnTransactionStoreAndProcessorDl tx={tx} variant="plain" />
                </div>

                {/* Values */}
                <div className="rounded-[4px] shadow px-4 py-3 border" style={{ backgroundColor: 'var(--surface-container-lowest)', borderColor: 'var(--outline-variant)' }}>
                    <h2 className="text-[10px] font-semibold uppercase tracking-wider mb-2 flex items-center gap-1.5" style={{ color: 'var(--on-surface-variant)' }}>
                        <Package className="w-3.5 h-3.5" /> Items & Values
                    </h2>
                    <dl className="space-y-1.5">
                        <div className="flex justify-between">
                            <dt className="text-[11px]" style={{ color: 'var(--on-surface-variant)' }}>Total Items</dt>
                            <dd className="text-[11px] font-semibold" style={{ color: 'var(--foreground)' }}>{nonWcReturnableAndTbdItemsCount}</dd>
                        </div>
                        <div className="flex justify-between">
                            <dt className="text-[11px]" style={{ color: 'var(--on-surface-variant)' }}>Returnable Value</dt>
                            <dd className="text-[11px] font-semibold" style={{ color: 'var(--secondary)' }}>{formatCurrency(nonWcReturnableValue)}</dd>
                        </div>
                        <div className="flex justify-between pt-1.5 border-t" style={{ borderColor: 'var(--outline-variant)' }}>
                            <dt className="text-[11px] font-medium" style={{ color: 'var(--on-surface-variant)' }}>Total Value</dt>
                            <dd className="text-[11px] font-bold" style={{ color: 'var(--foreground)' }}>{formatCurrency(nonWcTotalValue)}</dd>
                        </div>
                    </dl>
                </div>

                    {/* Shipping & Processing */}
                    <div className="rounded-[4px] shadow px-4 py-3 border" style={{ backgroundColor: 'var(--surface-container-lowest)', borderColor: 'var(--outline-variant)' }}>
                        <h2 className="text-[10px] font-semibold uppercase tracking-wider mb-2 flex items-center gap-1.5" style={{ color: 'var(--on-surface-variant)' }}>
                            <Truck className="w-3.5 h-3.5" /> Shipping & Processing
                        </h2>
                        <dl className="space-y-1.5">
                            <div className="flex justify-between">
                                <dt className="text-[11px]" style={{ color: 'var(--on-surface-variant)' }}>FedEx Tracking</dt>
                                <dd className="text-[11px] font-mono" style={{ color: 'var(--foreground)' }}>{tx.fedexTracking || '—'}</dd>
                            </div>
                            <div className="flex justify-between">
                                <dt className="text-[11px]" style={{ color: 'var(--on-surface-variant)' }}>Pickup Confirmation</dt>
                                <dd className="text-[11px]" style={{ color: 'var(--foreground)' }}>{tx.fedexPickupConfirmation || '—'}</dd>
                            </div>
                            {tx.receivedInWarehouseDate && (
                                <div className="flex justify-between">
                                    <dt className="text-[11px]" style={{ color: 'var(--on-surface-variant)' }}>Received in Warehouse</dt>
                                    <dd className="text-[11px]" style={{ color: 'var(--foreground)' }}>{formatDate(tx.receivedInWarehouseDate)}</dd>
                                </div>
                            )}
                        {tx.boxCount != null && (
                            <div className="flex justify-between">
                                <dt className="text-[11px]" style={{ color: 'var(--on-surface-variant)' }}>Box Count</dt>
                                <dd className="text-[11px] font-semibold" style={{ color: 'var(--foreground)' }}>{tx.boxCount}</dd>
                            </div>
                        )}
                        {tx.prpNumber && (
                            <div className="flex justify-between">
                                <dt className="text-[11px]" style={{ color: 'var(--on-surface-variant)' }}>PRP Number</dt>
                                <dd className="font-mono text-xs" style={{ color: 'var(--foreground)' }}>{tx.prpNumber}</dd>
                            </div>
                        )}
                        {tx.fedexShipmentId && (
                            <div className="flex justify-between">
                                <dt className="text-[11px]" style={{ color: 'var(--on-surface-variant)' }}>Shipment ID</dt>
                                <dd className="font-mono text-xs" style={{ color: 'var(--foreground)' }}>{tx.fedexShipmentId}</dd>
                            </div>
                        )}
                        {tx.packageTracking && Object.keys(tx.packageTracking).length > 0 && (
                            <div className="pt-2 border-t" style={{ borderColor: 'var(--outline-variant)' }}>
                                <dt className="mb-1 flex items-center justify-between" style={{ color: 'var(--on-surface-variant)' }}>
                                    <span>Package Tracking</span>
                                    <div className="flex items-center gap-1">
                                        <button
                                            onClick={printShippingLabels}
                                            disabled={pdfLoading === 'shipping-labels'}
                                            className="flex items-center gap-1 px-2 py-1 text-xs rounded border transition-colors disabled:opacity-50 hover:bg-primary-50/40"
                                            style={{ backgroundColor: 'var(--secondary-container)', color: 'var(--on-secondary-container)', borderColor: 'var(--outline-variant)' }}
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
                                                <span className="capitalize" style={{ color: 'var(--on-surface-variant)' }}>{key.replace(/([0-9]+)/, ' $1')}</span>
                                                <div className="flex items-center gap-1.5">
                                                    <span className="font-mono" style={{ color: 'var(--foreground)' }}>{val}</span>
                                                    <button
                                                        onClick={() => printSingleLabel(idx + 1)}
                                                        disabled={pdfLoading === `shipping-label-${idx + 1}`}
                                                        className="flex items-center gap-0.5 px-1.5 py-0.5 rounded border transition-colors disabled:opacity-50 hover:bg-primary-50/40"
                                                        style={{ backgroundColor: 'var(--surface-container-low)', color: 'var(--on-surface)', borderColor: 'var(--outline-variant)' }}
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
                            <div className="pt-2 border-t" style={{ borderColor: 'var(--outline-variant)' }}>
                                <dt className="mb-1 flex items-center gap-1" style={{ color: 'var(--on-surface-variant)' }}><Printer className="w-3.5 h-3.5" /> Shipping Labels</dt>
                                <dd className="flex flex-wrap gap-2">
                                    {Object.keys(tx.fedexLabels).map((key) => {
                                        const num = key.replace('package', '');
                                        return (
                                            <a
                                                key={key}
                                                href={`${process.env.NEXT_PUBLIC_API_URL}/return-transactions/${tx.id}/labels/${num}/download`}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="flex items-center gap-1 px-2 py-1 text-xs rounded border transition-colors hover:bg-primary-50/40"
                                                style={{ backgroundColor: 'var(--surface-container-low)', color: 'var(--on-surface)', borderColor: 'var(--outline-variant)' }}
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
                /* Layout without Shipping & Processing */
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {/* General Information */}
                    <div className="rounded-[4px] shadow-sm border px-5 py-4 hover:shadow-md transition-shadow" style={{ backgroundColor: 'var(--surface-container-lowest)', borderColor: 'var(--outline-variant)' }}>
                        <h2 className="text-xs font-bold uppercase tracking-wider mb-3 flex items-center gap-2" style={{ color: 'var(--foreground)' }}>
                            <div className="p-1.5 rounded-[4px]" style={{ backgroundColor: 'var(--primary-container)' }}>
                                <ClipboardList className="w-4 h-4" style={{ color: 'var(--primary)' }} />
                            </div>
                            General Information
                        </h2>
                        <dl className="space-y-2.5">
                            {[
                                { label: 'License Plate', value: <span className="font-mono font-bold" style={{ color: 'var(--foreground)' }}>{tx.licensePlate}</span> },
                                { label: 'Service Type', value: tx.serviceType.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) },
                                { label: 'Created', value: formatDate(tx.createdAt) },
                                { label: 'Last Updated', value: formatDate(tx.updatedAt) },
                                ...(tx.finalizedAt ? [{ label: 'Finalized', value: formatDate(tx.finalizedAt) }] : []),
                                ...(tx.batchId ? [{ 
                                    label: 'Batch Assignment', 
                                    value: (
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs font-medium" style={{ color: 'var(--primary)' }}>Assigned to Batch</span>
                                            <button
                                                onClick={() => handleUnassignFromBatch()}
                                                className="text-xs underline"
                                                style={{ color: 'var(--error)' }}
                                                title="Remove from batch"
                                            >
                                                Remove
                                            </button>
                                        </div>
                                    )
                                }] : [{ label: 'Batch Assignment', value: <span style={{ color: 'var(--on-surface-variant)' }}>Not assigned</span> }]),
                            ].map(({ label, value }) => (
                                <div key={label} className="flex justify-between items-center">
                                    <dt className="text-xs font-medium" style={{ color: 'var(--on-surface-variant)' }}>{label}</dt>
                                    <dd className="text-xs font-semibold" style={{ color: 'var(--foreground)' }}>{value}</dd>
                                </div>
                            ))}
                            {tx.notes && (
                                <div className="pt-2 border-t" style={{ borderColor: 'var(--outline-variant)' }}>
                                    <dt className="text-xs font-medium mb-1" style={{ color: 'var(--on-surface-variant)' }}>Notes</dt>
                                    <dd className="text-xs rounded px-2 py-1 border" style={{ color: 'var(--on-surface)', backgroundColor: 'var(--surface-container-low)', borderColor: 'var(--outline-variant)' }}>{tx.notes}</dd>
                                </div>
                            )}
                        </dl>
                    </div>

                    {/* Store & Processor */}
                    <div className="rounded-[4px] shadow-sm border px-5 py-4 hover:shadow-md transition-shadow" style={{ backgroundColor: 'var(--surface-container-lowest)', borderColor: 'var(--outline-variant)' }}>
                        <h2 className="text-xs font-bold uppercase tracking-wider mb-3 flex items-center gap-2" style={{ color: 'var(--foreground)' }}>
                            <div className="p-1.5 rounded-[4px]" style={{ backgroundColor: 'var(--secondary-container)' }}>
                                <Building2 className="w-4 h-4" style={{ color: 'var(--secondary)' }} />
                            </div>
                            Store & Processor
                        </h2>
                        <ReturnTransactionStoreAndProcessorDl tx={tx} variant="emerald" />
                    </div>


                </div>
            )}

            {/* ── Documents Section (post-finalization) ──────── */}
            {isFinalized && (
                <div className="rounded-[4px] shadow px-4 py-3 border" style={{ backgroundColor: 'var(--surface-container-lowest)', borderColor: 'var(--outline-variant)' }}>
                    <h2 className="text-[10px] font-semibold uppercase tracking-wider mb-2 flex items-center gap-1.5" style={{ color: 'var(--on-surface-variant)' }}>
                        <FileText className="w-3.5 h-3.5" /> Documents
                    </h2>
                    <div className="flex flex-wrap gap-2">
                        <button
                            onClick={() => downloadPdf('manifest', `manifest-${tx.licensePlate}.pdf`)}
                            disabled={pdfLoading === 'manifest'}
                            className="flex items-center gap-1.5 px-3 py-1.5 border rounded text-xs font-medium transition-colors disabled:opacity-50 hover:bg-primary-50/40"
                            style={{ backgroundColor: 'var(--primary-container)', borderColor: 'var(--outline-variant)', color: 'var(--on-primary-container)' }}
                        >
                            {pdfLoading === 'manifest' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                            Download Manifest
                        </button>
                    </div>
                    {tx.manifestGeneratedAt && (
                        <p className="text-[10px] mt-2" style={{ color: 'var(--on-surface-variant)' }}>Manifest last generated: {formatDate(tx.manifestGeneratedAt)}</p>
                    )}
                </div>
            )}

            {/* ── Items Section ──────────────────────────────── */}
            <div className="rounded-[4px] shadow px-4 py-3 border" style={{ backgroundColor: 'var(--surface-container-lowest)', borderColor: 'var(--outline-variant)' }}>
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-2">
                    <h2 className="text-[10px] font-semibold uppercase tracking-wider flex items-center gap-1.5" style={{ color: 'var(--on-surface-variant)' }}>
                        <ScanLine className="w-3.5 h-3.5" /> Products ({nonWcItems.length})
                    </h2>
                    {isProcessor && canAddDeleteItems && (
                        <div className="flex gap-1.5">
                            <button onClick={() => router.push(`/warehouse/returns/${id}/add-items`)} className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium bg-primary-600 text-white hover:bg-primary-700 transition-colors">
                                <Plus className="w-3 h-3" /> Add Items
                            </button>
                            <button onClick={() => openWcModal()} className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium border transition-colors hover:bg-primary-50/40" style={{ borderColor: 'var(--outline-variant)', backgroundColor: 'var(--surface-container-lowest)', color: 'var(--on-surface)' }}>
                                <Archive className="w-3 h-3" /> Wine Cellar Items
                            </button>
                        </div>
                    )}
                    {isProcessor && canDoAction(tx, 'edit') && !canEdit && (
                        <div className="flex gap-1.5">
                            <button disabled className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium border cursor-not-allowed" style={{ backgroundColor: 'var(--surface-container-low)', color: 'var(--on-surface-variant)', borderColor: 'var(--outline-variant)' }}>
                                <Lock className="w-3 h-3" /> Locked
                            </button>
                        </div>
                    )}
                </div>



                {/* Items Filters */}
                <div className="flex flex-col sm:flex-row gap-1.5 mb-2">
                    <div className="relative flex-1">
                        <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2" style={{ color: 'var(--outline)' }} />
                        <input
                            type="text"
                            value={itemSearch}
                            onChange={e => setItemSearch(e.target.value)}
                            placeholder="Search by NDC, name, manufacturer, lot..."
                            className="w-full pl-8 pr-3 py-1 text-xs border rounded focus:outline-none focus:ring-1 focus:ring-primary-500"
                            style={{ borderColor: 'var(--outline-variant)', backgroundColor: 'var(--surface-container-low)' }}
                        />
                    </div>
                    <select
                        value={itemStatusFilter}
                        onChange={e => setItemStatusFilter(e.target.value)}
                        className="px-2.5 py-1 text-xs border rounded focus:outline-none focus:ring-1 focus:ring-primary-500"
                        style={{ borderColor: 'var(--outline-variant)', backgroundColor: 'var(--surface-container-low)' }}
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
                        <Loader2 className="w-5 h-5 animate-spin" style={{ color: 'var(--primary)' }} />
                    </div>
                ) : nonWcItems.length === 0 ? (
                    <div className="text-center py-6">
                        <Package className="w-10 h-10 mx-auto mb-2" style={{ color: 'var(--outline-variant)' }} />
                        <p className="text-xs font-medium" style={{ color: 'var(--on-surface-variant)' }}>No items yet</p>
                        {isProcessor && canAddDeleteItems && (
                            <button onClick={() => router.push(`/warehouse/returns/${id}/add-items`)} className="mt-2 inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium bg-primary-600 text-white hover:bg-primary-700 transition-colors">
                                <Plus className="w-3 h-3" /> Start Scanning
                            </button>
                        )}
                        {isProcessor && canDoAction(tx, 'edit') && !canEdit && (
                            <button disabled className="mt-2 inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium border cursor-not-allowed" style={{ backgroundColor: 'var(--surface-container-low)', color: 'var(--on-surface-variant)', borderColor: 'var(--outline-variant)' }}>
                                <Lock className="w-3 h-3" /> Locked
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full table-auto text-sm border" style={{ borderColor: 'var(--outline)' }}>
                            <thead className="bg-[var(--surface-container-low)] border-b" style={{ borderColor: 'var(--outline)', borderBottomWidth: '1.5px' }}>
                                <tr className="bg-[var(--surface-container-low)]">
                                    <th className="text-left px-3 py-3 text-xs font-semibold uppercase tracking-wider text-[var(--on-surface-variant)] w-28">NDC</th>
                                    <th className="text-left px-3 py-3 text-xs font-semibold uppercase tracking-wider text-[var(--on-surface-variant)]">Name</th>
                                    <th className="text-left px-3 py-3 text-xs font-semibold uppercase tracking-wider text-[var(--on-surface-variant)]">Manufacturer</th>
                                    <th className="text-center px-3 py-3 text-xs font-semibold uppercase tracking-wider text-[var(--on-surface-variant)] w-16">Pkg Size</th>
                                    <th className="text-center px-3 py-3 text-xs font-semibold uppercase tracking-wider text-[var(--on-surface-variant)] w-20">Qty Returned</th>
                                    <th className="text-left px-3 py-3 text-xs font-semibold uppercase tracking-wider text-[var(--on-surface-variant)] w-28">Serial#</th>
                                    <th className="text-left px-3 py-3 text-xs font-semibold uppercase tracking-wider text-[var(--on-surface-variant)] whitespace-nowrap">Expires</th>
                                    <th className="text-left px-3 py-3 text-xs font-semibold uppercase tracking-wider text-[var(--on-surface-variant)] whitespace-nowrap">Status</th>
                                    <th className="text-left px-3 py-3 text-xs font-semibold uppercase tracking-wider text-[var(--on-surface-variant)] whitespace-nowrap">Destination</th>
                                    <th className="text-right px-3 py-3 text-xs font-semibold uppercase tracking-wider text-[var(--on-surface-variant)] whitespace-nowrap">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y" style={{ borderColor: 'var(--outline-variant)' }}>
                                {nonWcItems.map((item) => {
                                    const sBadge = getItemStatusBadge(item.returnStatus);
                                    return (
                                        <tr key={item.id} className="hover:bg-primary-50/40" style={{ backgroundColor: 'var(--surface-container-lowest)' }}>
                                            <td className="px-3 py-3 text-xs font-mono w-28 whitespace-nowrap" style={{ color: 'var(--foreground)' }}>{item.ndc || '—'}</td>
                                            <td className="px-3 py-3 text-xs max-w-[130px] truncate" style={{ color: 'var(--foreground)' }} title={item.proprietaryName || ''}>
                                                {item.proprietaryName || item.genericName || '—'}
                                            </td>
                                            <td className="px-3 py-3 text-xs max-w-[110px] truncate" style={{ color: 'var(--on-surface-variant)' }} title={item.manufacturer || ''}>
                                                {item.manufacturer || '—'}
                                            </td>
                                            <td className="px-3 py-3 text-xs text-center w-16 whitespace-nowrap" style={{ color: 'var(--foreground)' }}>
                                                {item.fullPackageSize || '—'}
                                            </td>
                                            <td className="px-3 py-3 text-xs text-center w-20 whitespace-nowrap" style={{ color: 'var(--foreground)' }}>
                                                {(() => {
                                                    const units = getReturnItemUnitsReturned(item);
                                                    const kind = getReturnItemPackageKind(item);
                                                    const partialDetail = formatPartialReturnDetail(item);
                                                    return (
                                                        <div className="flex flex-col gap-0.5 items-center">
                                                            <span className="text-xs font-medium" style={{ color: 'var(--foreground)' }}>{units || '—'}</span>
                                                            {kind === 'full' && (
                                                                <Badge variant="success"><span className="text-[10px]">Full Package</span></Badge>
                                                            )}
                                                            {kind === 'partial' && (
                                                                <Badge variant="warning"><span className="text-[10px]">Partial</span></Badge>
                                                            )}
                                                            {partialDetail && (
                                                                <span className="text-[10px]" style={{ color: 'var(--on-surface-variant)' }}>{partialDetail}</span>
                                                            )}
                                                        </div>
                                                    );
                                                })()}
                                            </td>
                                            <td className="px-3 py-3 text-xs font-mono w-28 max-w-[7rem]" style={{ color: 'var(--on-surface-variant)' }}>
                                                <span className="block truncate" title={item.serialNumber || ''}>
                                                    {item.serialNumber || '—'}
                                                </span>
                                            </td>
                                            <td className="px-3 py-3 text-xs whitespace-nowrap" style={{ color: 'var(--on-surface-variant)' }}>
                                                {item.expirationDate ? formatDate(item.expirationDate) : '—'}
                                            </td>
                                            <td className="px-3 py-3 text-xs whitespace-nowrap">
                                                <div className="flex items-center gap-1">
                                                    <Badge variant={sBadge.variant}><span className="text-[10px]">{sBadge.label}</span></Badge>
                                                    {item.wineCellarId && (
                                                        <Badge variant="info"><span className="text-[10px]"><Archive className="w-2.5 h-2.5 mr-0.5 inline" />WC</span></Badge>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-3 py-3 text-xs whitespace-nowrap" style={{ color: 'var(--on-surface-variant)' }}>
                                                {item.returnStatus === 'returnable' ? (
                                                    item.destination ? (
                                                        <span className="capitalize font-medium" style={{ color: 'var(--foreground)' }}>{item.destination}</span>
                                                    ) : (
                                                        <span className="font-medium" style={{ color: 'var(--tertiary)' }}>Missing</span>
                                                    )
                                                ) : '—'}
                                            </td>
                                            <td className="px-3 py-3 text-xs whitespace-nowrap">
                                                <div className="flex items-center justify-end gap-0.5">
                                                    {canAddDeleteItems && item.nonReturnableReason === 'date' && !item.wineCellarId && (
                                                        <button onClick={() => handleMoveToWineCellar(item)} className="p-1 rounded" style={{ color: 'var(--outline)' }} title="Move to Wine Cellar">
                                                            <Archive className="w-3 h-3" />
                                                        </button>
                                                    )}
                                                    {canAddDeleteItems && (
                                                        <button onClick={() => setEditItemModal(item)} className="p-1 rounded" style={{ color: 'var(--outline)' }} title={isLocked ? 'Edit classification' : 'Edit item'}>
                                                            <Edit className="w-3 h-3" />
                                                        </button>
                                                    )}
                                                    {canAddDeleteItems && (
                                                        <button onClick={() => setDeleteItemModal(item)} className="p-1 rounded" style={{ color: 'var(--outline)' }} title="Delete item">
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
                <div className="fixed inset-0 backdrop-blur-md flex items-center justify-center z-50 p-4" style={{ backgroundColor: 'color-mix(in srgb, var(--inverse-surface) 55%, transparent)' }} onClick={() => setEditItemModal(null)}>
                    <div className="rounded-[4px] max-w-sm w-full shadow-xl border" style={{ backgroundColor: 'var(--surface-container-lowest)', borderColor: 'var(--outline-variant)' }} onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: 'var(--outline-variant)', backgroundColor: 'var(--surface-container-low)' }}>
                            <h2 className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>Edit Item</h2>
                            <button onClick={() => setEditItemModal(null)} style={{ color: 'var(--outline)' }}><X className="w-4 h-4" /></button>
                        </div>
                        <div className="px-4 py-3">
                            <p className="text-[11px] mb-2" style={{ color: 'var(--on-surface-variant)' }}>{editItemModal.proprietaryName || editItemModal.ndc} — Lot: {editItemModal.lotNumber || '—'}</p>
                            {isLocked && (
                                <div className="border rounded px-2.5 py-1.5 mb-2" style={{ backgroundColor: 'var(--tertiary-fixed)', borderColor: 'var(--outline-variant)' }}>
                                    <p className="text-[10px]" style={{ color: 'var(--on-tertiary-container)' }}>Core data (pkg size, qty, price) is locked. Classification fields can still be updated.</p>
                                </div>
                            )}
                            <div className="space-y-2">
                                <div>
                                    <label className="block text-[11px] font-medium mb-0.5" style={{ color: 'var(--on-surface)' }}>Quantity</label>
                                    <div className="grid grid-cols-3 gap-2 text-xs">
                                        <div>
                                            <label className="block text-[10px] mb-0.5" style={{ color: 'var(--on-surface-variant)' }}>Package Size (units/pkg)</label>
                                            <div className="text-center py-1.5 border rounded" style={{ backgroundColor: 'var(--surface-container-low)', borderColor: 'var(--outline-variant)' }}>
                                                {editItemForm.fullPackageSize || '—'}
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-[10px] mb-0.5" style={{ color: 'var(--on-surface-variant)' }}>Qty Returned (units)</label>
                                            <input 
                                                type="number" 
                                                min="0" 
                                                max={editItemForm.fullPackageSize || undefined}
                                                value={editItemForm.fullPackageQtyReturned} 
                                                onChange={e => setEditItemForm({ ...editItemForm, fullPackageQtyReturned: e.target.value })} 
                                                disabled={isLocked} 
                                                className={`w-full px-2 py-1.5 text-center text-xs border rounded focus:outline-none focus:ring-1 focus:ring-primary-500 ${isLocked ? 'cursor-not-allowed' : ''}`} 
                                                style={{ borderColor: 'var(--outline-variant)', backgroundColor: isLocked ? 'var(--surface-container-low)' : 'var(--surface-container-low)' }}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] mb-0.5" style={{ color: 'var(--on-surface-variant)' }}>Return Type</label>
                                            <div className="flex flex-col items-center justify-center gap-1 py-1.5 border rounded min-h-[34px]" style={{ backgroundColor: 'var(--surface-container-low)', borderColor: 'var(--outline-variant)' }}>
                                                {(() => {
                                                    const pkgSize = parseInt(editItemForm.fullPackageSize) || 0;
                                                    const units = parseInt(editItemForm.fullPackageQtyReturned) || 0;
                                                    const kind = getPackageKindFromUnits(pkgSize, units);
                                                    if (kind === 'full') return <Badge variant="success"><span className="text-[10px]">Full</span></Badge>;
                                                    if (kind === 'partial') return <Badge variant="warning"><span className="text-[10px]">Partial</span></Badge>;
                                                    return <span className="text-[10px]" style={{ color: 'var(--on-surface-variant)' }}>—</span>;
                                                })()}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-[11px] font-medium mb-0.5" style={{ color: 'var(--on-surface)' }}>Return Status</label>
                                    <select value={editItemForm.returnStatus} onChange={e => setEditItemForm({ ...editItemForm, returnStatus: e.target.value })} className="w-full px-2.5 py-1.5 text-xs border rounded focus:outline-none focus:ring-1 focus:ring-primary-500" style={{ borderColor: 'var(--outline-variant)', backgroundColor: 'var(--surface-container-low)' }}>
                                        <option value="tbd">TBD</option>
                                        <option value="returnable">Returnable</option>
                                        <option value="non_returnable">Non-Returnable</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[11px] font-medium mb-0.5" style={{ color: 'var(--on-surface)' }}>Memo</label>
                                    <input type="text" value={editItemForm.memo} onChange={e => setEditItemForm({ ...editItemForm, memo: e.target.value })} placeholder="Optional memo" className="w-full px-2.5 py-1.5 text-xs border rounded focus:outline-none focus:ring-1 focus:ring-primary-500" style={{ borderColor: 'var(--outline-variant)', backgroundColor: 'var(--surface-container-low)' }} />
                                </div>
                            </div>
                        </div>
                        <div className="flex justify-end gap-2 px-4 py-3 border-t" style={{ borderColor: 'var(--outline-variant)', backgroundColor: 'var(--surface-container-low)' }}>
                            <button onClick={() => setEditItemModal(null)} className="px-3 py-1.5 text-xs rounded border transition-colors hover:bg-primary-50/40" style={{ borderColor: 'var(--outline-variant)', backgroundColor: 'var(--surface-container-lowest)', color: 'var(--on-surface)' }}>Cancel</button>
                            <button onClick={handleUpdateItem} disabled={isItemActionLoading} className="inline-flex items-center gap-1 px-3 py-1.5 text-xs rounded bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-50 transition-colors">
                                {isItemActionLoading ? <><Loader2 className="w-3.5 h-3.5 animate-spin" />Saving...</> : 'Save'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Delete Item Modal ────────────────────────── */}
            {deleteItemModal && (
                <div className="fixed inset-0 backdrop-blur-md flex items-center justify-center z-50 p-4" style={{ backgroundColor: 'color-mix(in srgb, var(--inverse-surface) 55%, transparent)' }} onClick={() => setDeleteItemModal(null)}>
                    <div className="rounded-[4px] max-w-sm w-full shadow-xl border" style={{ backgroundColor: 'var(--surface-container-lowest)', borderColor: 'var(--outline-variant)' }} onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: 'var(--outline-variant)', backgroundColor: 'var(--surface-container-low)' }}>
                            <h2 className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>Delete Item</h2>
                            <button onClick={() => setDeleteItemModal(null)} style={{ color: 'var(--outline)' }}><X className="w-4 h-4" /></button>
                        </div>
                        <div className="px-4 py-3">
                            <p className="text-xs" style={{ color: 'var(--on-surface)' }}>
                                Delete <strong>{deleteItemModal.proprietaryName || deleteItemModal.ndc || 'this item'}</strong>
                                {deleteItemModal.lotNumber && <> (Lot: {deleteItemModal.lotNumber})</>}?
                            </p>
                        </div>
                        <div className="flex justify-end gap-2 px-4 py-3 border-t" style={{ borderColor: 'var(--outline-variant)', backgroundColor: 'var(--surface-container-low)' }}>
                            <button onClick={() => setDeleteItemModal(null)} className="px-3 py-1.5 text-xs rounded border transition-colors hover:bg-primary-50/40" style={{ borderColor: 'var(--outline-variant)', backgroundColor: 'var(--surface-container-lowest)', color: 'var(--on-surface)' }}>Cancel</button>
                            <button onClick={handleDeleteItem} disabled={isItemActionLoading} className="inline-flex items-center gap-1 px-3 py-1.5 text-xs rounded text-white disabled:opacity-50 transition-colors" style={{ backgroundColor: 'var(--error)' }}>
                                {isItemActionLoading ? <><Loader2 className="w-3.5 h-3.5 animate-spin" />Deleting...</> : 'Delete'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Edit Modal ────────────────────────────────── */}
            {editModal && (
                <div className="fixed inset-0 backdrop-blur-md flex items-center justify-center z-50 p-4" style={{ backgroundColor: 'color-mix(in srgb, var(--inverse-surface) 55%, transparent)' }} onClick={() => setEditModal(false)}>
                    <div className="rounded-[4px] max-w-md w-full shadow-xl border" style={{ backgroundColor: 'var(--surface-container-lowest)', borderColor: 'var(--outline-variant)' }} onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: 'var(--outline-variant)', backgroundColor: 'var(--surface-container-low)' }}>
                            <h2 className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>Edit Return — {tx.licensePlate}</h2>
                            <button onClick={() => setEditModal(false)} style={{ color: 'var(--outline)' }}><X className="w-4 h-4" /></button>
                        </div>
                        <div className="px-4 py-3 space-y-2">
                            {isLocked && (
                                <div className="border rounded px-2.5 py-1.5 mb-1" style={{ backgroundColor: 'var(--tertiary-fixed)', borderColor: 'var(--outline-variant)' }}>
                                    <p className="text-[10px]" style={{ color: 'var(--on-tertiary-container)' }}>Return is locked. Only notes can be updated.</p>
                                </div>
                            )}
                            <div>
                                <label className="block text-[11px] font-medium mb-0.5" style={{ color: 'var(--on-surface)' }}>FedEx Tracking Number</label>
                                <input type="text" value={editForm.fedexTracking} onChange={e => setEditForm({ ...editForm, fedexTracking: e.target.value })} disabled={isLocked} className={`w-full px-2.5 py-1.5 text-xs border rounded focus:outline-none focus:ring-1 focus:ring-primary-500 ${isLocked ? 'cursor-not-allowed' : ''}`} style={{ borderColor: 'var(--outline-variant)', backgroundColor: 'var(--surface-container-low)' }} placeholder="Enter tracking number" />
                            </div>
                            <div>
                                <label className="block text-[11px] font-medium mb-0.5" style={{ color: 'var(--on-surface)' }}>FedEx Pickup Confirmation</label>
                                <input type="text" value={editForm.fedexPickupConfirmation} onChange={e => setEditForm({ ...editForm, fedexPickupConfirmation: e.target.value })} disabled={isLocked} className={`w-full px-2.5 py-1.5 text-xs border rounded focus:outline-none focus:ring-1 focus:ring-primary-500 ${isLocked ? 'cursor-not-allowed' : ''}`} style={{ borderColor: 'var(--outline-variant)', backgroundColor: 'var(--surface-container-low)' }} placeholder="Enter pickup confirmation" />
                            </div>
                            <div>
                                <label className="block text-[11px] font-medium mb-0.5" style={{ color: 'var(--on-surface)' }}>Notes</label>
                                <textarea value={editForm.notes} onChange={e => setEditForm({ ...editForm, notes: e.target.value })} rows={3} className="w-full px-2.5 py-1.5 text-xs border rounded focus:outline-none focus:ring-1 focus:ring-primary-500 resize-none" style={{ borderColor: 'var(--outline-variant)', backgroundColor: 'var(--surface-container-low)' }} placeholder="Optional notes" />
                            </div>
                        </div>
                        <div className="flex justify-end gap-2 px-4 py-3 border-t" style={{ borderColor: 'var(--outline-variant)', backgroundColor: 'var(--surface-container-low)' }}>
                            <button onClick={() => setEditModal(false)} className="px-3 py-1.5 text-xs rounded border transition-colors hover:bg-primary-50/40" style={{ borderColor: 'var(--outline-variant)', backgroundColor: 'var(--surface-container-lowest)', color: 'var(--on-surface)' }}>Cancel</button>
                            <button onClick={handleUpdate} disabled={isActionLoading} className="inline-flex items-center gap-1 px-3 py-1.5 text-xs rounded bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-50 transition-colors">
                                {isActionLoading ? <><Loader2 className="w-3.5 h-3.5 animate-spin" />Saving...</> : 'Save Changes'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Status Action Modal ──────────────────────── */}
            {actionModal && (
                <div className="fixed inset-0 backdrop-blur-md flex items-center justify-center z-50 p-4" style={{ backgroundColor: 'color-mix(in srgb, var(--inverse-surface) 55%, transparent)' }} onClick={() => setActionModal(null)}>
                    <div className="rounded-[4px] max-w-sm w-full shadow-xl border" style={{ backgroundColor: 'var(--surface-container-lowest)', borderColor: 'var(--outline-variant)' }} onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: 'var(--outline-variant)', backgroundColor: 'var(--surface-container-low)' }}>
                            <h2 className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>
                                {actionModal === 'pause' && 'Pause Return'}
                                {actionModal === 'resume' && 'Resume Return'}
                                {actionModal === 'complete' && 'Mark as Completed'}
                            </h2>
                            <button onClick={() => setActionModal(null)} style={{ color: 'var(--outline)' }}><X className="w-4 h-4" /></button>
                        </div>
                        <div className="px-4 py-3">
                            <p className="text-xs" style={{ color: 'var(--on-surface)' }}>
                                Are you sure you want to <strong>{actionModal}</strong> return <strong>{tx.licensePlate}</strong>?
                            </p>
                        </div>
                        <div className="flex justify-end gap-2 px-4 py-3 border-t" style={{ borderColor: 'var(--outline-variant)', backgroundColor: 'var(--surface-container-low)' }}>
                            <button onClick={() => setActionModal(null)} className="px-3 py-1.5 text-xs rounded border transition-colors hover:bg-primary-50/40" style={{ borderColor: 'var(--outline-variant)', backgroundColor: 'var(--surface-container-lowest)', color: 'var(--on-surface)' }}>Cancel</button>
                            <button onClick={handleStatusAction} disabled={isActionLoading} className="inline-flex items-center gap-1 px-3 py-1.5 text-xs rounded bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-50 transition-colors">
                                {isActionLoading ? <><Loader2 className="w-3.5 h-3.5 animate-spin" />Processing...</> : 'Confirm'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Delete Modal ─────────────────────────────── */}
            {deleteModal && (
                <div className="fixed inset-0 backdrop-blur-md flex items-center justify-center z-50 p-4" style={{ backgroundColor: 'color-mix(in srgb, var(--inverse-surface) 55%, transparent)' }} onClick={() => setDeleteModal(false)}>
                    <div className="rounded-[4px] max-w-sm w-full shadow-xl border" style={{ backgroundColor: 'var(--surface-container-lowest)', borderColor: 'var(--outline-variant)' }} onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: 'var(--outline-variant)', backgroundColor: 'var(--surface-container-low)' }}>
                            <h2 className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>Delete Return</h2>
                            <button onClick={() => setDeleteModal(false)} style={{ color: 'var(--outline)' }}><X className="w-4 h-4" /></button>
                        </div>
                        <div className="px-4 py-3">
                            <p className="text-xs" style={{ color: 'var(--on-surface)' }}>
                                Are you sure you want to delete return <strong>{tx.licensePlate}</strong>? This action cannot be undone.
                            </p>
                        </div>
                        <div className="flex justify-end gap-2 px-4 py-3 border-t" style={{ borderColor: 'var(--outline-variant)', backgroundColor: 'var(--surface-container-low)' }}>
                            <button onClick={() => setDeleteModal(false)} className="px-3 py-1.5 text-xs rounded border transition-colors hover:bg-primary-50/40" style={{ borderColor: 'var(--outline-variant)', backgroundColor: 'var(--surface-container-lowest)', color: 'var(--on-surface)' }}>Cancel</button>
                            <button onClick={handleDelete} disabled={isActionLoading} className="inline-flex items-center gap-1 px-3 py-1.5 text-xs rounded text-white disabled:opacity-50 transition-colors" style={{ backgroundColor: 'var(--error)' }}>
                                {isActionLoading ? <><Loader2 className="w-3.5 h-3.5 animate-spin" />Deleting...</> : 'Delete'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Finalize Return Modal ──────────────────── */}
            {finalizeModal && (
                <div className="fixed inset-0 backdrop-blur-md flex items-center justify-center z-50 p-4" style={{ backgroundColor: 'color-mix(in srgb, var(--inverse-surface) 55%, transparent)' }} onClick={() => setFinalizeModal(false)}>
                    <div className="rounded-[4px] max-w-xl w-full shadow-xl max-h-[90vh] flex flex-col border" style={{ backgroundColor: 'var(--surface-container-lowest)', borderColor: 'var(--outline-variant)' }} onClick={e => e.stopPropagation()}>

                        {/* Header */}
                        <div className="flex items-center justify-between p-5 border-b" style={{ borderColor: 'var(--outline-variant)', backgroundColor: 'var(--surface-container-low)' }}>
                            <h2 className="font-heading text-body font-semibold flex items-center gap-2" style={{ color: 'var(--foreground)' }}>
                                <Lock className="w-5 h-5" style={{ color: 'var(--error)' }} /> Finalize Return — {tx.licensePlate}
                            </h2>
                            <button onClick={() => setFinalizeModal(false)} style={{ color: 'var(--outline)' }}><X className="w-5 h-5" /></button>
                        </div>

                        <div className="p-5 flex-1 overflow-y-auto space-y-3">

                            {/* TBD blocker */}
                            {hasTbdItems && (
                                <div className="border rounded-[4px] p-3 flex items-start gap-2" style={{ backgroundColor: 'var(--error-container)', borderColor: 'var(--outline-variant)' }}>
                                    <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: 'var(--error)' }} />
                                    <div>
                                        <p className="text-sm font-medium" style={{ color: '#000000' }}>
                                            {tbdItems.length} item{tbdItems.length !== 1 ? 's' : ''} still have TBD status
                                        </p>
                                        <p className="text-xs mt-0.5" style={{ color: '#000000' }}>
                                            Resolve all TBD items before finalizing.
                                        </p>
                                    </div>
                                </div>
                            )}

                            {/* ── Step 1: Print Itemized Return ── */}
                            <div
                                className={`border rounded-[4px] p-4 transition-all ${hasTbdItems ? 'opacity-50 pointer-events-none' : ''}`}
                                style={{
                                    borderColor: 'var(--outline-variant)',
                                    backgroundColor: finalizeStepsDone.printManifest ? 'var(--secondary-container)' : 'var(--surface-container-lowest)',
                                }}
                            >
                                <div className="flex items-start gap-3">
                                    <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 font-bold text-sm text-white" style={{ backgroundColor: finalizeStepsDone.printManifest ? 'var(--secondary)' : 'var(--primary)' }}>
                                        {finalizeStepsDone.printManifest ? <CheckCircle className="w-4 h-4" /> : '1'}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>
                                            Print Itemized Return
                                        </p>
                                        <p className="text-xs mt-0.5" style={{ color: 'var(--on-surface-variant)' }}>Print the full list of all items included in this return.</p>
                                        <div className="flex items-center gap-3 mt-2">
                                            <button
                                                onClick={() => {
                                                    printHtml('manifest-html', 'manifest');
                                                    markStep({ printManifest: true });
                                                }}
                                                disabled={pdfLoading === 'manifest'}
                                                className="flex items-center gap-1.5 px-3 py-1.5 text-white text-xs font-medium rounded-[4px] transition-colors disabled:opacity-50"
                                                style={{ backgroundColor: 'var(--primary)' }}
                                            >
                                                {pdfLoading === 'manifest' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Printer className="w-3.5 h-3.5" />}
                                                Print
                                            </button>
                                            {finalizeStepsDone.printManifest && (
                                                <span className="text-xs font-medium flex items-center gap-1" style={{ color: 'var(--secondary)' }}>
                                                    <CheckCircle className="w-3.5 h-3.5" /> Done
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* ── Step 2: Enter FedEx Tracking ── */}
                            <div
                                className={`border rounded-[4px] p-4 transition-all ${hasTbdItems || !finalizeStepsDone.printManifest ? 'opacity-50 pointer-events-none' : ''}`}
                                style={{
                                    borderColor: 'var(--outline-variant)',
                                    backgroundColor: finalizeStepsDone.fedexEntered ? 'var(--secondary-container)' : 'var(--surface-container-lowest)',
                                }}
                            >
                                <div className="flex items-start gap-3">
                                    <div
                                        className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 font-bold text-sm"
                                        style={{
                                            backgroundColor: finalizeStepsDone.fedexEntered
                                                ? 'var(--secondary)'
                                                : finalizeStepsDone.printManifest
                                                    ? 'var(--primary)'
                                                    : 'var(--surface-container-low)',
                                            color: finalizeStepsDone.fedexEntered || finalizeStepsDone.printManifest ? 'white' : 'var(--on-surface-variant)',
                                        }}
                                    >
                                        {finalizeStepsDone.fedexEntered ? <CheckCircle className="w-4 h-4" /> : '2'}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>
                                            FedEx / USPS Shipping
                                        </p>
                                        <p className="text-xs mt-0.5" style={{ color: 'var(--on-surface-variant)' }}>Create a shipment via FedEx API or enter tracking info manually.</p>
                                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                                            <button
                                                onClick={() => { setFedexMode('api'); setFedexSubModal(true); }}
                                                className="flex items-center gap-1.5 px-3 py-1.5 text-white text-xs font-medium rounded-[4px] transition-colors"
                                                style={{ backgroundColor: 'var(--primary)' }}
                                            >
                                                <Truck className="w-3.5 h-3.5" />
                                                {finalizeStepsDone.fedexEntered ? 'Edit Shipment' : 'Create FedEx Shipment'}
                                            </button>
                                            <button
                                                onClick={() => { setFedexMode('manual'); setFedexSubModal(true); }}
                                                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-[4px] transition-colors border hover:bg-primary-50/40"
                                                style={{ backgroundColor: 'var(--surface-container-low)', color: 'var(--on-surface)', borderColor: 'var(--outline-variant)' }}
                                            >
                                                <Edit className="w-3.5 h-3.5" />
                                                Enter Manually
                                            </button>
                                            {finalizeStepsDone.fedexEntered && (
                                                <span className="text-xs font-medium flex items-center gap-1" style={{ color: 'var(--secondary)' }}>
                                                    <CheckCircle className="w-3.5 h-3.5" /> Done
                                                </span>
                                            )}
                                        </div>
                                        {finalizeStepsDone.fedexEntered && (finalizeForm.fedexTracking.trim() || tx.fedexTracking) && (
                                            <div className="mt-2 text-xs space-y-0.5" style={{ color: 'var(--on-surface-variant)' }}>
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
                            <div
                                className={`border rounded-[4px] p-4 transition-all ${hasTbdItems || !finalizeStepsDone.fedexEntered ? 'opacity-50 pointer-events-none' : ''}`}
                                style={{
                                    borderColor: 'var(--outline-variant)',
                                    backgroundColor: finalizeStepsDone.printJobSheets ? 'var(--secondary-container)' : 'var(--surface-container-lowest)',
                                }}
                            >
                                <div className="flex items-start gap-3">
                                    <div
                                        className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 font-bold text-sm"
                                        style={{
                                            backgroundColor: finalizeStepsDone.printJobSheets
                                                ? 'var(--secondary)'
                                                : finalizeStepsDone.fedexEntered
                                                    ? 'var(--primary)'
                                                    : 'var(--surface-container-low)',
                                            color: finalizeStepsDone.printJobSheets || finalizeStepsDone.fedexEntered ? 'white' : 'var(--on-surface-variant)',
                                        }}
                                    >
                                        {finalizeStepsDone.printJobSheets ? <CheckCircle className="w-4 h-4" /> : '3'}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>
                                            Print Job Sheets
                                        </p>
                                        <p className="text-xs mt-0.5" style={{ color: 'var(--on-surface-variant)' }}>Print job sheets for all outgoing boxes.</p>
                                        <div className="flex items-center gap-3 mt-2 flex-wrap">
                                            <button
                                                onClick={() => {
                                                    printJobSheet();
                                                    markStep({ printJobSheets: true });
                                                }}
                                                disabled={pdfLoading === 'job-sheet'}
                                                className="flex items-center gap-1.5 px-3 py-1.5 text-white text-xs font-medium rounded-[4px] transition-colors disabled:opacity-50"
                                                style={{ backgroundColor: 'var(--primary)' }}
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
                                                    className="flex items-center gap-1.5 px-3 py-1.5 text-white text-xs font-medium rounded-[4px] transition-colors disabled:opacity-50"
                                                    style={{ backgroundColor: 'var(--tertiary)' }}
                                                >
                                                    {pdfLoading === 'dea-form-222' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileText className="w-3.5 h-3.5" />}
                                                    Print DEA Form 222
                                                </button>
                                            )}
                                            
                                            {finalizeStepsDone.printJobSheets && (
                                                <span className="text-xs font-medium flex items-center gap-1" style={{ color: 'var(--secondary)' }}>
                                                    <CheckCircle className="w-3.5 h-3.5" /> Done
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* ── Step 4: Finalize Return ── */}
                            <div
                                className={`border-2 rounded-[4px] p-4 transition-all ${hasTbdItems || !finalizeStepsDone.printJobSheets ? 'opacity-50 pointer-events-none' : ''}`}
                                style={{
                                    borderStyle: canFinalize ? 'solid' : 'dashed',
                                    borderColor: 'var(--outline-variant)',
                                    backgroundColor: canFinalize ? 'var(--secondary-container)' : 'var(--surface-container-low)',
                                }}
                            >
                                <div className="flex items-start gap-3">
                                    <div
                                        className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 font-bold text-sm"
                                        style={{
                                            backgroundColor: canFinalize
                                                ? 'var(--secondary)'
                                                : finalizeStepsDone.printJobSheets
                                                    ? 'var(--primary)'
                                                    : 'var(--surface-container-low)',
                                            color: canFinalize || finalizeStepsDone.printJobSheets ? 'white' : 'var(--on-surface-variant)',
                                        }}
                                    >
                                        {canFinalize ? <CheckCircle className="w-4 h-4" /> : '4'}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-semibold" style={{ color: canFinalize ? 'var(--foreground)' : 'var(--on-surface-variant)' }}>
                                            Finalize Return
                                        </p>
                                        <p className="text-xs mt-0.5" style={{ color: canFinalize ? 'var(--on-surface)' : 'var(--on-surface-variant)' }}>
                                            Lock this return permanently. This cannot be undone.
                                        </p>
                                        {!allStepsDone && (
                                            <p className="text-xs mt-1" style={{ color: 'var(--on-surface-variant)' }}>Complete steps 1 – 3 above to enable finalization.</p>
                                        )}
                                        {allStepsDone && (
                                            <div className="mt-3">
                                                {hasTbdItems && (
                                                    <div className="border rounded-[4px] p-2 flex items-start gap-1.5 mb-3" style={{ backgroundColor: 'var(--error-container)', borderColor: 'var(--outline-variant)' }}>
                                                        <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: 'var(--error)' }} />
                                                        <p className="text-xs" style={{ color: '#000000' }}>
                                                            Resolve all TBD items before finalizing.
                                                        </p>
                                                    </div>
                                                )}
                                                <div className="border rounded-[4px] p-2 flex items-start gap-1.5 mb-3" style={{ backgroundColor: 'var(--tertiary-fixed)', borderColor: 'var(--outline-variant)' }}>
                                                    <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: 'var(--tertiary)' }} />
                                                    <p className="text-xs" style={{ color: 'var(--on-tertiary-container)' }}>
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

                        <div className="flex justify-end p-4 border-t" style={{ borderColor: 'var(--outline-variant)', backgroundColor: 'var(--surface-container-low)' }}>
                            <Button variant="outline" onClick={() => setFinalizeModal(false)}>Cancel</Button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Wine Cellar Modal ────────────────────────── */}
            {wcModal && (
                <div className="fixed inset-0 backdrop-blur-md flex items-center justify-center z-50 p-4" style={{ backgroundColor: 'color-mix(in srgb, var(--inverse-surface) 55%, transparent)' }} onClick={() => setWcModal(false)}>
                    <div className="rounded-[4px] max-w-2xl w-full shadow-xl max-h-[80vh] flex flex-col border" style={{ backgroundColor: 'var(--surface-container-lowest)', borderColor: 'var(--outline-variant)' }} onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between p-5 border-b" style={{ borderColor: 'var(--outline-variant)', backgroundColor: 'var(--surface-container-low)' }}>
                            <h2 className="font-heading text-body font-semibold flex items-center gap-2" style={{ color: 'var(--foreground)' }}>
                                <Archive className="w-5 h-5" style={{ color: 'var(--tertiary)' }} /> Add Wine Cellar Items
                            </h2>
                            <button onClick={() => setWcModal(false)} style={{ color: 'var(--outline)' }}><X className="w-5 h-5" /></button>
                        </div>
                        <div className="p-5 flex-1 overflow-y-auto">
                            {wcLoading ? (
                                <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary-600" /></div>
                            ) : wcItems.length === 0 ? (
                                <div className="text-center py-12">
                                    <Archive className="w-12 h-12 mx-auto mb-3" style={{ color: 'var(--outline-variant)' }} />
                                    <p className="text-sm font-medium" style={{ color: 'var(--on-surface)' }}>No wine cellar items ready to return</p>
                                    <p className="text-xs mt-1" style={{ color: 'var(--on-surface-variant)' }}>Items with &quot;Ready to Return&quot; status for this pharmacy will appear here.</p>
                                </div>
                            ) : (
                                <>
                                    <p className="text-xs mb-3" style={{ color: 'var(--on-surface-variant)' }}>
                                        Select items to add to this return. {wcSelected.size > 0 && <strong>{wcSelected.size} selected</strong>}
                                    </p>
                                    <div className="overflow-x-auto">
<table className="w-full table-auto text-xs border" style={{ borderColor: 'var(--outline)' }}>
                                            <thead className="bg-[var(--surface-container-low)] border-b" style={{ borderColor: 'var(--outline)', borderBottomWidth: '1.5px' }}>
                                                <tr className="bg-[var(--surface-container-low)]">
                                                    <th className="px-3 py-3 w-8">
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
                                                            className="rounded focus:ring-primary-500"
                                                            style={{ color: 'var(--primary)' }}
                                                        />
                                                    </th>
                                                    <th className="text-left px-3 py-3 text-xs font-semibold uppercase tracking-wider whitespace-nowrap text-[var(--on-surface-variant)] whitespace-nowrap">NDC</th>
                                                    <th className="text-left px-3 py-3 text-xs font-semibold uppercase tracking-wider whitespace-nowrap text-[var(--on-surface-variant)] whitespace-nowrap">Product</th>
                                                    <th className="text-center px-3 py-3 text-xs font-semibold uppercase tracking-wider whitespace-nowrap text-[var(--on-surface-variant)] whitespace-nowrap">QTY</th>
                                                    <th className="text-right px-3 py-3 text-xs font-semibold uppercase tracking-wider whitespace-nowrap text-[var(--on-surface-variant)] whitespace-nowrap">Price</th>
                                                    <th className="text-left px-3 py-3 text-xs font-semibold uppercase tracking-wider whitespace-nowrap text-[var(--on-surface-variant)] whitespace-nowrap">Shelved</th>
                                                    <th className="text-left px-3 py-3 text-xs font-semibold uppercase tracking-wider whitespace-nowrap text-[var(--on-surface-variant)] whitespace-nowrap">Location</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {wcItems.map(item => (
                                                    <tr
                                                        key={item.id}
                                                        className="cursor-pointer transition-colors border-b"
                                                        style={{
                                                            borderColor: 'var(--outline-variant)',
                                                            backgroundColor: wcSelected.has(item.id) ? 'var(--tertiary-fixed)' : 'transparent',
                                                        }}
                                                        onClick={() => toggleWcSelect(item.id)}
                                                    >
                                                        <td className="px-3 py-3 text-sm">
                                                            <input
                                                                type="checkbox"
                                                                checked={wcSelected.has(item.id)}
                                                                onChange={() => toggleWcSelect(item.id)}
                                                                className="rounded focus:ring-primary-500"
                                                                style={{ color: 'var(--primary)' }}
                                                            />
                                                        </td>
                                                        <td className="px-3 py-3 text-sm font-mono" style={{ color: 'var(--foreground)' }}>{item.ndc || '—'}</td>
                                                        <td className="px-3 py-3 text-sm max-w-[140px] truncate" style={{ color: 'var(--foreground)' }} title={item.productName || ''}>
                                                            <div>
                                                                <p className="truncate">{item.productName || '—'}</p>
                                                                {item.manufacturer && <p className="text-[10px] truncate" style={{ color: 'var(--on-surface-variant)' }}>{item.manufacturer}</p>}
                                                            </div>
                                                        </td>
                                                        <td className="px-3 py-3 text-sm text-center" style={{ color: 'var(--foreground)' }}>{item.quantity}</td>
                                                        <td className="px-3 py-3 text-sm text-right" style={{ color: 'var(--foreground)' }}>
                                                            {item.standardPrice != null ? formatCurrency(item.standardPrice) : '—'}
                                                        </td>
                                                        <td className="px-3 py-3 text-sm" style={{ color: 'var(--on-surface-variant)' }}>{formatDate(item.dateShelved)}</td>
                                                        <td className="px-3 py-3 text-sm" style={{ color: 'var(--on-surface-variant)' }}>{item.physicalLocation || '—'}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </>
                            )}
                        </div>
                        <div className="flex justify-end gap-2 p-5 border-t" style={{ borderColor: 'var(--outline-variant)', backgroundColor: 'var(--surface-container-low)' }}>
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
                <div className="fixed inset-0 backdrop-blur-md flex items-center justify-center z-[60] p-4" style={{ backgroundColor: 'color-mix(in srgb, var(--inverse-surface) 55%, transparent)' }} onClick={() => { if (!fedexApiLoading && !pickupLoading) setFedexSubModal(false); }}>
                    <div className="rounded-[4px] max-w-2xl w-full shadow-xl max-h-[90vh] flex flex-col border" style={{ backgroundColor: 'var(--surface-container-lowest)', borderColor: 'var(--outline-variant)' }} onClick={e => e.stopPropagation()}>

                        {/* Header */}
                        <div className="p-4 rounded-t-lg" style={{ backgroundColor: fedexMode === 'api' ? 'var(--primary)' : 'var(--tertiary-fixed)' }}>
                            <h2 className="text-center text-lg font-bold" style={{ color: fedexMode === 'api' ? 'white' : 'var(--on-tertiary-container)' }}>
                                {fedexMode === 'api' ? 'FedEx API Shipment' : 'FedEX or USPS Info'} — <span className="underline font-mono">{tx.licensePlate}</span>
                            </h2>
                        </div>

                        <div className="p-5 flex-1 overflow-y-auto space-y-4">

                            {/* ── API Mode ── */}
                            {fedexMode === 'api' && (
                                <>
                                    {!fedexApiResult ? (
                                        <>
                                                    <p className="text-sm text-center" style={{ color: 'var(--on-surface-variant)' }}>
                                                Create a FedEx Ground shipment via the FedEx API. Tracking numbers and shipping labels will be generated automatically.
                                            </p>

                                            <div className="flex items-center justify-center gap-4">
                                                <div>
                                                    <label className="text-sm font-medium" style={{ color: 'var(--on-surface)' }}>Number of Boxes:</label>
                                                    <input
                                                        type="number"
                                                        min="1"
                                                        max="99"
                                                        value={fedexForm.boxCount}
                                                        onChange={e => setFedexForm(prev => ({ ...prev, boxCount: e.target.value }))}
                                                        className="ml-2 w-20 px-3 py-1.5 text-sm border rounded-[4px] focus:outline-none focus:ring-2 focus:ring-primary-500 text-center"
                                                        style={{ borderColor: 'var(--outline-variant)', backgroundColor: 'var(--surface-container-low)' }}
                                                        disabled={fedexApiLoading}
                                                    />
                                                </div>
                                            </div>

                                            <div className="border rounded-[4px] p-3 text-xs text-center space-y-1" style={{ backgroundColor: 'var(--primary-fixed)', borderColor: 'var(--outline-variant)', color: 'var(--on-primary-container)' }}>
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
                                                    className="flex items-center gap-2 px-6 py-2.5 text-white text-sm font-medium rounded-[4px] transition-colors disabled:opacity-50"
                                                    style={{ backgroundColor: 'var(--primary)' }}
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
                                            <div className="border rounded-[4px] p-4 space-y-3" style={{ backgroundColor: 'var(--secondary-container)', borderColor: 'var(--outline-variant)' }}>
                                                <div className="flex items-center gap-2">
                                                    <CheckCircle className="w-5 h-5" style={{ color: 'var(--secondary)' }} />
                                                    <p className="text-sm font-semibold" style={{ color: 'var(--on-secondary-container)' }}>Shipment Created Successfully</p>
                                                </div>
                                                <div className="grid grid-cols-2 gap-2 text-xs">
                                                    <div>
                                                        <span style={{ color: 'var(--on-surface-variant)' }}>Master Tracking:</span>
                                                        <span className="ml-1 font-mono font-medium" style={{ color: 'var(--foreground)' }}>{fedexApiResult.masterTrackingNumber}</span>
                                                    </div>
                                                    <div>
                                                        <span style={{ color: 'var(--on-surface-variant)' }}>Packages:</span>
                                                        <span className="ml-1 font-medium" style={{ color: 'var(--foreground)' }}>{fedexApiResult.packages.length}</span>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Package Tracking Numbers */}
                                            <div className="space-y-2">
                                                <div className="flex items-center justify-between">
                                                    <p className="text-sm font-medium" style={{ color: 'var(--on-surface)' }}>Package Tracking Numbers:</p>
                                                    <div className="flex items-center gap-1">
                                                        <button
                                                            onClick={printShippingLabels}
                                                            disabled={pdfLoading === 'shipping-labels'}
                                                            className="flex items-center gap-1 px-2 py-1 text-xs rounded border transition-colors disabled:opacity-50 hover:bg-primary-50/40"
                                                            style={{ backgroundColor: 'var(--surface-container-low)', color: 'var(--secondary)', borderColor: 'var(--outline-variant)' }}
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
                                                                <span style={{ color: 'var(--on-surface-variant)' }}>Package {i + 1}:</span>
                                                                <span className="font-mono" style={{ color: 'var(--foreground)' }}>{pkg.trackingNumber}</span>
                                                            </div>
                                                            <div className="flex items-center gap-1">
                                                                <button
                                                                    onClick={() => printSingleLabel(i + 1)}
                                                                    disabled={pdfLoading === `shipping-label-${i + 1}`}
                                                                    className="flex items-center gap-1 px-1.5 py-0.5 rounded border transition-colors disabled:opacity-50 hover:bg-primary-50/40"
                                                                    style={{ backgroundColor: 'var(--surface-container-low)', color: 'var(--secondary)', borderColor: 'var(--outline-variant)' }}
                                                                    title={`Print shipping label for ${pkg.trackingNumber}`}
                                                                >
                                                                    {pdfLoading === `shipping-label-${i + 1}` ? <Loader2 className="w-3 h-3 animate-spin" /> : <Printer className="w-3 h-3" />}
                                                                </button>

                                                                {pkg.hasLabel && (
                                                                    <a
                                                                        href={`${process.env.NEXT_PUBLIC_API_URL}/return-transactions/${tx.id}/labels/${i + 1}/download`}
                                                                        target="_blank"
                                                                        rel="noreferrer"
                                                                        className="hover:underline"
                                                                        style={{ color: 'var(--primary)' }}
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
                                                        className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium rounded-[4px] border transition-colors hover:bg-primary-50/40"
                                                        style={{ backgroundColor: 'var(--surface-container-low)', color: 'var(--on-surface)', borderColor: 'var(--outline-variant)' }}
                                                    >
                                                        <Printer className="w-3.5 h-3.5" />
                                                        Download Labels
                                                    </a>
                                                </div>
                                            )}

                                            {/* Schedule Pickup */}
                                            <div className="border-t pt-4 space-y-3" style={{ borderColor: 'var(--outline-variant)' }}>
                                                <p className="text-sm font-medium" style={{ color: 'var(--on-surface)' }}>Schedule FedEx Pickup (Optional)</p>
                                                <div className="border rounded-[4px] p-3 mb-3" style={{ backgroundColor: 'var(--tertiary-fixed)', borderColor: 'var(--outline-variant)' }}>
                                                    <p className="text-xs" style={{ color: 'var(--on-tertiary-container)' }}>
                                                        <strong>Note:</strong> Pickup scheduling may not work in sandbox/test mode. 
                                                        You can also call FedEx directly at <strong>1-800-463-3339</strong> and say &quot;Ground Return Pickup&quot;.
                                                    </p>
                                                </div>
                                                <div className="flex items-center gap-4 flex-wrap">
                                                    <div>
                                                        <label className="text-xs" style={{ color: 'var(--on-surface-variant)' }}>Pickup Date</label>
                                                        <input
                                                            type="date"
                                                            value={pickupForm.pickupDate}
                                                            onChange={e => setPickupForm(prev => ({ ...prev, pickupDate: e.target.value }))}
                                                            className="block w-36 px-2 py-1.5 text-sm border rounded-[4px] focus:outline-none focus:ring-2 focus:ring-primary-500"
                                                            style={{ borderColor: 'var(--outline-variant)', backgroundColor: 'var(--surface-container-low)' }}
                                                            disabled={pickupLoading}
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="text-xs" style={{ color: 'var(--on-surface-variant)' }}>Ready Time</label>
                                                        <input
                                                            type="time"
                                                            value={pickupForm.readyTime}
                                                            onChange={e => setPickupForm(prev => ({ ...prev, readyTime: e.target.value }))}
                                                            className="block w-28 px-2 py-1.5 text-sm border rounded-[4px] focus:outline-none focus:ring-2 focus:ring-primary-500"
                                                            style={{ borderColor: 'var(--outline-variant)', backgroundColor: 'var(--surface-container-low)' }}
                                                            disabled={pickupLoading}
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="text-xs" style={{ color: 'var(--on-surface-variant)' }}>Close Time</label>
                                                        <input
                                                            type="time"
                                                            value={pickupForm.closeTime}
                                                            onChange={e => setPickupForm(prev => ({ ...prev, closeTime: e.target.value }))}
                                                            className="block w-28 px-2 py-1.5 text-sm border rounded-[4px] focus:outline-none focus:ring-2 focus:ring-primary-500"
                                                            style={{ borderColor: 'var(--outline-variant)', backgroundColor: 'var(--surface-container-low)' }}
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
                                                            className="flex items-center gap-1.5 px-3 py-1.5 text-white text-xs font-medium rounded-[4px] transition-colors disabled:opacity-50"
                                                            style={{ backgroundColor: 'var(--secondary)' }}
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
                                        <label className="text-sm font-medium" style={{ color: 'var(--on-surface)' }}>Number of Boxes on this Return:</label>
                                        <input
                                            type="number"
                                            min="1"
                                            max="99"
                                            value={fedexForm.boxCount}
                                            onChange={e => setFedexForm(prev => ({ ...prev, boxCount: e.target.value }))}
                                            className="ml-2 w-20 px-3 py-1.5 text-sm border rounded-[4px] focus:outline-none focus:ring-2 focus:ring-primary-500 text-center"
                                            style={{ borderColor: 'var(--outline-variant)', backgroundColor: 'var(--surface-container-low)' }}
                                        />
                                    </div>

                                    {/* Instructions */}
                                    <div className="text-center text-xs space-y-1" style={{ color: 'var(--on-surface-variant)' }}>
                                        <p>For FedEX Call <strong>1-(800) 463-3339</strong> and say &quot;Ground Return Pickup&quot;</p>
                                        <p>Once you have the Fed EX PRP Number Enter Below, Then Scan Tracking BarCodes Into &quot;Package Fields&quot;</p>
                                        <p>If This Is A USPS Shipment Enter &quot;USPS&quot; In the PRP Field, Then Scan Tracking BarCodes Into &quot;Package Fields&quot;</p>
                                    </div>

                                    {/* PRP Number */}
                                    <div className="text-center">
                                        <label className="text-sm font-medium" style={{ color: 'var(--on-surface)' }}>PRP Number:</label>
                                        <input
                                            type="text"
                                            value={fedexForm.prpNumber}
                                            onChange={e => setFedexForm(prev => ({ ...prev, prpNumber: e.target.value }))}
                                            placeholder="Enter PRP Number or USPS"
                                            className="ml-2 w-64 px-3 py-1.5 text-sm border rounded-[4px] focus:outline-none focus:ring-2 focus:ring-primary-500 font-mono"
                                            style={{ borderColor: 'var(--outline-variant)', backgroundColor: 'var(--surface-container-low)' }}
                                        />
                                    </div>

                                    <div className="border-t-2" style={{ borderColor: 'var(--outline-variant)' }} />

                                    {/* Package Tracking Fields */}
                                    <div className="grid grid-cols-2 gap-x-6 gap-y-2">
                                        {fedexForm.packages.map((val, i) => (
                                            <div key={i} className="flex items-center gap-2">
                                                <label className="text-sm w-24 text-right flex-shrink-0" style={{ color: 'var(--on-surface)' }}>Package {i + 1}:</label>
                                                <input
                                                    type="text"
                                                    value={val}
                                                    onChange={e => {
                                                        const updated = [...fedexForm.packages];
                                                        updated[i] = e.target.value;
                                                        setFedexForm(prev => ({ ...prev, packages: updated }));
                                                    }}
                                                    className="flex-1 px-2 py-1.5 text-sm border rounded-[4px] focus:outline-none focus:ring-2 focus:ring-primary-500 font-mono"
                                                    style={{ borderColor: 'var(--outline-variant)', backgroundColor: 'var(--surface-container-low)' }}
                                                />
                                            </div>
                                        ))}
                                    </div>
                                </>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="flex justify-between items-center p-4 border-t" style={{ borderColor: 'var(--outline-variant)', backgroundColor: 'var(--surface-container-low)' }}>
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
